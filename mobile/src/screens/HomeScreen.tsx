import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import api, { type PetQuery } from '../api';
import type { Colors } from '../theme';
import type { Filters, MainTabParamList, Pet, RootStackParamList } from '../types';
import type { WordKey } from '../word';
import { API_URL } from '../config';
import PetCard, { timeAgo } from '../components/PetCard';
import { THUMB_FEATURED, thumbnail } from '../image';
import PetFilters, { EMPTY_FILTERS, countActiveFilters } from '../components/PetFilters';
import PetMapView from '../components/PetMapView';
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
 * Chuẩn hoá dấu tiếng Việt về dạng NFC trước khi gửi lên máy chủ.
 *
 * Cùng một chữ "Mèo" có hai cách lưu trong máy tính:
 *   NFC  M + è          (è là MỘT ký tự, mã e8)
 *   NFD  M + e + ̀      (chữ e rồi dấu huyền rời, hai ký tự)
 *
 * Nhìn giống hệt nhau, nhưng máy coi là hai chuỗi khác nhau. Đo thật trên dữ
 * liệu đang chạy, hồi back-end còn chưa vá:
 *
 *   species=Mèo kiểu NFC -> 9 kết quả
 *   species=Mèo kiểu NFD -> 0 kết quả
 *
 * BACK-END ĐÃ VÁ chỗ này rồi (PR #67): chuẩn hoá ở tầng schema cho đường
 * ghi, và chuẩn hoá kèm thoát ký tự đặc biệt cho đường đọc. Nên dòng dưới
 * không còn là thứ duy nhất chặn lỗi nữa.
 *
 * Vẫn giữ, vì một bản app đã cài không biết nó đang nói chuyện với back-end
 * phiên bản nào. APK nằm trên máy người dùng hàng tháng trời, còn back-end
 * thì có thể bị lùi lại một bản bất cứ lúc nào.
 *
 * Kiểm tra normalize có tồn tại không trước khi gọi: máy ảo JavaScript của
 * React Native không phải lúc nào cũng có đủ hàm xử lý Unicode.
 */
const toNFC = (text: string): string =>
  typeof text.normalize === 'function' ? text.normalize('NFC') : text;

/*
 * Dựng tham số gửi lên máy chủ. Để ngoài component vì nó là hàm thuần: cùng
 * đầu vào luôn ra cùng kết quả, không đụng tới state nào.
 *
 * skip = bỏ qua bao nhiêu tin đầu. Trang 1 là 0, trang 2 là 10...
 */
export function buildParams(
  filterType: string,
  activeFilters: Filters,
  skip: number,
  q: string,
): PetQuery {
  // Chỉ gửi những tham số thật sự có giá trị. Gửi kèm chuỗi rỗng thì
  // back-end vẫn dựng biểu thức tìm kiếm rỗng và lọc sai.
  //
  // Khai kiểu PetQuery ngay ở đây, không để TypeScript tự đoán: tự đoán thì
  // nó chốt hình dạng theo ba trường đầu, rồi mấy dòng gán thêm bên dưới
  // thành gán vào trường "không tồn tại".
  const params: PetQuery = { limit: PAGE_SIZE, skip, sort: activeFilters.sort };
  if (filterType) params.type = filterType;
  if (activeFilters.species) params.species = activeFilters.species;
  if (activeFilters.area.trim()) params.area = toNFC(activeFilters.area.trim());
  if (activeFilters.days) params.days = activeFilters.days;

  /*
   * Câu tìm kiếm. Back-end hiểu cả lời nói thường ("chó vàng mất ở quận 7")
   * chứ không chỉ so khớp từng chữ — nó so bằng NGHĨA, dùng embedding.
   *
   * QUAN TRỌNG: tìm kiếm chỉ SẮP LẠI THỨ TỰ, không loại tin nào đi. Gõ
   * "chó vàng" thì mèo vẫn còn trong danh sách, chỉ bị đẩy xuống dưới.
   *
   * Đó là chủ ý của back-end (searchByMeaning trong petController.js): đo
   * thật trên tiếng Việt thì không có ngưỡng điểm nào dùng được — câu rác
   * "xe máy Honda Wave bị mất" đạt 0.646 còn câu tra số điện thoại thật chỉ
   * 0.639. Với web tìm thú cưng thì bỏ sót nguy hiểm hơn thừa: thấy nhầm
   * một con chó hơi giống chỉ mất hai giây, giấu mất con chó của người ta
   * thì mất luôn.
   *
   * Vì vậy giao diện phải nói rõ ra, nếu không người dùng thấy mèo vẫn nằm
   * đó sẽ tưởng ô tìm kiếm hỏng.
   *
   * Và phải chờ người dùng gõ xong mới gửi: mỗi lần gọi là một lượt chạy AI
   * bên back-end, gửi theo từng ký tự thì vừa chậm vừa tốn.
   */
  if (q.trim()) params.q = toNFC(q.trim());
  return params;
}

/*
 * colorKey chứ không phải màu sẵn: bảng này nằm ở cấp file, chạy lúc nạp —
 * lúc đó chưa ai biết người dùng đang để chế độ sáng hay tối. Lưu TÊN màu,
 * lúc vẽ mới tra ra màu thật bằng colors[item.colorKey].
 */
/*
 * colorKey chứ không phải màu sẵn — xem giải thích bên dưới. Khai keyof Colors
 * nên gõ sai tên màu là báo lỗi, thay vì lấy ra undefined rồi chip mất màu.
 */
const FILTERS: { value: string; labelKey: WordKey; colorKey: keyof Colors }[] = [
  { value: '', labelKey: 'filter.all', colorKey: 'primary' },
  { value: 'lost', labelKey: 'filter.lost', colorKey: 'lost' },
  { value: 'found', labelKey: 'filter.found', colorKey: 'found' },
];

type Props = {
  navigation: NativeStackScreenProps<RootStackParamList>['navigation'] &
    NativeStackScreenProps<MainTabParamList>['navigation'];
};

export default function HomeScreen({ navigation }: Props) {
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

  const [pets, setPets] = useState<Pet[]>([]);
  const [total, setTotal] = useState(0);
  const [type, setType] = useState('');
  // Các điều kiện lọc còn lại, do bảng trượt PetFilters quản lý
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);

  /*
   * HAI biến cho một ô tìm kiếm, cố ý:
   *
   *   search — chữ đang hiện trong ô, đổi theo từng phím gõ
   *   query  — chữ ĐÃ GỬI lên máy chủ, chỉ đổi khi người dùng ngừng gõ
   *
   * Gộp làm một thì mỗi ký tự là một lượt gọi máy chủ. Tìm bằng nghĩa bên
   * back-end phải chạy AI, nên gõ "chó vàng" sẽ thành 8 lượt chạy — vừa chậm,
   * vừa tốn, mà 7 lượt đầu kết quả vứt đi.
   */
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');

  /*
   * Đang xem danh sách hay bản đồ. Giống nút chuyển bên web, nhưng ở đây
   * bản đồ chiếm TRỌN vùng danh sách chứ không phải một ô nhỏ trong trang
   * cuộn — bản đồ nhỏ nằm giữa trang cuộn thì kéo bản đồ hay kéo trang, máy
   * không đoán được.
   */
  const [view, setView] = useState<'list' | 'map'>('list');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  // Đang nối thêm trang sau — khác loading là vòng xoay che cả màn hình
  const [loadingMore, setLoadingMore] = useState(false);
  // Chỉ giữ CÓ lỗi hay không, không giữ sẵn câu thông báo. Giữ câu thì lúc đổi
  // ngôn ngữ nó vẫn nằm nguyên trong state bằng tiếng cũ.
  const [hasError, setHasError] = useState(false);

  /*
   * Ngừng gõ 500ms rồi mới coi là "đã gõ xong".
   *
   * Mỗi phím gõ lại hẹn một cái đồng hồ mới và huỷ cái cũ, nên chỉ cái cuối
   * cùng chạy tới nơi. 500ms là khoảng nghỉ tự nhiên giữa hai từ — ngắn hơn
   * thì vẫn gọi thừa, dài hơn thì người dùng tưởng app đơ.
   */
  useEffect(() => {
    const hen = setTimeout(() => {
      setQuery((truoc) => {
        if (truoc === search) return truoc; // không đổi thì đừng tải lại
        setLoading(true);
        return search;
      });
    }, 500);
    return () => clearTimeout(hen);
  }, [search]);

  // Tải TRANG ĐẦU: thay sạch danh sách cũ. Dùng khi mở màn, đổi lọc, kéo làm mới.
  const loadPets = useCallback(async (filterType: string, activeFilters: Filters, q: string) => {
    try {
      const { data } = await api.getPets(buildParams(filterType, activeFilters, 0, q));
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
      loadPets(type, filters, query);
    }, [loadPets, type, filters, query]),
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
      const { data } = await api.getPets(buildParams(type, filters, pets.length, query));

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

  const changeFilter = (value: string) => {
    if (value === type) return;
    setType(value);
    setLoading(true);
  };

  const applyFilters = (next: Filters) => {
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

      {/*
        Ô tìm kiếm đặt TRÊN hàng chip, không nhét vào bảng lọc trượt.

        Lọc là thu hẹp dần những gì đang thấy; tìm là nhảy thẳng tới thứ mình
        nghĩ trong đầu. Người mất thú cưng mở app lên là đã có sẵn câu trong
        đầu rồi, nên để họ gõ ngay thay vì bắt mở thêm một bảng nữa.
      */}
      <View style={styles.searchBox}>
        <Ionicons name="search-outline" size={17} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder={t('search.placeholder')}
          placeholderTextColor={colors.textMuted}
          returnKeyType="search"
          autoCorrect={false}
        />
        {/*
          Nút xoá chỉ hiện khi có chữ. Hiện sẵn lúc ô trống thì nó là một nút
          bấm vào không xảy ra gì — người dùng phải thử mới biết nó vô dụng.
        */}
        {search.length > 0 && (
          <TouchableOpacity
            style={styles.searchClear}
            onPress={() => setSearch('')}
            accessibilityLabel={t('search.clear')}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.7}
          >
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/*
        Chỉ hiện khi đang tìm. Lúc không tìm thì câu này vô nghĩa, mà vẫn
        chiếm một dòng ngay chỗ dễ nhìn nhất màn hình.
      */}
      {/*
        Chỉ hiện ở chế độ danh sách. Bản đồ có câu giải thích riêng, vì trên
        bản đồ không có khái niệm "kết quả sắp theo thứ tự" — mọi chấm hiện
        cùng lúc.
      */}
      {view === 'list' && !!query.trim() && (
        <Text style={styles.searchNote}>{t('search.hint')}</Text>
      )}

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

      {/*
        Nút chuyển. Hai nửa bằng nhau, nửa đang chọn tô nền — kiểu điều khiển
        quen thuộc trên điện thoại, rõ hơn hẳn hai dòng chữ cạnh nhau.
      */}
      <View style={styles.viewSwitch}>
        {(['list', 'map'] as const).map((mode) => {
          const on = view === mode;
          return (
            <TouchableOpacity
              key={mode}
              style={[styles.viewTab, on && styles.viewTabOn]}
              onPress={() => setView(mode)}
              activeOpacity={0.8}
            >
              <Ionicons
                name={mode === 'list' ? 'list-outline' : 'map-outline'}
                size={15}
                color={on ? colors.onPrimary : colors.textSoft}
              />
              <Text style={[styles.viewTabText, on && styles.viewTabTextOn]}>
                {t(mode === 'list' ? 'map.listView' : 'map.mapView')}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {view === 'map' ? (
        /*
         * Truyền thẳng bộ tham số của danh sách sang. Nhờ vậy lọc và tìm
         * kiếm ăn vào cả hai chế độ — gõ chữ rồi bấm sang bản đồ không bị
         * thấy lại những tin vừa bị loại.
         *
         * limit và skip trong đó thì /pets/map bỏ qua: bản đồ không phân
         * trang được, không thể vẽ nửa bản đồ rồi bắt bấm "xem thêm".
         */
        <PetMapView
          params={buildParams(type, filters, 0, query)}
          onOpenPet={(id) => navigation.navigate('Detail', { id })}
        />
      ) : loading ? (
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
                loadPets(type, filters, query);
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
          ListEmptyComponent={
            // undefined chu khong phai null: FlatList khai slot nay la
            // Element | ComponentType | undefined, khong nhan null.
            pets.length === 0 ? (
              <EmptyState hasError={hasError} searching={!!query.trim()} />
            ) : undefined
          }
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
      {/*
        Giấu nút "+" khi đang xem bản đồ — nút "Gần tôi" của bản đồ nằm
        đúng chỗ này. Mỗi chế độ một hành động chính ở cùng một góc, ngón
        cái không phải học lại. Muốn đăng tin thì bấm "Danh sách" một cái.
      */}
      {view === 'list' && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('Form', { mode: 'create' })}
          activeOpacity={0.85}
        >
          <Text style={styles.fabIcon}>+</Text>
        </TouchableOpacity>
      )}

      <PetFilters
        searching={!!query.trim()}
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
function Featured({
  pet,
  total,
  restCount,
  onPress,
}: {
  /** undefined khi danh sách rỗng — lúc đó không có gì để làm nổi bật. */
  pet?: Pet;
  total: number;
  restCount: number;
  onPress: () => void;
}) {
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
            <Image
              source={{ uri: thumbnail(pet.image, THUMB_FEATURED) }}
              style={styles.featuredImage}
            />
          ) : (
            <View style={[styles.featuredImage, styles.featuredImageEmpty]}>
              <Image source={isDark ? LOGO_MARK_DARK : LOGO_MARK} style={styles.featuredLogo} />
            </View>
          )}

          <View style={[styles.featuredBadge, { backgroundColor: status.color }]}>
            <Text style={[styles.featuredBadgeText, { color: status.onColor }]}>
              {t(status.labelKey)}
            </Text>
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

function ListFooter({
  loadingMore,
  shown,
  total,
}: {
  loadingMore: boolean;
  shown: number;
  total: number;
}) {
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

/*
 * Ba câu khác nhau cho ba tình huống, không gộp được:
 *
 *   lỗi mạng        -> hướng dẫn kiểm tra back-end
 *   đang tìm kiếm   -> gợi ý đổi cách gõ
 *   chưa có tin nào -> mời đăng bài đầu tiên
 *
 * Gộp hai cái sau thì người tìm "chó vàng" không ra kết quả sẽ đọc được câu
 * "Chưa có bài nào — bấm + để đăng bài đầu tiên", trong khi app có cả trăm
 * tin. Câu đó vừa sai vừa làm người ta tưởng app hỏng.
 */
function EmptyState({ hasError, searching }: { hasError: boolean; searching: boolean }) {
  const { t } = useLanguage();
  const { colors, isDark } = useTheme();
  const styles = useThemedStyles(themedStyles);

  return (
    <View style={styles.empty}>
      <View style={styles.emptyIconWrap}>
        <Image source={isDark ? LOGO_MARK_DARK : LOGO_MARK} style={styles.emptyLogo} />
      </View>
      <Text style={styles.emptyTitle}>
        {t(hasError ? 'home.errorTitle' : searching ? 'search.noMatchTitle' : 'home.emptyTitle')}
      </Text>
      <Text style={styles.emptyText}>
        {hasError
          ? t('home.errorText', { url: API_URL })
          : t(searching ? 'search.noMatchSub' : 'home.emptySub')}
      </Text>
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
  // Màu chữ do statusStyle quyết định lúc vẽ
  featuredBadgeText: { fontSize: 11, fontWeight: '800' },

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

  /*
   * Ô tìm kiếm. Viền 1.5 và dùng borderStrong chứ không phải border nhạt:
   * đây là chỗ GÕ ĐƯỢC, mà viền chính là dấu hiệu duy nhất cho biết điều đó.
   * Viền mờ quá thì nó trông như một dòng chữ gợi ý, không ai bấm vào.
   */
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    // 44 là mức tối thiểu cho một vùng chạm trên iOS (Android là 48dp)
    minHeight: 46,
  },
  /*
   * paddingVertical: 0 — Android tự chèn đệm trên dưới vào TextInput, không
   * gỡ đi thì chữ nằm lệch hẳn so với hai cái icon hai bên.
   */
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    paddingVertical: 0,
  },
  searchClear: { padding: 2 },
  searchNote: {
    fontSize: 11.5,
    color: colors.textMuted,
    marginHorizontal: spacing.lg,
    marginTop: -spacing.xs,
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
    borderColor: colors.borderStrong,
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
    borderColor: colors.borderStrong,
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

  /*
   * Nút chuyển Danh sách / Bản đồ. Hai nửa bằng nhau trong một khung bo
   * tròn, nửa đang chọn tô nền đậm — kiểu điều khiển quen thuộc trên điện
   * thoại, rõ hơn hẳn hai dòng chữ đặt cạnh nhau.
   */
  viewSwitch: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: 3,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceTint,
  },
  viewTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    // 44 là mức tối thiểu cho một vùng chạm trên iOS (Android là 48dp)
    minHeight: 44,
    borderRadius: radius.full,
  },
  viewTabOn: { backgroundColor: colors.primary },
  viewTabText: { fontSize: 13, fontWeight: '700', color: colors.textSoft },
  viewTabTextOn: { color: colors.onPrimary },

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
