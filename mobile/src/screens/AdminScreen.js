import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../api';
import { timeAgo } from '../components/PetCard';
import { useAuth } from '../context/auth';
import { useLanguage } from '../context/language';
import { createThemedStyles, useTheme, useThemedStyles } from '../context/theme';
import { radius, spacing, statusStyle } from '../theme';

/*
 * Trang quản trị — tương đương views/Admin.vue bên web.
 *
 * Hai việc: xem số liệu tổng quan, và xem/xoá bất kỳ tin nào.
 *
 * QUAN TRỌNG: việc giấu lối vào ở màn Cài đặt CHỈ để cho gọn mắt, không phải
 * lớp bảo vệ. Chặn thật nằm ở back-end — requireAdmin trong api/middleware/
 * auth.js đọc role trong token. Người thường có sửa app để lộ nút ra cũng chỉ
 * nhận 403. Quy tắc chung: đừng bao giờ coi giao diện là nơi phân quyền.
 */

const PAGE_SIZE = 20;

// Gõ tới đâu gọi tới đó thì mỗi chữ cái là một lần gọi máy chủ. Chờ 400ms sau
// khi người dùng ngừng gõ rồi mới gọi — bằng web.
const SEARCH_DELAY = 400;

const TYPE_FILTERS = [
  { value: '', labelKey: 'admin.allTypes' },
  { value: 'lost', labelKey: 'admin.lost' },
  { value: 'found', labelKey: 'admin.found' },
];

const STATUS_FILTERS = [
  { value: '', labelKey: 'admin.allStatus' },
  { value: 'false', labelKey: 'admin.open' },
  { value: 'true', labelKey: 'admin.resolved' },
];

export default function AdminScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { t, lang } = useLanguage();
  const { isAdmin } = useAuth();
  const { colors } = useTheme();
  const styles = useThemedStyles(themedStyles);

  const [stats, setStats] = useState(null);
  const [pets, setPets] = useState([]);
  const [total, setTotal] = useState(0);

  const [type, setType] = useState('');
  const [resolved, setResolved] = useState('');
  // Chữ đang gõ, và chữ thật sự dùng để tìm. Tách đôi để ô nhập phản hồi ngay
  // mà máy chủ vẫn chỉ bị gọi sau khi người dùng ngừng gõ.
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasError, setHasError] = useState(false);
  // Tin nào đang xoá — để chỉ khoá đúng nút đó, không khoá cả danh sách
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => setQuery(search), SEARCH_DELAY);
    return () => clearTimeout(timer);
  }, [search]);

  const params = useCallback(
    (skip) => {
      const p = { limit: PAGE_SIZE, skip };
      if (type) p.type = type;
      if (resolved) p.resolved = resolved;
      if (query.trim()) p.q = query.trim();
      return p;
    },
    [type, resolved, query],
  );

  const load = useCallback(async () => {
    try {
      /*
       * Gọi hai thứ SONG SONG. Gọi lần lượt thì trang phải chờ tổng thời gian
       * của cả hai, mà chúng không phụ thuộc nhau.
       */
      const [statsRes, petsRes] = await Promise.all([api.adminStats(), api.adminPets(params(0))]);
      setStats(statsRes.data);
      setPets(petsRes.data.pets);
      setTotal(petsRes.data.total);
      setHasError(false);
    } catch {
      setStats(null);
      setPets([]);
      setTotal(0);
      setHasError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [params]);

  useEffect(() => {
    load();
  }, [load]);

  const loadMore = async () => {
    // Chặn gọi chồng: FlatList có thể bắn sự kiện này nhiều lần liên tiếp
    if (loadingMore || loading || pets.length >= total) return;

    setLoadingMore(true);
    try {
      const { data } = await api.adminPets(params(pets.length));
      setPets((current) => {
        // Giữa lúc đang xem mà có người đăng tin mới thì trang sau trả về một
        // tin mình đã có. Hai dòng cùng _id trong FlatList là cảnh báo đỏ.
        const seen = new Set(current.map((item) => item._id));
        return [...current, ...data.pets.filter((item) => !seen.has(item._id))];
      });
      setTotal(data.total);
    } catch {
      // Tải thêm hỏng thì im lặng, danh sách cũ vẫn còn nguyên. Cuộn lại là
      // nó thử tiếp, báo lỗi to ở đây chỉ làm phiền.
    } finally {
      setLoadingMore(false);
    }
  };

  const remove = (pet) => {
    Alert.alert(t('admin.deleteTitle'), t('admin.confirmDelete'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('admin.delete'),
        style: 'destructive',
        onPress: async () => {
          setBusyId(pet._id);
          try {
            await api.adminDeletePet(pet._id);
            // Bỏ khỏi danh sách tại chỗ thay vì tải lại cả trang: tải lại sẽ
            // nhảy về đầu, mất chỗ người dùng đang cuộn tới.
            setPets((current) => current.filter((item) => item._id !== pet._id));
            setTotal((current) => Math.max(0, current - 1));
            // Số liệu thì phải xin lại, vì xoá một tin làm đổi gần hết các ô.
            api.adminStats().then((res) => setStats(res.data)).catch(() => {});
          } catch {
            Alert.alert(t('admin.deleteTitle'), t('admin.deleteFailed'));
          } finally {
            setBusyId(null);
          }
        },
      },
    ]);
  };

  /*
   * Không phải quản trị viên thì nói thẳng, đừng để màn hình quay vòng xoay
   * mãi rồi báo "lỗi tải dữ liệu" — người dùng sẽ tưởng app hỏng.
   */
  if (!isAdmin) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>{t('admin.denied')}</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.teal} />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      data={pets}
      keyExtractor={(item) => item._id}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            load();
          }}
          tintColor={colors.teal}
        />
      }
      onEndReached={loadMore}
      onEndReachedThreshold={0.4}
      ListHeaderComponent={
        <Header
          stats={stats}
          total={total}
          hasError={hasError}
          type={type}
          setType={setType}
          resolved={resolved}
          setResolved={setResolved}
          search={search}
          setSearch={setSearch}
        />
      }
      ListEmptyComponent={
        <Text style={styles.emptyText}>{t(hasError ? 'admin.loadFailed' : 'admin.noPosts')}</Text>
      }
      ListFooterComponent={
        loadingMore ? <ActivityIndicator style={styles.footer} color={colors.teal} /> : null
      }
      renderItem={({ item }) => (
        <Row
          pet={item}
          busy={busyId === item._id}
          onOpen={() => navigation.navigate('Detail', { id: item._id })}
          onDelete={() => remove(item)}
          lang={lang}
        />
      )}
    />
  );
}

function Header({ stats, total, hasError, type, setType, resolved, setResolved, search, setSearch }) {
  const { t } = useLanguage();
  const { colors } = useTheme();
  const styles = useThemedStyles(themedStyles);

  return (
    <View>
      <Text style={styles.subtitle}>{t('admin.subtitle')}</Text>

      {stats && (
        <>
          <View style={styles.tiles}>
            <Tile label={t('admin.totalPosts')} value={stats.total} />
            <Tile label={t('admin.lost')} value={stats.lost} tint={colors.lost} />
            <Tile label={t('admin.found')} value={stats.found} tint={colors.found} />
            <Tile label={t('admin.open')} value={stats.open} />
            <Tile label={t('admin.resolved')} value={stats.resolved} tint={colors.resolved} />
            <Tile label={t('admin.users')} value={stats.users} />
          </View>

          {/* Thanh tỉ lệ đoàn tụ — con số quan trọng nhất của cả app, nên cho
              nó một dòng riêng thay vì nhét chung vào lưới ô số liệu. */}
          <View style={styles.rateBox}>
            <View style={styles.rateTop}>
              <Text style={styles.rateNumber}>{stats.resolvedRate}%</Text>
              <Text style={styles.rateLabel}>{t('admin.resolvedRate')}</Text>
            </View>
            <View style={styles.rateTrack}>
              <View style={[styles.rateFill, { width: `${stats.resolvedRate}%` }]} />
            </View>
          </View>

          <Rank title={t('admin.topAreas')} rows={stats.topAreas} />
          <Rank title={t('admin.topBreeds')} rows={stats.topBreeds} />
        </>
      )}

      <TextInput
        style={styles.search}
        value={search}
        onChangeText={setSearch}
        placeholder={t('admin.search')}
        placeholderTextColor={colors.textMuted}
        autoCorrect={false}
        // Tên giống và khu vực là danh từ riêng, iOS tự viết hoa chữ đầu sẽ
        // làm hỏng chuỗi tìm kiếm ngay từ ký tự đầu tiên.
        autoCapitalize="none"
        returnKeyType="search"
        clearButtonMode="while-editing"
      />

      <ChipRow items={TYPE_FILTERS} value={type} onChange={setType} />
      <ChipRow items={STATUS_FILTERS} value={resolved} onChange={setResolved} />

      {!hasError && <Text style={styles.count}>{t('admin.posts', { n: total })}</Text>}
    </View>
  );
}

function Tile({ label, value, tint }) {
  const styles = useThemedStyles(themedStyles);
  return (
    <View style={styles.tile}>
      <Text style={[styles.tileValue, !!tint && { color: tint }]}>{value}</Text>
      <Text style={styles.tileLabel}>{label}</Text>
    </View>
  );
}

function Rank({ title, rows }) {
  const { t } = useLanguage();
  const styles = useThemedStyles(themedStyles);

  return (
    <View style={styles.rank}>
      <Text style={styles.rankTitle}>{title}</Text>
      {rows?.length ? (
        rows.map((row) => (
          // Tên khu vực có thể trùng nhau sau khi cắt bớt, nên ghép thêm số
          // lượng vào key cho chắc.
          <View key={`${row.label}-${row.count}`} style={styles.rankRow}>
            <Text style={styles.rankLabel} numberOfLines={1}>
              {row.label || t('admin.noData')}
            </Text>
            <Text style={styles.rankCount}>{row.count}</Text>
          </View>
        ))
      ) : (
        <Text style={styles.rankEmpty}>{t('admin.noData')}</Text>
      )}
    </View>
  );
}

function ChipRow({ items, value, onChange }) {
  const { t } = useLanguage();
  const styles = useThemedStyles(themedStyles);

  return (
    <View style={styles.chipRow}>
      {items.map((item) => {
        const active = value === item.value;
        return (
          <TouchableOpacity
            key={item.value || 'all'}
            style={[styles.chip, active && styles.chipActive]}
            onPress={() => onChange(item.value)}
            activeOpacity={0.8}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>
              {t(item.labelKey)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function Row({ pet, busy, onOpen, onDelete, lang }) {
  const { t } = useLanguage();
  const { colors } = useTheme();
  const styles = useThemedStyles(themedStyles);
  const status = statusStyle(pet, colors);

  return (
    <TouchableOpacity style={styles.row} onPress={onOpen} activeOpacity={0.85}>
      {/* API trả image là CHUỖI RỖNG khi không có ảnh, không phải null */}
      {pet.image ? (
        <Image source={{ uri: pet.image }} style={styles.thumb} />
      ) : (
        <View style={[styles.thumb, styles.thumbEmpty]} />
      )}

      <View style={styles.rowBody}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {pet.name || pet.breed}
        </Text>
        <Text style={styles.rowMeta} numberOfLines={1}>
          {pet.area} · {pet.owner?.name || t('admin.guest')}
        </Text>
        <View style={styles.rowTags}>
          <Text style={[styles.badge, { color: status.color, borderColor: status.color }]}>
            {t(status.labelKey)}
          </Text>
          <Text style={styles.rowDate}>{timeAgo(pet.date, t, lang)}</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.deleteButton}
        onPress={onDelete}
        disabled={busy}
        hitSlop={8}
      >
        {busy ? (
          <ActivityIndicator size="small" color={colors.danger} />
        ) : (
          <Text style={styles.deleteText}>{t('admin.delete')}</Text>
        )}
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const themedStyles = createThemedStyles((colors, shadow) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: spacing.lg },
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.xl,
      backgroundColor: colors.background,
    },
    footer: { marginVertical: spacing.lg },
    emptyText: {
      color: colors.textSoft,
      fontSize: 14,
      textAlign: 'center',
      marginTop: spacing.xl,
      lineHeight: 20,
    },

    subtitle: { color: colors.textSoft, fontSize: 13, marginBottom: spacing.lg },

    // Lưới ô số liệu: flexWrap + basis 30% để vừa 3 ô một hàng trên mọi máy,
    // không cần đo bề ngang màn hình.
    tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    tile: {
      flexGrow: 1,
      flexBasis: '30%',
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.borderLight,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.sm,
      alignItems: 'center',
    },
    tileValue: { fontSize: 20, fontWeight: '800', color: colors.text },
    tileLabel: { fontSize: 10, color: colors.textMuted, marginTop: 2, textAlign: 'center' },

    rateBox: {
      marginTop: spacing.md,
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.borderLight,
      padding: spacing.md,
    },
    rateTop: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
    rateNumber: { fontSize: 24, fontWeight: '800', color: colors.resolved },
    rateLabel: { fontSize: 12, color: colors.textSoft, flexShrink: 1 },
    rateTrack: {
      height: 6,
      borderRadius: radius.full,
      backgroundColor: colors.borderLight,
      marginTop: spacing.sm,
      overflow: 'hidden',
    },
    rateFill: { height: '100%', borderRadius: radius.full, backgroundColor: colors.resolved },

    rank: {
      marginTop: spacing.md,
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.borderLight,
      padding: spacing.md,
    },
    rankTitle: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.textMuted,
      letterSpacing: 0.5,
      marginBottom: spacing.sm,
    },
    rankRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 3 },
    rankLabel: { flex: 1, fontSize: 13, color: colors.textSoft },
    rankCount: { fontSize: 13, fontWeight: '700', color: colors.text },
    rankEmpty: { fontSize: 12, color: colors.textMuted },

    search: {
      marginTop: spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: 10,
      fontSize: 14,
      color: colors.text,
      backgroundColor: colors.surface,
    },

    chipRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
    chip: {
      paddingHorizontal: spacing.md,
      paddingVertical: 7,
      borderRadius: radius.full,
      borderWidth: 1.5,
      borderColor: colors.border,
    },
    chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    chipText: { fontSize: 12, fontWeight: '700', color: colors.textSoft },
    chipTextActive: { color: colors.onPrimary },

    count: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: spacing.lg,
      marginBottom: spacing.sm,
    },

    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      padding: spacing.sm,
      marginBottom: spacing.sm,
      ...shadow.card,
    },
    thumb: { width: 48, height: 48, borderRadius: radius.sm, backgroundColor: colors.surfaceTint },
    thumbEmpty: { borderWidth: 1, borderColor: colors.borderLight },
    rowBody: { flex: 1, gap: 2 },
    rowTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
    rowMeta: { fontSize: 11, color: colors.textMuted },
    rowTags: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 2 },
    badge: {
      fontSize: 9,
      fontWeight: '800',
      letterSpacing: 0.4,
      borderWidth: 1,
      borderRadius: radius.full,
      paddingHorizontal: 6,
      paddingVertical: 1,
      overflow: 'hidden',
    },
    rowDate: { fontSize: 10, color: colors.textMuted },

    deleteButton: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      minWidth: 56,
      alignItems: 'center',
    },
    deleteText: { fontSize: 12, fontWeight: '700', color: colors.danger },
  }),
);
