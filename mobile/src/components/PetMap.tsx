import { useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import {
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import * as Location from 'expo-location';
import { useLanguage } from '../context/language';
import { useTheme } from '../context/theme';
import { spacing, statusStyle } from '../theme';
import { directionsUrl, hasPoint, mapHtml, pickPosition } from '../map';
import type { MapPet } from '../types';

/*
 * Bản đồ của app. Một component, hai việc — chọn bằng prop mode:
 *
 *   mode="view"  hiện vị trí của tin (màn chi tiết)
 *   mode="pick"  chọn một điểm (màn đăng / sửa bài)
 *
 * Gộp hai việc vào một file vì phần khó nằm ở chỗ nói chuyện với WebView, và
 * phần đó y nhau cho cả hai. Tách ra thì phải chép lại, sửa một bên quên bên kia.
 */

/*
 * CHUYỆN CỬ CHỈ — đây là lý do bố cục trông vòng vo so với web.
 *
 * Bản đồ cần cử chỉ KÉO. Màn đăng bài và màn chi tiết lại là màn CUỘN được.
 * Đặt bản đồ kéo được vào giữa một màn cuộn thì hai bên giành nhau ngón tay:
 * người dùng muốn cuộn xuống, ngón tay chạm đúng bản đồ, trang đứng im. Trên
 * điện thoại lỗi này rất khó chịu và không có cách sửa gọn.
 *
 * Nên trong màn cuộn, bản đồ để ở chế độ TĨNH (interactive={false}) — thành
 * một tấm ảnh, không bắt cử chỉ nào. Muốn thao tác thật thì chạm vào để mở ra
 * TOÀN MÀN HÌNH, nơi không có gì tranh ngón tay nữa. Các app giao hàng, gọi xe
 * cũng làm đúng kiểu này.
 */

/*
 * Khung WebView chứa bản đồ.
 *
 * payload là một câu lệnh JavaScript dạng chuỗi, tiêm vào trang để vẽ lại.
 * Dùng chuỗi thay vì object để React so sánh được bằng ===: chuỗi không đổi
 * thì không tiêm lại, khỏi vẽ lại bản đồ vô ích.
 */
interface MapCanvasProps {
  pick?: boolean;
  interactive?: boolean;
  /** Câu lệnh JavaScript tiêm sang trang, dạng chuỗi. */
  payload: string;
  onPick?: (point: { lat: number; lng: number }) => void;
  /** Người dùng chạm vào một tin trên bản đồ. */
  onOpen?: (id: string) => void;
  /** Cha gán vào đây một hàm để chốt điểm đang ngắm. Chiều gọi là cha -> con. */
  commitRef?: MutableRefObject<(() => void) | null>;
  style?: StyleProp<ViewStyle>;
}

function MapCanvas({
  pick = false,
  interactive = true,
  payload,
  onPick,
  onOpen,
  commitRef,
  style,
}: MapCanvasProps) {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  /*
   * <object> ở đây KHÔNG phải thừa.
   *
   * Kiểu của react-native-webview 14.0.1 khai lớp là:
   *   class WebView<P = undefined> extends Component<WebViewProps & P>
   *
   * Mà trong TypeScript, "WebViewProps & undefined" rút gọn thành never —
   * nghĩa là với giá trị mặc định, component này không nhận được prop nào cả.
   * Đây là lỗi của thư viện, không phải của mình. Truyền <object> vào thay
   * cho undefined là hết, không phải ép kiểu lần nào.
   *
   * Gỡ được khi thư viện sửa; lúc đó xoá <object> ở cả hai chỗ là xong.
   */
  const ref = useRef<WebView<object>>(null);
  const [ready, setReady] = useState(false);

  const html = useMemo(() => mapHtml({ pick, interactive, isDark }), [pick, interactive, isDark]);

  // Đổi chế độ sáng/tối là HTML mới, WebView tải lại từ đầu — phải chờ tin
  // 'ready' một lần nữa, không thì tiêm lệnh vào trang chưa có window.lp.
  useEffect(() => {
    setReady(false);
  }, [html]);

  /*
   * Đưa cách "chốt điểm đang ngắm" ra ngoài cho component cha gọi.
   *
   * Gán vào ref chứ không truyền hàm xuống, vì hướng gọi là NGƯỢC: thường con
   * báo lên cha, còn đây là cha ra lệnh cho con.
   */
  useEffect(() => {
    if (!commitRef) return;
    commitRef.current = () => ref.current?.injectJavaScript('window.lp.commit(); true;');
    return () => {
      commitRef.current = null;
    };
  }, [commitRef]);

  useEffect(() => {
    if (!ready || !payload) return;
    // Thêm "true;" ở cuối: iOS cảnh báo nếu câu lệnh tiêm vào trả về undefined.
    ref.current?.injectJavaScript(`${payload}; true;`);
  }, [ready, payload]);

  const handleMessage = (event: WebViewMessageEvent) => {
    let msg;
    try {
      msg = JSON.parse(event.nativeEvent.data);
    } catch {
      return; // tin lạ, không phải của mình
    }

    if (msg.type === 'ready') setReady(true);
    else if (msg.type === 'pick') onPick?.({ lat: msg.lat, lng: msg.lng });
    else if (msg.type === 'open') onOpen?.(String(msg.id));
  };

  return (
    <View className="flex-1 overflow-hidden bg-surface-tint" style={style}>
      {/* Nền trùng với nền trang HTML, để lúc bản đồ chưa tải không loé ra
          một khung trắng ở chế độ tối. */}
      <WebView<object>
        ref={ref}
        /*
         * baseUrl BẮT BUỘC phải có, dù trang không đọc file nào bên cạnh.
         *
         * Android nạp HTML dạng chuỗi với gốc là about:blank nếu không đặt
         * baseUrl, và trang về từ about:blank thì KHÔNG được phép gọi mạng —
         * Leaflet tải từ CDN sẽ chết im, bản đồ ra một khung trống không báo gì.
         * Đặt một địa chỉ https bất kỳ là trang có gốc hợp lệ, hết lỗi.
         */
        source={{ html, baseUrl: 'https://localhost/' }}
        originWhitelist={['*']}
        onMessage={handleMessage}
        // WebView không được tự cuộn: cuộn là việc của Leaflet, hoặc của màn
        // hình bên ngoài. Bật lên thì iOS nảy lên nảy xuống rất xấu.
        scrollEnabled={false}
        // Tắt nút phóng to của Android — nó nổi lên che góc bản đồ, mà Leaflet
        // đã có nút phóng riêng rồi.
        setBuiltInZoomControls={false}
        setDisplayZoomControls={false}
        // WebView mặc định nền TRẮNG, kể cả khi trang bên trong nền tối.
        // Phải đặt lại, không thì chế độ tối nháy trắng mỗi lần mở bản đồ.
        style={{ flex: 1, backgroundColor: 'transparent' }}
      />

      {!ready && (
        /*
         * absoluteFill chứ KHÔNG phải absoluteFillObject. RN 0.88 đã bỏ hẳn
         * cái sau, mà trải một thứ undefined vào object thì JavaScript cho qua
         * im lặng — lớp phủ thôi không phủ nữa mà nằm xuống như khối thường.
         *
         * Giữ ở style chứ không dùng lớp absolute inset-0: absoluteFill là một
         * object có sẵn, dùng nó thì không phải dịch lại bốn cạnh.
         */
        <View
          className="items-center justify-center gap-sm"
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        >
          <ActivityIndicator color={colors.primary} />
          <Text className="text-[12px] text-text-muted">{t('map.loading')}</Text>
        </View>
      )}
    </View>
  );
}

export interface PetMapProps {
  /** 'view' = hiện vị trí của tin. 'pick' = chọn một điểm. */
  mode?: 'view' | 'pick';
  /*
   * mode="view": các tin cần vẽ. Tin không có toạ độ tự bị bỏ qua.
   *
   * Khai MapPet chứ không phải Pet, vì /pets/map chỉ trả về một phần trường.
   * Pet vẫn truyền vào được — nó có đủ mọi trường MapPet đòi, nên màn chi
   * tiết không phải đổi gì.
   */
  pets?: MapPet[];
  /** mode="pick": điểm đang chọn, null khi chưa chọn gì. */
  lat?: number | null;
  lng?: number | null;
  onChange?: (point: { lat: number | null; lng: number | null }) => void;
  /** mode="view": người dùng chạm vào một tin trên bản đồ. */
  onSelectPet?: (id: string) => void;
  /*
   * mode="view": tô đậm bao nhiêu tin đầu danh sách, phần còn lại làm mờ.
   *
   * 0 nghĩa là tô đậm hết — dùng khi không tìm kiếm, lúc đó mọi tin ngang
   * hàng nhau nên không có cái nào đáng nổi hơn cái nào.
   *
   * Dựa vào THỨ TỰ mảng chứ không vào điểm số, vì back-end trả về đã xếp
   * theo mức khớp rồi và cố ý không kèm điểm.
   */
  highlightTop?: number;
  /*
   * mode="view": chỗ người dùng đang đứng, để vẽ chấm "bạn ở đây" và dời
   * khung nhìn về đó.
   *
   * Việc XIN QUYỀN và ĐỌC GPS không nằm ở đây mà ở nơi gọi. Lý do: nút bấm,
   * câu báo lỗi và vòng xoay chờ đều là chuyện giao diện của màn hình ngoài;
   * component này chỉ biết vẽ.
   */
  me?: { lat: number; lng: number } | null;
  /** false = bản đồ tĩnh, không bắt cử chỉ. Bắt buộc khi nằm trong màn cuộn. */
  interactive?: boolean;
  /** Cho phép chạm vào bản đồ tĩnh để mở ra toàn màn hình. */
  expandable?: boolean;
  height?: number;
  style?: StyleProp<ViewStyle>;
}

export default function PetMap({
  mode = 'view',
  pets = [],
  lat = null,
  lng = null,
  onChange,
  onSelectPet,
  highlightTop = 0,
  me = null,
  interactive = true,
  expandable = false,
  height,
  style,
}: PetMapProps) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();

  const isPick = mode === 'pick';

  const [open, setOpen] = useState(false);
  const [locating, setLocating] = useState(false);
  const commitPoint = useRef<(() => void) | null>(null);
  const [error, setError] = useState('');

  /*
   * Có dời khung nhìn về điểm đang chọn hay không.
   *
   * Phải phân biệt, vì chấm chỉ điểm đứng yên giữa màn hình: dời khung nhìn
   * tức là dời luôn điểm chọn. Người dùng vừa tự kéo bản đồ xong mà mình lại
   * dời về giữa và phóng lại mức cũ thì công kéo của họ mất sạch.
   *
   * Chỉ dời khi điểm đến từ BÊN NGOÀI bản đồ: lúc mới mở ra, hoặc bấm "dùng
   * vị trí của tôi".
   */
  const [focus, setFocus] = useState(true);

  const point = hasPoint({ lat, lng }) ? { lat: Number(lat), lng: Number(lng) } : null;

  /*
   * Câu lệnh tiêm sang WebView.
   *
   * Chỉ gửi đúng thứ bản đồ cần. KHÔNG gửi tên hay mô tả con vật: chữ nghĩa
   * phải theo ngôn ngữ và chế độ màu người dùng đang chọn, mà trang HTML không
   * biết những thứ đó; và chữ do người dùng gõ nhét vào mã JavaScript là chỗ
   * dễ sinh lỗi nhất. Màu lấy từ statusStyle nên pin trùng màu nhãn trạng thái.
   */
  const petsPayload = useMemo(() => {
    const markers = pets.filter(hasPoint).map((p, i) => ({
      id: p._id,
      lat: Number(p.lat),
      lng: Number(p.lng),
      color: statusStyle(p, colors).color,
      dim: highlightTop > 0 && i >= highlightTop,
    }));
    // true = ôm khung nhìn quanh các điểm. Đúng lúc này vì danh sách tin vừa
    // đổi, nghĩa là người dùng vừa lọc hoặc vừa tìm kiếm.
    return `window.lp.setPets(${JSON.stringify(markers)}, true)`;
  }, [pets, colors, highlightTop]);

  /*
   * Chấm "bạn đang ở đây". Tách khỏi petsPayload vì hai thứ đổi vào những
   * lúc khác nhau: danh sách tin đổi khi lọc, còn chấm này đổi khi người
   * dùng bấm "Gần tôi". Gộp chung thì mỗi lần bấm lại vẽ lại toàn bộ pin.
   */
  const mePayload = useMemo(
    () =>
      me
        ? `window.lp.setMe(${me.lat}, ${me.lng}, '${colors.primary}')`
        : `window.lp.setMe(null, null, '${colors.primary}')`,
    [me, colors.primary],
  );

  /*
   * Bản xem trước và bản toàn màn hình cần giá trị focus KHÁC NHAU, nên dựng
   * câu lệnh theo yêu cầu chứ không dùng chung một chuỗi:
   *   - xem trước: luôn dời về điểm đã chọn, vì nó chỉ để nhìn
   *   - toàn màn hình: chỉ dời lúc mới mở, sau đó để người dùng tự kéo
   */
  const pointPayload = (withFocus: boolean) =>
    point
      ? `window.lp.setPoint(${point.lat}, ${point.lng}, '${colors.primary}', ${withFocus})`
      : `window.lp.setPoint(null, null, '${colors.primary}', false)`;

  const emit = (next: { lat: number | null; lng: number | null }, fromMap: boolean) => {
    setError('');
    setFocus(!fromMap);
    onChange?.(next);
  };

  const clear = () => {
    setError('');
    setFocus(true); // lần sau chọn lại thì dời khung nhìn về điểm mới
    onChange?.({ lat: null, lng: null });
  };

  // Mở ra là dời khung nhìn về điểm đã chọn, nếu không chấm giữa màn hình sẽ
  // nằm ở chỗ khác hẳn với điểm đang lưu.
  const openPicker = () => {
    setFocus(true);
    setOpen(true);
  };

  const useMyLocation = async () => {
    setLocating(true);
    setError('');
    try {
      const { granted } = await Location.requestForegroundPermissionsAsync();
      if (!granted) {
        setError(t('map.denied'));
        return;
      }

      /*
       * pickPosition ưu tiên vị trí hệ điều hành đã có sẵn, chỉ đo lại khi
       * không có — xem giải thích trong src/map.ts. Gọi thẳng
       * getCurrentPositionAsync thì trong nhà có khi chờ hàng chục giây.
       */
      const point = await pickPosition();
      if (!point) {
        setError(t('map.denied'));
        return;
      }

      emit(point, false);
    } catch {
      setError(t('map.denied'));
    } finally {
      setLocating(false);
    }
  };

  const canvasHeight = height ?? (isPick ? 150 : 220);

  /*
   * Bản đồ tĩnh để xem trước. Chạm vào là mở ra toàn màn hình.
   *
   * Nút chạm phải là một lớp PHỦ LÊN WebView, không được bọc WebView vào trong
   * Pressable: WebView là view của hệ điều hành, nó ăn hết cú chạm, Pressable
   * bọc ngoài sẽ không bao giờ nổ. Lớp phủ thì chắc chắn nhận được.
   *
   * Phủ lên cũng làm dòng ghi nguồn mất tính bấm được — vẫn HIỆN ra, nên vẫn
   * đúng điều khoản. Bản toàn màn hình bấm được bình thường.
   */
  /*
   * Viền nhạt: đây chỉ là khung bao quanh bản đồ, chính tấm bản đồ bên trong
   * mới là thứ cho biết chạm vào được. Không phải đường bao của một điều
   * khiển nên không cần tương phản 3:1.
   */
  const preview = (
    <View
      className="overflow-hidden rounded-md border border-border bg-surface-tint"
      style={{ height: canvasHeight }}
    >
      {/*
       * Trong lúc hộp thoại toàn màn hình đang mở, tháo bản đồ xem trước đi.
       * Để cả hai thì có hai WebView cùng chạy một bản đồ — máy yếu rất ì, mà
       * cái bên dưới đang bị che, không ai nhìn thấy.
       */}
      {!open && (
        <MapCanvas
          pick={isPick}
          interactive={false}
          payload={isPick ? pointPayload(true) : petsPayload}
        />
      )}

      {(isPick || expandable) && (
        <Pressable style={StyleSheet.absoluteFill} onPress={openPicker} />
      )}
    </View>
  );

  // ---- mode="view" --------------------------------------------------------

  if (!isPick) {
    // Bản đồ tĩnh nhúng trong màn cuộn: hiện bản xem trước, chạm để mở to.
    if (!interactive) {
      return (
        <View style={style}>
          {preview}
          <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
            <View className="flex-1 bg-background">
              <View
                className="flex-row items-center justify-between px-lg pb-sm"
                style={{ paddingTop: insets.top + spacing.sm }}
              >
                <Text className="text-[15px] font-bold text-text">{t('map.where')}</Text>
                <TouchableOpacity
                  /*
                    Nút "Xong" thứ hai, của hộp thoại chỉ xem bản đồ. Giống
                    hệt nút bên chế độ chọn chỗ: chỉ có hitSlop={10}, chữ
                    15pt cao chừng 20, cộng 10 hai đầu mới được 40pt.

                    Giữ cả hitSlop: min-h-11 lo phần thân nút, hitSlop nới
                    thêm ra ngoài mép, hai thứ cộng vào nhau chứ không thay
                    nhau — nút nằm sát góc trên nên nới thêm là có lợi.
                  */
                  className="min-h-11 justify-center px-sm"
                  onPress={() => setOpen(false)}
                  hitSlop={10}
                >
                  <Text className="text-[15px] font-bold text-primary">{t('map.done')}</Text>
                </TouchableOpacity>
              </View>
              {/* Mở to ra thì BẮT BUỘC phải kéo và phóng được, không thì mở
                  ra để làm gì — nên ép interactive chứ không đọc prop. */}
              <MapCanvas interactive payload={petsPayload} style={{ flex: 1 }} />
            </View>
          </Modal>
        </View>
      );
    }

    return (
      <View className="flex-1" style={style}>
        {/* Hai câu lệnh nối nhau bằng dấu chấm phẩy — WebView nhận một chuỗi
            JavaScript, chạy tuần tự y như viết hai dòng. */}
        <MapCanvas
          interactive
          payload={`${petsPayload};${mePayload}`}
          onOpen={onSelectPet}
          style={{ flex: 1 }}
        />
      </View>
    );
  }

  // ---- mode="pick" --------------------------------------------------------

  return (
    <View style={style}>
      <Text className="mb-sm text-[11px] font-bold tracking-[0.6px] text-text-muted">
        {t('map.label')}
      </Text>

      {preview}

      <View className="mt-sm flex-row flex-wrap items-center gap-sm">
        <TouchableOpacity className="min-h-11 justify-center rounded-sm border border-border-strong bg-surface px-md py-2" onPress={openPicker}>
          <Text className="text-[12px] font-semibold text-text-soft">{t(point ? 'map.change' : 'map.open')}</Text>
        </TouchableOpacity>

        <TouchableOpacity className="min-h-11 justify-center rounded-sm border border-border-strong bg-surface px-md py-2" onPress={useMyLocation} disabled={locating}>
          <Text className="text-[12px] font-semibold text-text-soft">{t(locating ? 'map.locating' : 'map.useMyLocation')}</Text>
        </TouchableOpacity>

        {point && (
          <TouchableOpacity className="min-h-11 justify-center px-sm py-2" onPress={clear}>
            <Text className="text-[12px] font-semibold text-danger">{t('map.clear')}</Text>
          </TouchableOpacity>
        )}
      </View>

      <Text className="mt-sm text-[11px] text-text-muted">
        {t(point ? 'map.picked' : 'map.noPoint')}
      </Text>
      <Text className="mt-xs text-[11px] leading-4 text-secret-text">
        {t('map.privacyNote')}
      </Text>
      {!!error && <Text className="mt-xs text-[12px] text-danger">{error}</Text>}

      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <View className="flex-1 bg-background">
          <View
            className="flex-row items-center justify-between px-lg pb-sm"
            style={{ paddingTop: insets.top + spacing.sm }}
          >
            <Text className="text-[15px] font-bold text-text">{t('map.label')}</Text>
            {/* Chốt chỗ đang ngắm RỒI mới đóng. Cần vậy cho trường hợp mở ra,
                không kéo gì cả, bấm Xong luôn — lúc đó moveend chưa hề nổ. */}
            <TouchableOpacity
              /*
                Nút này trước đây chỉ có hitSlop={10}, không style nào: chữ
                15pt cao chừng 20, cộng 10 hai đầu mới được 40 — dưới chuẩn.
                Luật 44pt bỏ sót vì nó tìm styles.X mà nút không gắn cái nào.
              */
              className="min-h-11 justify-center px-sm"
              onPress={() => {
                commitPoint.current?.();
                setOpen(false);
              }}
              hitSlop={10}
            >
              <Text className="text-[15px] font-bold text-primary">{t('map.done')}</Text>
            </TouchableOpacity>
          </View>

          <Text className="px-lg pb-sm text-[12px] leading-[17px] text-text-soft">
            {t('map.hint')}
          </Text>

          <MapCanvas
            pick
            interactive
            payload={pointPayload(focus)}
            onPick={(p) => emit(p, true)}
            commitRef={commitPoint}
            style={{ flex: 1 }}
          />

          {/*
            Chỉ còn nút "dùng vị trí của tôi". Nút xoá vị trí cố ý KHÔNG có ở
            đây: chấm giữa màn hình luôn là điểm đang chọn, xoá xong thì chấm
            vẫn nằm đó và lập tức chọn lại chính chỗ cũ — bấm như không bấm.
            Muốn bỏ hẳn vị trí thì đóng lại rồi xoá ở ngoài form.
          */}
          <View
            className="flex-row items-center gap-sm px-lg pt-md"
            style={{ paddingBottom: insets.bottom + spacing.sm }}
          >
            <TouchableOpacity className="min-h-11 justify-center rounded-sm border border-border-strong bg-surface px-md py-2" onPress={useMyLocation} disabled={locating}>
              <Text className="text-[12px] font-semibold text-text-soft">{t(locating ? 'map.locating' : 'map.useMyLocation')}</Text>
            </TouchableOpacity>
          </View>

          {!!error && (
            <Text className="mt-xs px-lg text-[12px] text-danger">{error}</Text>
          )}
        </View>
      </Modal>
    </View>
  );
}

/*
 * Nút "Chỉ đường" — để riêng ngoài PetMap vì chỉ màn chi tiết cần.
 *
 * Mở link chung của Google Maps, hệ điều hành tự bắt lấy rồi mở app bản đồ đã
 * cài. Không cần khoá API, không cần cài thêm gì.
 */
export function DirectionsButton({ lat, lng }: { lat: number | null; lng: number | null }) {
  const { t } = useLanguage();

  /*
   * Gán ra biến rồi mới kiểm tra, chứ không kiểm thẳng { lat, lng }.
   *
   * hasPoint thu hẹp kiểu cho CHÍNH cái nó nhận vào. Truyền một object vừa
   * tạo tại chỗ thì object đó được thu hẹp, còn hai biến lat/lng bên ngoài
   * vẫn là "number | null" — và dòng dưới lại phải ép kiểu.
   */
  const point = { lat, lng };
  if (!hasPoint(point)) return null;

  return (
    <TouchableOpacity
      className="mt-sm min-h-11 justify-center self-start rounded-sm border border-border-strong bg-surface px-md py-2"
      onPress={() => Linking.openURL(directionsUrl(point.lat, point.lng))}
    >
      <Text className="text-[13px] font-bold text-primary">{t('map.directions')}</Text>
    </TouchableOpacity>
  );
}
