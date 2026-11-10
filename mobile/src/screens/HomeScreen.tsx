import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
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
import {
  distanceKm,
  formatDistanceKm,
  hasPoint,
  locateMe,
  readSavedMe,
  type Point,
} from '../map';
import { readPets, savePets } from '../cache';
import PetFilters, { EMPTY_FILTERS, countActiveFilters } from '../components/PetFilters';
import PetMapView from '../components/PetMapView';
import ResolveNudge from '../components/ResolveNudge';
import { useLanguage } from '../context/language';
import { spacing, statusStyle } from '../theme';
import { useTheme } from '../context/theme';

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
  /*
   * Chiều cao thanh tab dưới đáy, đã gồm cả vạch Home của máy. Lấy số thật
   * từ react-navigation thay vì đoán, vì mỗi máy một khác.
   */
  const { t } = useLanguage();
  const { colors, shadow } = useTheme();

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

  /*
   * Vị trí người xem, để thẻ tin hiện khoảng cách tới nơi con vật mất.
   *
   * Trang chủ KHÔNG tự xin quyền vị trí. Nó chỉ đọc thứ bản đồ đã lưu sau
   * khi người dùng tự bấm "Gần tôi". Ném hộp thoại xin quyền vào mặt người
   * vừa mở app là thô lỗ, và trái với điều trang chính sách vừa cam kết.
   *
   * Đọc lại mỗi lần quay về màn này, không chỉ lần đầu: người dùng sang bản
   * đồ bấm "Gần tôi" rồi quay lại là thấy khoảng cách hiện ra ngay.
   */
  const [me, setMe] = useState<Point | null>(null);
  const [loading, setLoading] = useState(true);

  /*
   * Chờ đã quá lâu hay chưa.
   *
   * Máy chủ chạy trên Render bản miễn phí, ngủ sau 15 phút không ai gọi, và
   * lượt gọi đầu tiên sau đó phải chờ nó thức dậy — có khi 30 giây. Một vòng
   * xoay im lặng suốt 30 giây thì ai cũng kết luận app hỏng. Nói thẳng ra là
   * đang chờ máy chủ thì người dùng biết mình nên chờ, chứ không bấm loạn.
   */
  const [slow, setSlow] = useState(false);
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

  /*
   * Danh sách MẶC ĐỊNH là danh sách không lọc gì, không tìm gì.
   *
   * Chỉ danh sách đó mới được nhớ tạm: kết quả của một bộ lọc cũ mà hiện ra
   * dưới bộ lọc vừa đổi thì SAI chứ không phải chậm — người dùng tưởng bộ lọc
   * không ăn. So nguyên cả object thay vì đếm số điều kiện, để không sót
   * trường sort.
   */
  const laMacDinh = (filterType: string, activeFilters: Filters, q: string) =>
    !filterType && !q.trim() && JSON.stringify(activeFilters) === JSON.stringify(EMPTY_FILTERS);

  // Tải TRANG ĐẦU: thay sạch danh sách cũ. Dùng khi mở màn, đổi lọc, kéo làm mới.
  const loadPets = useCallback(async (filterType: string, activeFilters: Filters, q: string) => {
    try {
      const { data } = await api.getPets(buildParams(filterType, activeFilters, 0, q));
      setPets(data.pets);
      setTotal(data.total);
      setHasError(false);

      // Ghi lại để lần mở app sau có cái hiện ngay. Không chờ nó xong: ghi ổ
      // đĩa mất vài mili giây, mà màn hình thì đã vẽ được rồi.
      if (laMacDinh(filterType, activeFilters, q)) savePets(data.pets, data.total);
    } catch {
      setPets([]);
      setTotal(0);
      setHasError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setSlow(false);
    }
  }, []);

  /*
   * Mở app ra: hiện ngay danh sách lần trước, rồi mới chờ máy chủ.
   *
   * Chạy đúng MỘT lần, và chỉ đổ vào khi màn hình còn trống. Nếu lượt gọi
   * thật về trước (máy chủ đang thức, mạng nhanh) thì bỏ qua hoàn toàn — đè
   * dữ liệu cũ lên dữ liệu mới là đi lùi.
   */
  useEffect(() => {
    let bo = false;

    readPets().then((saved) => {
      if (bo || !saved || saved.pets.length === 0) return;

      setPets((truoc) => {
        if (truoc.length > 0) return truoc; // đã có dữ liệu thật rồi
        setTotal(saved.total);
        setLoading(false);
        return saved.pets;
      });
    });

    return () => {
      bo = true;
    };
  }, []);

  /*
   * Quá 4 giây mà chưa xong thì coi là máy chủ đang thức dậy.
   *
   * 4 giây vì lượt gọi bình thường mất 0,6 đến 3 giây — báo sớm hơn thì câu
   * "máy chủ đang khởi động" hiện ra cả lúc mọi thứ vẫn chạy tốt, và một câu
   * báo sai vài lần là câu không ai còn tin.
   */
  useEffect(() => {
    if (!loading) {
      setSlow(false);
      return;
    }

    const hen = setTimeout(() => setSlow(true), 4000);
    return () => clearTimeout(hen);
  }, [loading]);

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

  useFocusEffect(
    useCallback(() => {
      let ignore = false;
      readSavedMe().then((saved) => {
        if (!ignore) setMe(saved);
      });
      return () => {
        ignore = true;
      };
    }, []),
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

  /*
   * Đang đi lấy toạ độ. Chỉ để đổi chữ trên nút, không khoá màn hình: lấy vị
   * trí mất một hai giây và người dùng vẫn cuộn danh sách bình thường được
   * trong lúc đó.
   */
  const [locating, setLocating] = useState(false);

  /*
   * Xin vị trí NGAY TẠI TRANG CHỦ.
   *
   * Trước đây muốn thấy khoảng cách trên thẻ tin thì phải sang tab Bản đồ,
   * bấm "Gần tôi", rồi quay lại — ba thao tác cho một việc, mà chẳng có gì
   * trên trang chủ gợi ý rằng phải làm vậy. Bản web vừa vá đúng chỗ này, xem
   * front-end PR #75.
   *
   * Vẫn KHÔNG tự xin lúc mở màn: trang chính sách đã cam kết "chỉ hỏi vị trí
   * khi bạn tự bấm nút", nên nó phải đi sau một cú bấm thật.
   */
  const askLocation = useCallback(async () => {
    setLocating(true);
    const diem = await locateMe();
    if (diem) setMe(diem);
    setLocating(false);
  }, []);

  const activeCount = countActiveFilters(filters);

  return (
    <View className="flex-1 bg-surface">
      <Header />

      {/*
        Dải hỏi "tìm được chưa?" đặt trên cùng, ngay dưới phần đầu trang.

        Nó tự ẩn khi không có tin nào đáng hỏi, mà phần lớn thời gian là vậy —
        nên đặt ở chỗ dễ thấy nhất không tốn gì, còn lúc nó hiện ra thì đúng
        là thứ cần thấy ngay.
      */}
      <ResolveNudge />

      {/*
        Ô tìm kiếm đặt TRÊN hàng chip, không nhét vào bảng lọc trượt.

        Lọc là thu hẹp dần những gì đang thấy; tìm là nhảy thẳng tới thứ mình
        nghĩ trong đầu. Người mất thú cưng mở app lên là đã có sẵn câu trong
        đầu rồi, nên để họ gõ ngay thay vì bắt mở thêm một bảng nữa.
      */}
      {/*
        Viền 1.5 và dùng border-strong chứ không phải viền nhạt: đây là chỗ
        GÕ ĐƯỢC, mà viền chính là dấu hiệu duy nhất cho biết điều đó.
        min-h-[46px] cho đủ vùng chạm 44pt.
      */}
      <View className="mx-lg mb-md min-h-[46px] flex-row items-center gap-sm rounded-full border-[1.5px] border-border-strong bg-surface px-md">
        <Ionicons name="search-outline" size={17} color={colors.textMuted} />
        <TextInput
          /*
           * py-0 — Android tự chèn đệm trên dưới vào TextInput, không gỡ đi
           * thì chữ nằm lệch hẳn so với hai cái icon hai bên.
           */
          className="flex-1 py-0 text-[14px] text-text"
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
            className="p-0.5"
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
        <Text className="-mt-xs mx-lg mb-md text-[11.5px] text-text-muted">
          {t('search.hint')}
        </Text>
      )}

      <View className="flex-row gap-sm bg-background px-lg pb-md">
        {FILTERS.map((item) => {
          const active = type === item.value;
          return (
            <TouchableOpacity
              key={item.value || 'all'}
              onPress={() => changeFilter(item.value)}
              activeOpacity={0.8}
              // Chip cao 32, nới thêm 6 trên 6 dưới cho đủ 44
              hitSlop={{ top: 6, bottom: 6 }}
              className="rounded-full border-[1.5px] border-border-strong bg-background px-lg py-2"
              // Màu lúc đang chọn tra từ bảng màu theo loại tin nên ở style
              style={
                active && {
                  backgroundColor: colors[item.colorKey],
                  borderColor: colors[item.colorKey],
                }
              }
            >
              <Text
                className={`text-[13px] font-bold ${active ? 'text-on-primary' : 'text-text-soft'}`}
              >
                {t(item.labelKey)}
              </Text>
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity
          // ml-auto đẩy sát mép phải — không cần View đệm
          className={`ml-auto flex-row items-center gap-1.5 rounded-full border-[1.5px] px-md py-2 ${
            activeCount > 0 ? 'border-primary bg-primary' : 'border-border-strong'
          }`}
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
          <Text
            className={`text-[13px] font-bold ${
              activeCount > 0 ? 'text-on-primary' : 'text-text-soft'
            }`}
          >
            {t('home.filter')}
          </Text>
          {activeCount > 0 && (
            /*
             * Con số nhỏ nằm trên nền primary, nên nền viên lấy màu
             * chữ-trên-primary và chữ lại lấy màu primary.
             */
            <View className="h-[17px] min-w-[17px] items-center justify-center rounded-full bg-on-primary px-1">
              <Text className="text-[10.5px] font-extrabold text-primary">{activeCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/*
        Nút chuyển. Hai nửa bằng nhau, nửa đang chọn tô nền — kiểu điều khiển
        quen thuộc trên điện thoại, rõ hơn hẳn hai dòng chữ cạnh nhau.
      */}
      <View className="mx-lg mb-md flex-row rounded-full bg-surface-tint p-[3px]">
        {(['list', 'map'] as const).map((mode) => {
          const on = view === mode;
          return (
            <TouchableOpacity
              key={mode}
              className={`min-h-11 flex-1 flex-row items-center justify-center gap-1.5 rounded-full ${
                on ? 'bg-primary' : ''
              }`}
              onPress={() => setView(mode)}
              activeOpacity={0.8}
            >
              <Ionicons
                name={mode === 'list' ? 'list-outline' : 'map-outline'}
                size={15}
                color={on ? colors.onPrimary : colors.textSoft}
              />
              <Text
                className={`text-[13px] font-bold ${on ? 'text-on-primary' : 'text-text-soft'}`}
              >
                {t(mode === 'list' ? 'map.listView' : 'map.mapView')}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/*
        Chỉ hiện khi CHƯA biết vị trí, và chỉ ở chế độ danh sách.

        Biết rồi thì nút không còn việc gì để làm, để lại chỉ tổ chiếm chỗ. Còn
        bản đồ đã có nút "Gần tôi" của riêng nó ở đúng góc ngón cái với tới —
        hai nút cùng một việc trên một màn thì người dùng phải đoán chúng khác
        nhau chỗ nào.

        Bấm xong mà bị từ chối thì nút vẫn nằm đó: không báo lỗi gì, vì người
        vừa bấm "Không cho phép" là người đã biết mình vừa làm gì.
      */}
      {view === 'list' && !me && (
        <TouchableOpacity
          className="mx-lg mb-md min-h-11 flex-row items-center gap-1.5 self-start rounded-full border-[1.5px] border-border-strong px-md"
          onPress={askLocation}
          disabled={locating}
          activeOpacity={0.8}
        >
          <Ionicons name="navigate-outline" size={14} color={colors.textSoft} />
          <Text className="text-[12.5px] font-bold text-text-soft">
            {t(locating ? 'map.locating' : 'home.showDistance')}
          </Text>
        </TouchableOpacity>
      )}

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
      ) : loading && pets.length === 0 ? (
        /*
          Vòng xoay chiếm cả màn hình CHỈ khi không có gì để hiện.

          Trước đây mọi lượt tải đều che sạch màn hình, kể cả lúc đổi bộ lọc
          hay gõ tìm kiếm — kết quả cũ biến mất, thay bằng nền trống. Hai giây
          nhìn màn hình trống thấy lâu hơn năm giây mà vẫn đọc được gì đó.

          Nay còn dữ liệu thì giữ nguyên dữ liệu, chỉ đổi phần đang tải.
        */
        <View className="flex-1 items-center justify-center gap-md px-xl">
          <ActivityIndicator size="large" color={colors.teal} />
          {slow && (
            <Text className="text-center text-[12.5px] leading-[19px] text-text-muted">
              {t('home.waking')}
            </Text>
          )}
        </View>
      ) : (
        <FlatList
          /*
           * Bỏ tin đầu ra khỏi danh sách vì nó đã nằm trong thẻ nổi bật phía
           * trên. Để nguyên thì tin mới nhất hiện HAI LẦN.
           */
          data={pets.slice(1)}
          keyExtractor={(item) => item._id}
          contentContainerClassName="p-lg"
          // Chừa chỗ cho nút "+" nổi ở góc, không thì nó che tin cuối
          contentContainerStyle={{ paddingBottom: 90 }}
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
              me={me}
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
            <PetCard
              pet={item}
              me={me}
              onPress={() => navigation.navigate('Detail', { id: item._id })}
            />
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
          className="absolute bottom-xl right-xl h-[58px] w-[58px] items-center justify-center rounded-full bg-primary"
          style={shadow.float}
          onPress={() => navigation.navigate('Form', { mode: 'create' })}
          activeOpacity={0.85}
        >
          <Text className="text-[30px] font-light leading-[34px] text-on-primary">+</Text>
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

  /*
   * insets.top = chiều cao phần bị che ở trên: tai thỏ, Dynamic Island, hoặc
   * thanh trạng thái. iPhone 14 Pro khoảng 59, iPhone cũ 20, Android 24-48.
   *
   * Phải cộng vào paddingTop, không thì logo và slogan chui lên dưới đồng hồ.
   * Không hard-code một con số được vì mỗi máy một khác.
   */
  const insets = useSafeAreaInsets();

  return (
    <View
      className="flex-row items-center bg-background px-lg pb-md"
      style={{ paddingTop: insets.top + spacing.sm }}
    >
      {/*
        resizeMode để nguyên dạng prop của Image chứ không đổi thành lớp
        tiện ích: nó là prop riêng của React Native, không phải thuộc tính
        CSS, nên không có lớp tương ứng chắc chắn hoạt động.
      */}
      <Image
        source={isDark ? LOGO_MARK_DARK : LOGO_MARK}
        className="h-[42px] w-[42px]"
        resizeMode="contain"
      />

      <View className="ml-md flex-1">
        <Text className="text-[19px] font-extrabold tracking-[-0.3px] text-brand-title">
          LostPets
        </Text>
        {/* Slogan — cũng là câu dùng trên web */}
        <Text className="mt-px text-[12px] text-text-muted">{t('brand.slogan')}</Text>
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
  me,
  total,
  restCount,
  onPress,
}: {
  /** undefined khi danh sách rỗng — lúc đó không có gì để làm nổi bật. */
  pet?: Pet;
  /** Vị trí người xem, để tính khoảng cách. null khi chưa biết. */
  me: Point | null;
  total: number;
  restCount: number;
  onPress: () => void;
}) {
  const { t, lang } = useLanguage();
  const { colors, isDark, shadow } = useTheme();

  // Danh sách rỗng thì không có gì để làm nổi bật.
  if (!pet) return null;

  const status = statusStyle(pet, colors);

  /*
   * Hai ô đặc điểm, lấp chỗ trống bên phải mà vẫn nói điều có ích.
   *
   * Người ta nhận ra con vật của mình bằng ba thứ: loài, giống, MÀU. Hai cái
   * đầu đã có ở dòng trên, còn màu thì trước đây người đọc phải tự mò trong
   * câu mô tả. Khoảng cách thì thẻ tin nhỏ bên dưới vốn đã hiện, riêng thẻ
   * nổi bật lại không — mà đây mới là tin người ta đọc kỹ nhất.
   *
   * Dựng thành DANH SÁCH rồi lấy hai cái đầu, thay vì viết cứng hai ô. Lý do:
   * không phải tin nào cũng đủ dữ liệu. Tin cũ có thể bỏ trống màu, và khoảng
   * cách thì cần cả hai điều kiện — tin có ghim toạ độ, và máy đã biết vị trí
   * người xem. Viết cứng thì gặp tin thiếu là lòi ra một ô rỗng.
   */
  const away =
    me && hasPoint(pet) ? formatDistanceKm(distanceKm(me, { lat: pet.lat, lng: pet.lng })) : '';

  const facts: { key: WordKey; value: string }[] = [];
  if (pet.color) facts.push({ key: 'detail.color', value: pet.color });
  if (away) facts.push({ key: 'detail.distance', value: away });
  if (pet.area) facts.push({ key: 'detail.area', value: pet.area });

  const shown = facts.slice(0, 2);

  // Khu vực đã nằm trong ô thì bỏ dòng khu vực riêng đi, không ai muốn đọc
  // cùng một chỗ hai lần cách nhau ba dòng.
  const areaInBox = shown.some((f) => f.key === 'detail.area');

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
      <Text className="mb-md text-[12px] text-text-muted">
        {t('home.results', { n: total })}
      </Text>

      <TouchableOpacity
        // Luật 44pt: cao theo tỉ lệ ảnh
        className="mb-lg overflow-hidden rounded-lg border border-border-light bg-surface"
        style={shadow.card}
        onPress={onPress}
        activeOpacity={0.9}
      >
        <View className="relative">
          {/* API trả image là CHUỖI RỖNG khi không có ảnh, không phải null */}
          {pet.image ? (
            <Image
              source={{ uri: thumbnail(pet.image, THUMB_FEATURED) }}
              className="aspect-[16/9] w-full bg-surface-tint"
            />
          ) : (
            <View className="aspect-[16/9] w-full bg-surface-tint items-center justify-center">
              <Image
                source={isDark ? LOGO_MARK_DARK : LOGO_MARK}
                className="h-14 w-14 opacity-[0.35]"
                resizeMode="contain"
              />
            </View>
          )}

          {/* Màu nhãn chạy theo trạng thái tin nên phải ở style */}
          <View
            className="absolute left-md top-md rounded-full px-md py-[5px]"
            style={{ backgroundColor: status.color }}
          >
            <Text className="text-[11px] font-extrabold" style={{ color: status.onColor }}>
              {t(status.labelKey)}
            </Text>
          </View>
        </View>

        <View className="p-lg">
          <Text className="mb-sm text-[10px] font-extrabold tracking-[1.2px] text-accent-text">
            {t('home.featured')}
          </Text>
          <Text className="text-[20px] font-extrabold text-text" numberOfLines={1}>
            {pet.name || pet.breed}
          </Text>
          <Text className="mt-0.5 text-[13px] text-text-muted" numberOfLines={1}>
            {pet.species} · {pet.breed}
          </Text>
          {/* flex-1 cho mỗi ô: một ô thì chiếm cả hàng, hai ô thì chia đôi */}
          <View className="mt-md flex-row gap-sm">
            {shown.map((f) => (
              <View key={f.key} className="flex-1 rounded-md bg-surface-tint px-md py-sm">
                <Text className="text-[10px] font-extrabold tracking-[0.5px] text-text-muted">
                  {t(f.key)}
                </Text>
                <Text className="mt-px text-[13px] font-semibold text-text" numberOfLines={1}>
                  {f.value}
                </Text>
              </View>
            ))}
          </View>

          {!areaInBox && (
            <Text className="mt-sm text-[13px] text-text-soft" numberOfLines={1}>
              {pet.area}
            </Text>
          )}

          {!!pet.description && (
            <Text className="mt-sm text-[13px] leading-[19px] text-text-muted" numberOfLines={3}>
              {pet.description}
            </Text>
          )}

          <View className="mt-lg flex-row items-center justify-between border-t border-border-light pt-md">
            <Text className="text-[11px] text-text-muted">{timeAgo(pet.date, t, lang)}</Text>
            {/* Mũi tên vẽ bằng icon — xem lý do ở SettingsScreen */}
            <View className="flex-row items-center gap-0.5">
              <Text className="text-[13px] font-bold text-primary">{t('home.view')}</Text>
              <Ionicons name="chevron-forward" size={14} color={colors.primary} />
            </View>
          </View>
        </View>
      </TouchableOpacity>

      {/* Tiêu đề cho phần còn lại. Chỉ có đúng một tin thì không có "phần còn
          lại" nào để đặt tiêu đề cả. */}
      {restCount > 0 && (
        <Text className="mb-md text-[15px] font-extrabold text-text">{t('home.more')}</Text>
      )}
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

  if (loadingMore) {
    return (
      <View className="flex-row items-center justify-center gap-sm py-lg">
        <ActivityIndicator color={colors.teal} />
        <Text className="text-[12.5px] text-text-muted">{t('home.loadingMore')}</Text>
      </View>
    );
  }

  // Danh sách rỗng đã có EmptyState lo, đừng báo "đã hiển thị tất cả" ở đó.
  if (shown > 0 && shown >= total) {
    return (
      <View className="flex-row items-center justify-center gap-sm py-lg">
        <Text className="text-[12.5px] text-text-muted">{t('home.noMore')}</Text>
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
  const { isDark } = useTheme();

  return (
    <View className="items-center px-xl pt-[70px]">
      <View className="mb-lg h-24 w-24 items-center justify-center rounded-full bg-surface-tint">
        <Image
          source={isDark ? LOGO_MARK_DARK : LOGO_MARK}
          className="h-[58px] w-[58px] opacity-60"
          resizeMode="contain"
        />
      </View>
      <Text className="text-[16px] font-extrabold text-text">
        {t(hasError ? 'home.errorTitle' : searching ? 'search.noMatchTitle' : 'home.emptyTitle')}
      </Text>
      <Text className="mt-1.5 text-center text-[13px] leading-[19px] text-text-muted">
        {hasError
          ? t('home.errorText', { url: API_URL })
          : t(searching ? 'search.noMatchSub' : 'home.emptySub')}
      </Text>
    </View>
  );
}
