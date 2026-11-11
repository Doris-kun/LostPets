import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  RefreshControl,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import AdminReports from '../components/AdminReports';
import api, { type PetQuery } from '../api';
import type { AdminStats, Pet, RootStackParamList } from '../types';
import type { Lang, WordKey } from '../word';
import { timeAgo } from '../components/PetCard';
import { useAuth } from '../context/auth';
import { useLanguage } from '../context/language';
import { useTheme } from '../context/theme';
import { spacing, statusStyle } from '../theme';

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

const TYPE_FILTERS: { value: string; labelKey: WordKey }[] = [
  { value: '', labelKey: 'admin.allTypes' },
  { value: 'lost', labelKey: 'admin.lost' },
  { value: 'found', labelKey: 'admin.found' },
];

const STATUS_FILTERS: { value: string; labelKey: WordKey }[] = [
  { value: '', labelKey: 'admin.allStatus' },
  { value: 'false', labelKey: 'admin.open' },
  { value: 'true', labelKey: 'admin.resolved' },
];

type Props = NativeStackScreenProps<RootStackParamList, 'Admin'>;

export default function AdminScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { t, lang } = useLanguage();
  const { isAdmin } = useAuth();
  const { colors } = useTheme();

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [pets, setPets] = useState<Pet[]>([]);
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
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setQuery(search), SEARCH_DELAY);
    return () => clearTimeout(timer);
  }, [search]);

  const params = useCallback(
    (skip: number): PetQuery => {
      // Khai kiểu ngay, không để TypeScript tự đoán theo hai trường đầu — tự
      // đoán thì mấy dòng gán thêm bên dưới thành gán vào trường không tồn tại.
      const p: PetQuery = { limit: PAGE_SIZE, skip };
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

  const remove = (pet: Pet) => {
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
      <View className="flex-1 items-center justify-center bg-background p-xl">
        <Text className="mt-xl text-center text-[14px] leading-5 text-text-soft">{t('admin.denied')}</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background p-xl">
        <ActivityIndicator size="large" color={colors.teal} />
      </View>
    );
  }

  return (
    <FlatList
      className="flex-1 bg-background"
      data={pets}
      keyExtractor={(item) => item._id}
      /*
        px-lg pt-lg chứ không phải p-lg: đệm dưới phải tính theo vùng an
        toàn của máy nên nó ở contentContainerStyle. Để p-lg thì hai nguồn
        cùng khai paddingBottom, và cái nào thắng là tuỳ thứ tự gộp —
        không nên phụ thuộc vào điều đó.
      */
      contentContainerClassName="px-lg pt-lg"
      contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
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
        <>
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
          onCleaned={load}
        />

        {/*
          Báo cáo nằm TRÊN danh sách tin, giống bản web.

          Đây là việc cần người quyết định; danh sách tin bên dưới chỉ là để
          tra cứu. Đặt dưới thì phải cuộn qua cả trăm tin mới thấy, mà một
          tin lừa đảo để càng lâu càng hại.

          Xoá tin xong thì gọi load() để số liệu và danh sách tin bên ngoài
          cập nhật theo — nếu không, tin vừa xoá vẫn nằm trong danh sách.
        */}
        <AdminReports
          onOpenPet={(id) => navigation.navigate('Detail', { id })}
          onPetDeleted={load}
        />
        </>
      }
      ListEmptyComponent={
        <Text className="mt-xl text-center text-[14px] leading-5 text-text-soft">
          {t(hasError ? 'admin.loadFailed' : 'admin.noPosts')}
        </Text>
      }
      ListFooterComponent={
        // undefined chu khong phai null: FlatList khai slot nay la
        // Element | ComponentType | undefined, khong nhan null.
        loadingMore ? <ActivityIndicator className="my-lg" color={colors.teal} /> : undefined
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

function Header({
  stats,
  total,
  hasError,
  type,
  setType,
  resolved,
  setResolved,
  search,
  setSearch,
  onCleaned,
}: {
  stats: AdminStats | null;
  total: number;
  hasError: boolean;
  type: string;
  setType: (value: string) => void;
  resolved: string;
  setResolved: (value: string) => void;
  search: string;
  setSearch: (value: string) => void;
  onCleaned: () => void;
}) {
  const { t } = useLanguage();
  const { colors } = useTheme();

  const [cleaning, setCleaning] = useState(false);

  /*
   * Dọn ngay những tin đã đoàn tụ quá hạn.
   *
   * Bình thường việc này do lịch chạy tự động lo mỗi đêm. Nút bấm tay chỉ để
   * khỏi phải chờ tới đêm — và để người chấm bài thấy được việc đó có thật,
   * chứ không phải một câu hứa trong báo cáo.
   *
   * Hỏi xác nhận vì KHÔNG LẤY LẠI ĐƯỢC: tin mất, ảnh trên Cloudinary cũng
   * mất theo.
   */
  const cleanup = () => {
    Alert.alert(t('admin.title'), t('admin.confirmCleanup'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('admin.cleanupNow'),
        style: 'destructive',
        onPress: async () => {
          setCleaning(true);
          try {
            const { data } = await api.adminCleanup();
            Alert.alert(t('admin.title'), t('admin.cleanupDone', { count: data.deleted }));
            onCleaned();
          } catch {
            Alert.alert(t('admin.title'), t('admin.loadFailed'));
          } finally {
            setCleaning(false);
          }
        },
      },
    ]);
  };

  return (
    <View>
      <Text className="mb-lg text-[13px] text-text-soft">{t('admin.subtitle')}</Text>

      {stats && (
        <>
          {/*
            flex-wrap + basis-[30%] để vừa 3 ô một hàng trên mọi máy, không
            cần đo bề ngang màn hình.
          */}
          <View className="flex-row flex-wrap gap-sm">
            <Tile label={t('admin.totalPosts')} value={stats.total} />
            <Tile label={t('admin.lost')} value={stats.lost} tint={colors.lost} />
            <Tile label={t('admin.found')} value={stats.found} tint={colors.found} />
            <Tile label={t('admin.open')} value={stats.open} />
            <Tile label={t('admin.resolved')} value={stats.resolved} tint={colors.resolved} />
            <Tile label={t('admin.users')} value={stats.users} />
          </View>

          {/* Thanh tỉ lệ đoàn tụ — con số quan trọng nhất của cả app, nên cho
              nó một dòng riêng thay vì nhét chung vào lưới ô số liệu. */}
          <View className="mt-md rounded-md border border-border-light bg-surface p-md">
            <View className="flex-row items-baseline gap-sm">
              <Text className="text-[24px] font-extrabold text-resolved">
                {stats.resolvedRate}%
              </Text>
              <Text className="shrink text-[12px] text-text-soft">{t('admin.resolvedRate')}</Text>
            </View>
            <View className="mt-sm h-1.5 overflow-hidden rounded-full bg-border-light">
              {/* Bề rộng là con số chạy theo dữ liệu nên phải ở style */}
              <View
                className="h-full rounded-full bg-resolved"
                style={{ width: `${stats.resolvedRate}%` }}
              />
            </View>
          </View>

          {/*
            Chỉ hiện khi THẬT SỰ có tin quá hạn. Không có tin nào mà vẫn vẽ
            một nút "Dọn ngay" thì bấm vào chẳng xảy ra gì, người dùng phải
            thử mới biết nó vô dụng.
          */}
          {stats.pendingCleanup > 0 && (
            /*
              Bộ màu secret (vàng cam) chứ không phải danger (đỏ): dọn tin là
              việc đã lên lịch và bình thường, không phải sự cố. Đỏ để dành
              cho báo cáo tin xấu, thứ thật sự cần người can thiệp.
            */
            <View className="mt-md gap-md rounded-md border-[1.5px] border-secret-border bg-secret-bg p-md">
              <Text className="text-[12.5px] leading-[18px] text-secret-text">
                {t('admin.cleanupDue', {
                  count: stats.pendingCleanup,
                  days: stats.cleanupDays,
                })}
              </Text>
              <TouchableOpacity
                className={`min-h-11 items-center justify-center rounded-md bg-danger ${
                  cleaning ? 'opacity-[0.45]' : ''
                }`}
                onPress={cleanup}
                disabled={cleaning}
                activeOpacity={0.85}
              >
                {/* text-white chứ không phải text-on-primary: nền nút là màu
                    danger, và chữ trắng trên nền đỏ đó đạt tương phản ở cả
                    hai chế độ sáng tối. */}
                <Text className="text-[13.5px] font-bold text-white">
                  {t(cleaning ? 'admin.cleanupRunning' : 'admin.cleanupNow')}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <Rank title={t('admin.topAreas')} rows={stats.topAreas} />
          <Rank title={t('admin.topBreeds')} rows={stats.topBreeds} />
        </>
      )}

      <TextInput
        className="mt-lg rounded-md border border-border-strong bg-surface px-md py-2.5 text-[14px] text-text"
        value={search}
        onChangeText={setSearch}
        placeholder={t('admin.search')}
        accessibilityLabel={t('admin.search')}
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

      {!hasError && (
        <Text className="mb-sm mt-lg text-[12px] text-text-muted">
          {t('admin.posts', { n: total })}
        </Text>
      )}
    </View>
  );
}

function Tile({ label, value, tint }: { label: string; value: number; tint?: string }) {
  return (
    <View className="grow basis-[30%] items-center rounded-md border border-border-light bg-surface px-sm py-md">
      {/* tint là màu chạy theo loại tin (mất/thấy) nên phải ở style */}
      <Text className="text-[20px] font-extrabold text-text" style={!!tint && { color: tint }}>
        {value}
      </Text>
      <Text className="mt-0.5 text-center text-[10px] text-text-muted">{label}</Text>
    </View>
  );
}

function Rank({ title, rows }: { title: string; rows?: { label: string; count: number }[] }) {
  const { t } = useLanguage();

  return (
    <View className="mt-md rounded-md border border-border-light bg-surface p-md">
      <Text className="mb-sm text-[11px] font-bold tracking-[0.5px] text-text-muted">
        {title}
      </Text>
      {rows?.length ? (
        rows.map((row) => (
          // Tên khu vực có thể trùng nhau sau khi cắt bớt, nên ghép thêm số
          // lượng vào key cho chắc.
          <View key={`${row.label}-${row.count}`} className="flex-row items-center gap-sm py-[3px]">
            <Text className="flex-1 text-[13px] text-text-soft" numberOfLines={1}>
              {row.label || t('admin.noData')}
            </Text>
            <Text className="text-[13px] font-bold text-text">{row.count}</Text>
          </View>
        ))
      ) : (
        <Text className="text-[12px] text-text-muted">{t('admin.noData')}</Text>
      )}
    </View>
  );
}

function ChipRow({
  items,
  value,
  onChange,
}: {
  items: { value: string; labelKey: WordKey }[];
  value: string;
  onChange: (value: string) => void;
}) {
  const { t } = useLanguage();

  return (
    <View className="mt-sm flex-row gap-sm">
      {items.map((item) => {
        const active = value === item.value;
        return (
          <TouchableOpacity
            key={item.value || 'all'}
            className={`rounded-full border-[1.5px] px-md py-[7px] ${
              active ? 'border-primary bg-primary' : 'border-border-strong'
            }`}
            onPress={() => onChange(item.value)}
            activeOpacity={0.8}
            // Chip cao 28, nới 8 trên 8 dưới cho đủ 44 (chỉ nới dọc)
            hitSlop={{ top: 8, bottom: 8 }}
          >
            <Text
              className={`text-[12px] font-bold ${
                active ? 'text-on-primary' : 'text-text-soft'
              }`}
            >
              {t(item.labelKey)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function Row({
  pet,
  busy,
  onOpen,
  onDelete,
  lang,
}: {
  pet: Pet;
  busy: boolean;
  onOpen: () => void;
  onDelete: () => void;
  lang: Lang;
}) {
  const { t } = useLanguage();
  const { colors, shadow } = useTheme();
  const status = statusStyle(pet, colors);

  return (
    <TouchableOpacity
      /*
        min-h-16 = 64 = ảnh 48 cộng đệm 8 trên 8 dưới, đúng bằng chiều cao
        hàng vốn tự có. Khai ra để luật 44pt đo được: không khai thì nó
        chỉ thấy p-sm và tính ra 34pt, báo động oan.
      */
      className="mb-sm min-h-16 flex-row items-center gap-md rounded-md bg-surface p-sm"
      style={shadow.card}
      onPress={onOpen}
      activeOpacity={0.85}
    >
      {/* API trả image là CHUỖI RỖNG khi không có ảnh, không phải null */}
      {pet.image ? (
        <Image source={{ uri: pet.image }} className="h-12 w-12 rounded-sm bg-surface-tint" />
      ) : (
        <View className="h-12 w-12 rounded-sm border border-border-light bg-surface-tint" />
      )}

      <View className="flex-1 gap-0.5">
        <Text className="text-[14px] font-bold text-text" numberOfLines={1}>
          {pet.name || pet.breed}
        </Text>
        <Text className="text-[11px] text-text-muted" numberOfLines={1}>
          {pet.area} · {pet.owner?.name || t('admin.guest')}
        </Text>
        <View className="mt-0.5 flex-row items-center gap-sm">
          {/* Màu nhãn chạy theo trạng thái tin nên phải ở style */}
          <Text
            className="overflow-hidden rounded-full border px-1.5 py-px text-[9px] font-extrabold tracking-[0.4px]"
            style={{ color: status.color, borderColor: status.color }}
          >
            {t(status.labelKey)}
          </Text>
          <Text className="text-[10px] text-text-muted">{timeAgo(pet.date, t, lang)}</Text>
        </View>
      </View>

      <TouchableOpacity
        className="min-w-14 items-center px-md py-sm"
        onPress={onDelete}
        disabled={busy}
        hitSlop={8}
      >
        {busy ? (
          <ActivityIndicator size="small" color={colors.danger} />
        ) : (
          <Text className="text-[12px] font-bold text-danger">{t('admin.delete')}</Text>
        )}
      </TouchableOpacity>
    </TouchableOpacity>
  );
}
