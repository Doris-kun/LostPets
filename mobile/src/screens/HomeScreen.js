import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
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
import { Ionicons } from '@expo/vector-icons';
import api from '../api';
import { API_URL } from '../config';
import PetCard, { timeAgo } from '../components/PetCard';
import PetFilters, { EMPTY_FILTERS, countActiveFilters } from '../components/PetFilters';
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

export default function HomeScreen({ navigation }) {
  // insets.bottom = chiều cao vạch Home (iPhone) hoặc thanh điều hướng (Android).
  // Máy có nút bấm vật lý thì trả về 0, nên không thừa khoảng trống.
  const insets = useSafeAreaInsets();
  /*
   * Chiều cao thanh tab dưới đáy, đã gồm cả vạch Home của máy. Lấy số thật
   * từ react-navigation thay vì đoán, vì mỗi máy một khác.
   */
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
      <Header />

      <View style={styles.filterRow}>
        {FILTERS.map((item) => {
          const active = type === item.value;
          return (
            <TouchableOpacity
              key={item.value || 'all'}
              onPress={() => changeFilter(item.value)}
              activeOpacity={0.8}
              // Chip cao 32, nới thêm 6 trên 6 dưới cho đủ 44
              hitSlop={{ top: 6, bottom: 6 }}
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
          hitSlop={{ top: 6, bottom: 6 }}
        >
          {/*
            Icon bộ lọc chứ không phải bánh răng. Bánh răng nghĩa là "cài đặt",
            mà app đã có hẳn một tab tên Cài đặt rồi — hai chỗ cùng một biểu
            tượng thì người dùng phải đoán cái nào ra cái gì.
          */}
          <Ionicons
            name="options-outline"
            size={15}
            color={activeCount > 0 ? colors.onPrimary : colors.textSoft}
          />
          <Text style={[styles.filterButtonText, activeCount > 0 && styles.chipTextActive]}>
            {t('home.filter')}
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
          /*
           * Bỏ tin đầu ra khỏi danh sách vì nó đã nằm trong thẻ nổi bật phía
           * trên. Để nguyên thì tin mới nhất hiện HAI LẦN.
           */
          data={pets.slice(1)}
          keyExtractor={(item) => item._id}
          contentContainerStyle={[styles.list, { paddingBottom: 90 }]}
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
          ListHeaderComponent={
            <Featured
              pet={pets[0]}
              total={total}
              restCount={pets.length - 1}
              onPress={() => navigation.navigate('Detail', { id: pets[0]._id })}
            />
          }
          /*
           * CHỈ hiện khi thật sự không có tin nào.
           *
           * data của FlatList là pets.slice(1), nên lúc chỉ có đúng một tin thì
           * data rỗng — mà rỗng thì FlatList tự bật ListEmptyComponent lên.
           * Tin đó vẫn đang nằm trong thẻ nổi bật ngay trên, báo "chưa có bài
           * nào" là nói sai.
           */
          ListEmptyComponent={pets.length === 0 ? <EmptyState hasError={hasError} /> : null}
          ListFooterComponent={
            <ListFooter loadingMore={loadingMore} shown={pets.length} total={total} />
          }
          renderItem={({ item }) => (
            <PetCard pet={item} onPress={() => navigation.navigate('Detail', { id: item._id })} />
          )}
        />
      )}

      {/*
        Chỉ còn MỘT nút nổi: nút + đăng bài.

        Trợ lý trước đây cũng là một nút nổi nằm ngay trên nút +, nhưng hai nút
        chồng nhau ở một góc thì không nói được cái nào quan trọng hơn, mà lại
        che mất nội dung. Trợ lý đã dọn sang màn Cài đặt, thành mục "Trung tâm
        trợ giúp" — đúng chỗ người ta đi tìm khi cần giúp đỡ.
      */}
      {/* Nút tròn nổi ở góc — kiểu nút quen thuộc trên điện thoại */}
      <TouchableOpacity
        style={styles.fab}
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

function Header() {
  const { t } = useLanguage();
  const { isDark } = useTheme();
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
    </View>
  );
}


// Chân danh sách: đang tải thêm thì quay vòng, hết tin thì báo một dòng.
/*
 * Thẻ tin nổi bật ở đầu trang chủ — chính là tin MỚI NHẤT trong danh sách đang
 * lọc, giống web (featured = pets[0] trong views/Home.vue).
 *
 * Làm to hẳn ra thay vì dùng PetCard thường: ảnh rộng cả màn, có mô tả. Mục
 * đích là cho người vừa mở app một tin để đọc ngay, thay vì một danh sách
 * đều đều phải tự chọn.
 */
function Featured({ pet, total, restCount, onPress }) {
  const { t, lang } = useLanguage();
  const { colors, isDark } = useTheme();
  const styles = useThemedStyles(themedStyles);

  // Danh sách rỗng thì không có gì để làm nổi bật.
  if (!pet) return null;

  const status = statusStyle(pet, colors);

  return (
    <View>
      {/*
        Số tin đang hiển thị, có kèm chữ.

        Trước đây chỉ là một viên tròn ghi "19" ở góc thanh đầu trang — người
        dùng nhìn vào không đoán được 19 là cái gì: 19 tin? 19 thông báo? 19
        tin chưa đọc? Một con số trơ trọi thì luôn mơ hồ. Web ghi hẳn
        "19 tin đang hiển thị" nên không ai phải đoán.

        Chuyển xuống đây cũng đúng chỗ hơn: nó nói về DANH SÁCH bên dưới, chứ
        không phải về tên app ở thanh đầu trang.
      */}
      <Text style={styles.resultCount}>{t('home.results', { n: total })}</Text>

      <TouchableOpacity style={styles.featured} onPress={onPress} activeOpacity={0.9}>
        <View style={styles.featuredImageBox}>
          {/* API trả image là CHUỖI RỖNG khi không có ảnh, không phải null */}
          {pet.image ? (
            <Image source={{ uri: pet.image }} style={styles.featuredImage} />
          ) : (
            <View style={[styles.featuredImage, styles.featuredImageEmpty]}>
              <Image source={isDark ? LOGO_MARK_DARK : LOGO_MARK} style={styles.featuredLogo} />
            </View>
          )}

          <View style={[styles.featuredBadge, { backgroundColor: status.color }]}>
            <Text style={styles.featuredBadgeText}>{t(status.labelKey)}</Text>
          </View>
        </View>

        <View style={styles.featuredBody}>
          <Text style={styles.featuredLabel}>{t('home.featured')}</Text>
          <Text style={styles.featuredTitle} numberOfLines={1}>
            {pet.name || pet.breed}
          </Text>
          <Text style={styles.featuredSub} numberOfLines={1}>
            {pet.species} · {pet.breed}
          </Text>
          <Text style={styles.featuredArea} numberOfLines={1}>
            {pet.area}
          </Text>

          {!!pet.description && (
            <Text style={styles.featuredDesc} numberOfLines={3}>
              {pet.description}
            </Text>
          )}

          <View style={styles.featuredFoot}>
            <Text style={styles.featuredTime}>{timeAgo(pet.date, t, lang)}</Text>
            {/* Mũi tên vẽ bằng icon — xem lý do ở SettingsScreen */}
            <View style={styles.featuredLinkRow}>
              <Text style={styles.featuredLink}>{t('home.view')}</Text>
              <Ionicons name="chevron-forward" size={14} color={colors.primary} />
            </View>
          </View>
        </View>
      </TouchableOpacity>

      {/* Tiêu đề cho phần còn lại. Chỉ có đúng một tin thì không có "phần còn
          lại" nào để đặt tiêu đề cả. */}
      {restCount > 0 && <Text style={styles.moreLabel}>{t('home.more')}</Text>}
    </View>
  );
}

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
      <Text style={styles.emptyText}>{hasError ? t('home.errorText', { url: API_URL }) : t('home.emptySub')}</Text>
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
  headerTitle: { fontSize: 19, fontWeight: '800', color: colors.brandTitle, letterSpacing: -0.3 },
  headerSlogan: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
  resultCount: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },


  /* ---- Thẻ tin nổi bật ---- */
  featured: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: spacing.lg,
    ...shadow.card,
  },
  featuredImageBox: { position: 'relative' },
  // 16:9 — ảnh ngang, cao vừa phải để phần chữ bên dưới vẫn lọt màn hình
  featuredImage: { width: '100%', aspectRatio: 16 / 9, backgroundColor: colors.surfaceTint },
  featuredImageEmpty: { alignItems: 'center', justifyContent: 'center' },
  featuredLogo: { width: 56, height: 56, opacity: 0.35, resizeMode: 'contain' },
  featuredBadge: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  featuredBadgeText: { fontSize: 11, fontWeight: '800', color: colors.onStatus },

  featuredBody: { padding: spacing.lg },
  featuredLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.accentText,
    letterSpacing: 1.2,
    marginBottom: spacing.sm,
  },
  featuredTitle: { fontSize: 20, fontWeight: '800', color: colors.text },
  featuredSub: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  featuredArea: { fontSize: 13, color: colors.textSoft, marginTop: spacing.sm },
  featuredDesc: { fontSize: 13, color: colors.textMuted, lineHeight: 19, marginTop: spacing.sm },
  featuredFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    marginTop: spacing.lg,
    paddingTop: spacing.md,
  },
  featuredTime: { fontSize: 11, color: colors.textMuted },
  featuredLinkRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  featuredLink: { fontSize: 13, fontWeight: '700', color: colors.primary },

  moreLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
    marginBottom: spacing.md,
  },

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
