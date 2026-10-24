import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../api';
import PetFilters, { EMPTY_FILTERS, countActiveFilters } from '../components/PetFilters';
import { useAuth } from '../context/auth';
import { useLanguage } from '../context/language';
import { radius, spacing, statusStyle } from '../theme';
import { createThemedStyles, useTheme, useThemedStyles } from '../context/theme';

/*
 * Màn hình danh sách tin — chữ R (Read) trong CRUD.
 *
 * Khác biệt lớn nhất so với web:
 *   <div>  ->  <View>        mọi khối phải là View
 *   <p>    ->  <Text>        MỌI chữ bắt buộc nằm trong <Text>, viết chữ trần
 *                            ra ngoài là app crash ngay
 *   <img>  ->  <Image>       bắt buộc có width/height, không tự co theo ảnh
 *   danh sách -> <FlatList>  thay cho .map(), chỉ vẽ phần đang nhìn thấy nên
 *                            cuộn nhiều tin vẫn mượt
 */

/*
 * Mỗi lần tải 10 tin.
 *
 * Trước đây lấy thẳng 50 tin một lần — vừa chậm lúc mở app, vừa hỏng khi dữ
 * liệu vượt quá 50 vì không có cách nào xem tiếp. Back-end cũng chặn trên 50.
 */
/*
 * Hai bản logo tròn. Bản tối có vầng sáng xanh ngọc, hợp với màn chào.
 * require() phải là đường dẫn viết cứng — không ghép chuỗi được — nên khai
 * báo sẵn cả hai ở đây rồi chọn lúc vẽ.
 */
const LOGO_MARK = require('../../assets/logo-mark.png');
const LOGO_MARK_DARK = require('../../assets/logo-mark-dark.png');

const PAGE_SIZE = 10;

/*
 * Dựng tham số gửi lên máy chủ. Để ngoài component vì nó là hàm thuần: cùng
 * đầu vào luôn ra cùng kết quả, không đụng tới state nào.
 *
 * skip = bỏ qua bao nhiêu tin đầu. Trang 1 là 0, trang 2 là 10...
 */
function buildParams(filterType, activeFilters, skip) {
  // Chỉ gửi những tham số thật sự có giá trị. Gửi kèm chuỗi rỗng thì
  // back-end vẫn dựng biểu thức tìm kiếm rỗng và lọc sai.
  const params = { limit: PAGE_SIZE, skip, sort: activeFilters.sort };
  if (filterType) params.type = filterType;
  if (activeFilters.species) params.species = activeFilters.species;
  if (activeFilters.area.trim()) params.area = activeFilters.area.trim();
  if (activeFilters.days) params.days = activeFilters.days;
  return params;
}

/*
 * colorKey chứ không phải màu sẵn: bảng này nằm ở cấp file, chạy lúc nạp —
 * lúc đó chưa ai biết người dùng đang để chế độ sáng hay tối. Lưu TÊN màu,
 * lúc vẽ mới tra ra màu thật bằng colors[item.colorKey].
 */
const FILTERS = [
  { value: '', labelKey: 'filter.all', colorKey: 'primary' },
  { value: 'lost', labelKey: 'filter.lost', colorKey: 'lost' },
  { value: 'found', labelKey: 'filter.found', colorKey: 'found' },
];

/*
 * "3 giờ trước" dễ đọc hơn ngày giờ đầy đủ. Quá 30 ngày thì quay về ngày tháng.
 *
 * Nhận t và lang từ bên ngoài chứ không tự gọi useLanguage(): đây là hàm
 * thường, không phải component, mà hook chỉ gọi được trong component.
 */
function timeAgo(date, t, lang) {
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return t('time.now');
  if (minutes < 60) return t('time.minutes', { n: minutes });
  if (hours < 24) return t('time.hours', { n: hours });
  if (days < 30) return t('time.days', { n: days });

  // Tháng viết tắt cũng phải đổi theo ngôn ngữ: "20 thg 10" / "Oct 20"
  return new Date(date).toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-US', {
    day: 'numeric',
    month: 'short',
  });
}

export default function HomeScreen({ navigation }) {
  // insets.bottom = chiều cao vạch Home (iPhone) hoặc thanh điều hướng (Android).
  // Máy có nút bấm vật lý thì trả về 0, nên không thừa khoảng trống.
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const { colors } = useTheme();
  const styles = useThemedStyles(themedStyles);

  const [pets, setPets] = useState([]);
  const [total, setTotal] = useState(0);
  const [type, setType] = useState('');
  // Các điều kiện lọc còn lại, do bảng trượt PetFilters quản lý
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  // Đang nối thêm trang sau — khác loading là vòng xoay che cả màn hình
  const [loadingMore, setLoadingMore] = useState(false);
  // Chỉ giữ CÓ lỗi hay không, không giữ sẵn câu thông báo. Giữ câu thì lúc đổi
  // ngôn ngữ nó vẫn nằm nguyên trong state bằng tiếng cũ.
  const [hasError, setHasError] = useState(false);

  // Tải TRANG ĐẦU: thay sạch danh sách cũ. Dùng khi mở màn, đổi lọc, kéo làm mới.
  const loadPets = useCallback(async (filterType, activeFilters) => {
    try {
      const { data } = await api.getPets(buildParams(filterType, activeFilters, 0));
      setPets(data.pets);
      setTotal(data.total);
      setHasError(false);
    } catch {
      setPets([]);
      setTotal(0);
      setHasError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  /*
   * useFocusEffect chạy mỗi khi màn hình được quay lại, khác useEffect chỉ chạy
   * lần đầu. Nhờ vậy đăng tin mới hoặc xoá tin xong, bấm Back về đây là danh
   * sách tự cập nhật — không cần truyền dữ liệu ngược giữa các màn hình.
   */
  useFocusEffect(
    useCallback(() => {
      loadPets(type, filters);
    }, [loadPets, type, filters]),
  );

  /*
   * Tải TRANG TIẾP THEO và nối vào cuối danh sách.
   *
   * Khác web: web có nút "Xem thêm" phải bấm. Trên điện thoại thì cuộn gần tới
   * đáy là tự tải — thao tác tự nhiên hơn, không phải với tay bấm nút.
   */
  const loadMore = async () => {
    // Chặn gọi chồng: FlatList có thể bắn sự kiện này nhiều lần liên tiếp
    // trong lúc đang cuộn, không chặn thì tải trùng vài lần một trang.
    if (loadingMore || loading || refreshing) return;
    if (pets.length >= total) return; // hết tin rồi

    setLoadingMore(true);
    try {
      const { data } = await api.getPets(buildParams(type, filters, pets.length));

      setPets((current) => {
        /*
         * Lọc trùng trước khi nối.
         *
         * Giữa lúc mình đang xem, có người đăng tin mới thì mọi tin cũ bị đẩy
         * lùi một bậc — trang sau sẽ trả về một tin mình đã có. Hai tin cùng
         * _id trong FlatList là cảnh báo đỏ và hiển thị sai.
         */
        const seen = new Set(current.map((item) => item._id));
        return [...current, ...data.pets.filter((item) => !seen.has(item._id))];
      });

      setTotal(data.total);
    } catch {
      // Tải thêm hỏng thì im lặng, danh sách cũ vẫn còn nguyên đó.
      // Báo lỗi to ở đây chỉ làm phiền, cuộn lại là nó thử tiếp.
    } finally {
      setLoadingMore(false);
    }
  };

  const changeFilter = (value) => {
    if (value === type) return;
    setType(value);
    setLoading(true);
  };

  const applyFilters = (next) => {
    setFiltersOpen(false);

    /*
     * So khớp bằng nội dung chứ không bằng tham chiếu.
     *
     * Mở bảng ra rồi bấm "Áp dụng" mà không đổi gì thì khỏi gọi lại API.
     * Quan trọng hơn: nếu đặt setLoading(true) mà state không đổi thì
     * useFocusEffect không chạy lại -> vòng xoay quay mãi không ai tắt.
     */
    if (JSON.stringify(next) === JSON.stringify(filters)) return;

    setFilters(next);
    setLoading(true);
  };

  const activeCount = countActiveFilters(filters);

  return (
    <View style={styles.container}>
      <Header total={total} loading={loading} hasError={hasError} navigation={navigation} />

      <View style={styles.filterRow}>
        {FILTERS.map((item) => {
          const active = type === item.value;
          return (
            <TouchableOpacity
              key={item.value || 'all'}
              onPress={() => changeFilter(item.value)}
              activeOpacity={0.8}
              style={[
                styles.chip,
                active && { backgroundColor: colors[item.colorKey], borderColor: colors[item.colorKey] },
              ]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {t(item.labelKey)}
              </Text>
            </TouchableOpacity>
          );
        })}

        {/* Đẩy sát mép phải bằng marginLeft: 'auto' — không cần View đệm */}
        <TouchableOpacity
          style={[styles.filterButton, activeCount > 0 && styles.filterButtonActive]}
          onPress={() => setFiltersOpen(true)}
          activeOpacity={0.8}
        >
          <Text style={[styles.filterButtonText, activeCount > 0 && styles.chipTextActive]}>
            ⚙ {t('home.filter')}
          </Text>
          {activeCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.teal} />
        </View>
      ) : (
        <FlatList
          data={pets}
          keyExtractor={(item) => item._id}
          contentContainerStyle={[styles.list, { paddingBottom: 110 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
          // Kéo màn hình xuống để tải lại — thao tác quen thuộc trên điện thoại,
          // web không có khái niệm này.
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadPets(type, filters);
              }}
              tintColor={colors.teal}
            />
          }
          // Cuộn còn cách đáy 40% chiều cao màn hình là bắt đầu tải trang sau,
          // để tin mới kịp sẵn sàng trước khi người dùng cuộn tới nơi.
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={<EmptyState hasError={hasError} />}
          ListFooterComponent={
            <ListFooter loadingMore={loadingMore} shown={pets.length} total={total} />
          }
          renderItem={({ item }) => (
            <PetItem pet={item} onPress={() => navigation.navigate('Detail', { id: item._id })} />
          )}
        />
      )}

      {/* Nút tròn nổi ở góc — kiểu nút quen thuộc trên điện thoại */}
      <TouchableOpacity
        style={[styles.fab, { bottom: spacing.xl + insets.bottom }]}
        onPress={() => navigation.navigate('Form', { mode: 'create' })}
        activeOpacity={0.85}
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>

      <PetFilters
        visible={filtersOpen}
        value={filters}
        onClose={() => setFiltersOpen(false)}
        onApply={applyFilters}
      />
    </View>
  );
}

function Header({ total, loading, hasError, navigation }) {
  const { t, lang, toggleLang } = useLanguage();
  const { user, isLoggedIn, logout } = useAuth();

  /*
   * Nút tài khoản — TẠM ĐẶT Ở ĐÂY.
   *
   * Khi nào dựng xong thanh điều hướng dưới đáy và trang Cài đặt thì dọn cả
   * nút này lẫn hai nút ngôn ngữ / sáng tối vào đó. Thanh đầu đang quá chật.
   */
  const handleAccount = () => {
    if (!isLoggedIn) {
      navigation.navigate('Auth');
      return;
    }

    Alert.alert(t('auth.welcome', { name: user?.name || '' }), t('auth.logoutConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('auth.logout'), style: 'destructive', onPress: logout },
    ]);
  };
  const { colors, isDark, toggleScheme } = useTheme();
  const styles = useThemedStyles(themedStyles);

  /*
   * insets.top = chiều cao phần bị che ở trên: tai thỏ, Dynamic Island, hoặc
   * thanh trạng thái. iPhone 14 Pro khoảng 59, iPhone cũ 20, Android 24-48.
   *
   * Phải cộng vào paddingTop, không thì logo và slogan chui lên dưới đồng hồ.
   * Không hard-code một con số được vì mỗi máy một khác.
   */
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
      <Image source={isDark ? LOGO_MARK_DARK : LOGO_MARK} style={styles.headerLogo} />

      <View style={styles.headerTextBlock}>
        <Text style={styles.headerTitle}>LostPets</Text>
        {/* Slogan — cũng là câu dùng trên web */}
        <Text style={styles.headerSlogan}>{t('brand.slogan')}</Text>
      </View>

      {!loading && !hasError && (
        <View style={styles.countPill}>
          <Text style={styles.countText}>{total}</Text>
        </View>
      )}

      {/*
        Nút đổi ngôn ngữ. Hiện tên thứ tiếng SẼ chuyển sang chứ không phải thứ
        tiếng đang dùng — bấm "EN" thì được tiếng Anh, đọc là hiểu ngay phải làm
        gì. Ghi thứ tiếng đang dùng thì người ta lại tưởng bấm vào là xác nhận.
      */}
      <TouchableOpacity style={styles.langButton} onPress={toggleLang} activeOpacity={0.7}>
        <Text style={styles.langText}>{lang === 'vi' ? 'EN' : 'VI'}</Text>
      </TouchableOpacity>

      {/*
        Nút đổi sáng/tối. Cùng quy tắc với nút ngôn ngữ: hiện thứ SẼ chuyển
        sang chứ không phải thứ đang dùng. Đang nền tối thì vẽ mặt trời, bấm
        vào là ra nền sáng.

        Tạm để ở đây. Khi nào có trang Cài đặt thì dọn cả hai nút vào đó.
      */}
      <TouchableOpacity
        style={styles.langButton}
        onPress={toggleScheme}
        activeOpacity={0.7}
        accessibilityLabel={t(isDark ? 'theme.toLight' : 'theme.toDark')}
      >
        <Text style={styles.langText}>{isDark ? '☀' : '☾'}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.langButton, isLoggedIn && styles.accountButtonOn]}
        onPress={handleAccount}
        activeOpacity={0.7}
      >
        {/* Đã đăng nhập thì hiện chữ cái đầu của tên, chưa thì hiện hình người */}
        <Text style={[styles.langText, isLoggedIn && styles.accountTextOn]}>
          {isLoggedIn ? (user?.name || '?').trim().charAt(0).toUpperCase() : '👤'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function PetItem({ pet, onPress }) {
  const { t, lang } = useLanguage();
  const { colors, isDark } = useTheme();
  const styles = useThemedStyles(themedStyles);
  const status = statusStyle(pet, colors);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      {/* API trả image là CHUỖI RỖNG khi không có ảnh, không phải null */}
      {pet.image ? (
        <Image source={{ uri: pet.image }} style={styles.cardImage} />
      ) : (
        <View style={[styles.cardImage, styles.cardImagePlaceholder]}>
          <Image source={isDark ? LOGO_MARK_DARK : LOGO_MARK} style={styles.placeholderLogo} />
        </View>
      )}

      <View style={styles.cardBody}>
        <View style={styles.cardTopRow}>
          <View style={[styles.badge, { backgroundColor: status.color }]}>
            <Text style={styles.badgeText}>{t(status.labelKey)}</Text>
          </View>
          <Text style={styles.cardTime}>{timeAgo(pet.date, t, lang)}</Text>
        </View>

        <Text style={styles.cardTitle} numberOfLines={1}>
          {pet.name || pet.breed}
        </Text>
        <Text style={styles.cardSub} numberOfLines={1}>
          {pet.species} · {pet.breed}
        </Text>

        <View style={styles.cardFooter}>
          <Text style={styles.cardArea} numberOfLines={1}>
            📍 {pet.area}
          </Text>
          {!!pet.postId && <Text style={styles.cardCode}>{pet.postId}</Text>}
        </View>
      </View>
    </TouchableOpacity>
  );
}

// Chân danh sách: đang tải thêm thì quay vòng, hết tin thì báo một dòng.
function ListFooter({ loadingMore, shown, total }) {
  const { t } = useLanguage();
  const { colors } = useTheme();
  const styles = useThemedStyles(themedStyles);

  if (loadingMore) {
    return (
      <View style={styles.footer}>
        <ActivityIndicator color={colors.teal} />
        <Text style={styles.footerText}>{t('home.loadingMore')}</Text>
      </View>
    );
  }

  // Danh sách rỗng đã có EmptyState lo, đừng báo "đã hiển thị tất cả" ở đó.
  if (shown > 0 && shown >= total) {
    return (
      <View style={styles.footer}>
        <Text style={styles.footerText}>{t('home.noMore')}</Text>
      </View>
    );
  }

  return null;
}

function EmptyState({ hasError }) {
  const { t } = useLanguage();
  const { colors, isDark } = useTheme();
  const styles = useThemedStyles(themedStyles);

  return (
    <View style={styles.empty}>
      <View style={styles.emptyIconWrap}>
        <Image source={isDark ? LOGO_MARK_DARK : LOGO_MARK} style={styles.emptyLogo} />
      </View>
      <Text style={styles.emptyTitle}>{t(hasError ? 'home.errorTitle' : 'home.emptyTitle')}</Text>
      <Text style={styles.emptyText}>{t(hasError ? 'home.errorText' : 'home.emptySub')}</Text>
    </View>
  );
}

/*
 * StyleSheet.create thay cho file CSS.
 *
 * Vài điểm khác CSS trên web:
 *   - flexDirection mặc định là 'column' (web là 'row')
 *   - không có đơn vị: viết 16 chứ không phải '16px'
 *   - tên thuộc tính viết kiểu camelCase: backgroundColor
 *   - không kế thừa: đặt màu chữ ở View cha thì Text con KHÔNG nhận
 */
const themedStyles = createThemedStyles((colors, shadow) =>
  StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
  },
  headerLogo: { width: 42, height: 42, resizeMode: 'contain' },
  headerTextBlock: { flex: 1, marginLeft: spacing.md },
  headerTitle: { fontSize: 19, fontWeight: '800', color: colors.navy, letterSpacing: -0.3 },
  headerSlogan: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
  countPill: {
    backgroundColor: colors.surfaceTint,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  countText: { fontSize: 13, fontWeight: '700', color: colors.teal },

  langButton: {
    marginLeft: spacing.sm,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  langText: { fontSize: 12, fontWeight: '800', color: colors.textSoft, letterSpacing: 0.3 },
  accountButtonOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  accountTextOn: { color: colors.onPrimary, fontSize: 13 },

  filterRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
  },
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 8,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  chipText: { fontSize: 13, fontWeight: '700', color: colors.textSoft },
  chipTextActive: { color: colors.onPrimary },

  filterButton: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  filterButtonActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterButtonText: { fontSize: 13, fontWeight: '700', color: colors.textSoft },
  filterBadge: {
    minWidth: 17,
    height: 17,
    borderRadius: radius.full,
    // Con số nhỏ nằm trên nền primary, nên lấy màu chữ-trên-primary
    backgroundColor: colors.onPrimary,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  filterBadgeText: { fontSize: 10.5, fontWeight: '800', color: colors.primary },

  list: { padding: spacing.lg, paddingBottom: 110 },

  card: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    padding: spacing.sm,
    marginBottom: spacing.md,
    ...shadow.card,
  },
  cardImage: { width: 96, height: 96, borderRadius: radius.md, backgroundColor: colors.surfaceTint },
  cardImagePlaceholder: { justifyContent: 'center', alignItems: 'center' },
  placeholderLogo: { width: 52, height: 52, resizeMode: 'contain', opacity: 0.45 },

  cardBody: { flex: 1, paddingLeft: spacing.md, paddingVertical: 2, justifyContent: 'space-between' },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  badge: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: radius.full },
  badgeText: { color: colors.onPrimary, fontSize: 10.5, fontWeight: '800' },
  cardTime: { fontSize: 11, color: colors.textMuted },

  cardTitle: { fontSize: 16, fontWeight: '800', color: colors.text, marginTop: 5 },
  cardSub: { fontSize: 12.5, color: colors.textMuted, marginTop: 1 },

  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  cardArea: { flex: 1, fontSize: 12.5, color: colors.textSoft },
  cardCode: { fontSize: 10.5, color: colors.textMuted, marginLeft: spacing.sm },

  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  footerText: { fontSize: 12.5, color: colors.textMuted },

  empty: { alignItems: 'center', paddingTop: 70, paddingHorizontal: spacing.xl },
  emptyIconWrap: {
    width: 96,
    height: 96,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceTint,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  emptyLogo: { width: 58, height: 58, resizeMode: 'contain', opacity: 0.6 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
  emptyText: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 19,
  },

  fab: {
    position: 'absolute',
    right: spacing.xl,
    bottom: spacing.xl,
    width: 58,
    height: 58,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadow.float,
  },
  fabIcon: { color: colors.onPrimary, fontSize: 30, lineHeight: 34, fontWeight: '300' },
  }),
);
