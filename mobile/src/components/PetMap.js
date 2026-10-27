import { useEffect, useMemo, useRef, useState } from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { useLanguage } from '../context/language';
import { createThemedStyles, useTheme, useThemedStyles } from '../context/theme';
import { radius, spacing, statusStyle } from '../theme';
import { directionsUrl, hasPoint, mapHtml } from '../map';
import PetCard from './PetCard';

/*
 * Bản đồ của app. Một component, hai việc — chọn bằng prop mode:
 *
 *   mode="view"  hiện pin của nhiều tin (trang chủ, màn chi tiết)
 *   mode="pick"  chọn một điểm (màn đăng / sửa bài)
 *
 * Gộp hai việc vào một file vì phần khó nằm ở chỗ nói chuyện với WebView, và
 * phần đó y nhau cho cả hai. Tách ra thì phải chép lại, sửa một bên quên bên kia.
 *
 * Tương đương PetMap.vue + MapPicker.vue bên web.
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
function MapCanvas({ pick = false, interactive = true, payload, onSelect, onPick, style }) {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const styles = useThemedStyles(themedStyles);
  const ref = useRef(null);
  const [ready, setReady] = useState(false);

  const html = useMemo(() => mapHtml({ pick, interactive, isDark }), [pick, interactive, isDark]);

  // Đổi chế độ sáng/tối là HTML mới, WebView tải lại từ đầu — phải chờ tin
  // 'ready' một lần nữa, không thì tiêm lệnh vào trang chưa có window.lp.
  useEffect(() => {
    setReady(false);
  }, [html]);

  useEffect(() => {
    if (!ready || !payload) return;
    // Thêm "true;" ở cuối: iOS cảnh báo nếu câu lệnh tiêm vào trả về undefined.
    ref.current?.injectJavaScript(`${payload}; true;`);
  }, [ready, payload]);

  const handleMessage = (event) => {
    let msg;
    try {
      msg = JSON.parse(event.nativeEvent.data);
    } catch {
      return; // tin lạ, không phải của mình
    }

    if (msg.type === 'ready') setReady(true);
    else if (msg.type === 'select') onSelect?.(msg.id);
    else if (msg.type === 'blur') onSelect?.(null);
    else if (msg.type === 'pick') onPick?.({ lat: msg.lat, lng: msg.lng });
  };

  return (
    <View style={[styles.canvas, style]}>
      <WebView
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
        style={styles.web}
      />

      {!ready && (
        <View style={styles.loading} pointerEvents="none">
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.loadingText}>{t('map.loading')}</Text>
        </View>
      )}
    </View>
  );
}

export default function PetMap({
  mode = 'view',
  // mode="view"
  pets = [],
  onOpenPet,
  // mode="pick"
  lat = null,
  lng = null,
  onChange,
  // dùng chung
  interactive = true,
  expandable = false,
  height,
  style,
}) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const styles = useThemedStyles(themedStyles);
  const insets = useSafeAreaInsets();

  const isPick = mode === 'pick';

  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState('');

  /*
   * Có đưa khung nhìn về điểm đang chọn hay không.
   *
   * Phải phân biệt, nếu không bản đồ nhảy về giữa sau MỖI lần kéo pin — kéo ra
   * mép rồi bản đồ tự giật lại, không ai chỉnh được. Chỉ đưa khung nhìn về khi
   * điểm đến từ BÊN NGOÀI bản đồ: lần đầu mở ra, hoặc bấm "dùng vị trí của tôi".
   */
  const [focus, setFocus] = useState(true);

  const point = hasPoint({ lat, lng }) ? { lat: Number(lat), lng: Number(lng) } : null;

  // Tin không có toạ độ thì không vẽ được. Đếm lại để nói thật với người dùng
  // là bản đồ đang thiếu bao nhiêu tin, thay vì im lặng bỏ qua.
  const located = useMemo(() => pets.filter(hasPoint), [pets]);
  const missing = pets.length - located.length;

  /*
   * Chỉ gửi sang WebView đúng bốn thứ bản đồ cần: id, toạ độ, màu.
   *
   * KHÔNG gửi tên hay mô tả con vật. Hai lý do: chữ nghĩa phải theo ngôn ngữ
   * và chế độ màu người dùng đang chọn, mà trang HTML không biết những thứ đó;
   * và chữ do người dùng gõ nhét vào mã JavaScript là chỗ dễ sinh lỗi nhất.
   * Màu lấy từ statusStyle nên pin trùng đúng màu nhãn trạng thái trong app.
   */
  const payload = useMemo(() => {
    if (isPick) {
      const color = colors.primary;
      if (!point) return `window.lp.setPoint(null, null, '${color}', false)`;
      return `window.lp.setPoint(${point.lat}, ${point.lng}, '${color}', ${focus})`;
    }

    const markers = located.map((p) => ({
      id: p._id,
      lat: Number(p.lat),
      lng: Number(p.lng),
      color: statusStyle(p, colors).color,
    }));
    return `window.lp.setPets(${JSON.stringify(markers)})`;
  }, [isPick, point?.lat, point?.lng, focus, located, colors]);

  const emit = (next, fromMap) => {
    setError('');
    setFocus(!fromMap);
    onChange?.(next);
  };

  const clear = () => {
    setError('');
    setFocus(true); // lần sau chọn lại thì đưa khung nhìn về điểm mới
    onChange?.({ lat: null, lng: null });
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
       * Độ chính xác Balanced ~100m là đủ, không cần High.
       *
       * Back-end làm tròn toạ độ về lưới ~550m trước khi lưu, nên đo chính xác
       * tới từng mét cũng bị làm mờ đi hết. Đổi lại Balanced lấy được vị trí
       * nhanh hơn nhiều và đỡ tốn pin — High bắt bật GPS thật, ngoài trời mất
       * vài giây, trong nhà có khi không ra.
       */
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      emit(
        {
          // 6 chữ số ~ 10cm. Dài hơn là vô ích.
          lat: Number(pos.coords.latitude.toFixed(6)),
          lng: Number(pos.coords.longitude.toFixed(6)),
        },
        false,
      );
    } catch {
      setError(t('map.denied'));
    } finally {
      setLocating(false);
    }
  };

  const selected = selectedId ? located.find((p) => p._id === selectedId) : null;

  const canvasHeight = height ?? (isPick ? 150 : 220);

  /*
   * Bản đồ tĩnh để xem trước. Chạm vào là mở ra toàn màn hình.
   *
   * Nút chạm phải là một lớp PHỦ LÊN WebView, không được bọc WebView vào trong
   * Pressable: WebView là view của hệ điều hành, nó ăn hết cú chạm, Pressable
   * bọc ngoài sẽ không bao giờ nổ. Lớp phủ thì chắc chắn nhận được.
   *
   * Phủ lên cũng làm dòng ghi nguồn OpenStreetMap mất tính bấm được — vẫn HIỆN
   * ra, nên vẫn đúng điều khoản của họ. Bản toàn màn hình bấm được bình thường.
   */
  const preview = (
    <View style={[styles.previewBox, { height: canvasHeight }]}>
      {/*
       * Trong lúc hộp thoại toàn màn hình đang mở, tháo bản đồ xem trước đi.
       * Để cả hai thì có hai WebView cùng chạy một bản đồ — máy yếu rất ì, mà
       * cái bên dưới đang bị che, không ai nhìn thấy.
       */}
      {!open && <MapCanvas pick={isPick} interactive={false} payload={payload} />}

      {(isPick || expandable) && (
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(true)} />
      )}
    </View>
  );

  // ---- mode="view" --------------------------------------------------------

  if (!isPick) {
    const canvas = (
      <View style={styles.viewWrap}>
        <MapCanvas
          interactive={interactive}
          payload={payload}
          onSelect={onOpenPet ? setSelectedId : undefined}
          style={styles.fill}
        />

        {missing > 0 && (
          <View style={styles.chip} pointerEvents="none">
            <Text style={styles.chipText}>{t('map.withoutCoords', { n: missing })}</Text>
          </View>
        )}

        {located.length === 0 && (
          <View style={styles.empty} pointerEvents="none">
            <Text style={styles.emptyText}>{t('map.noLocated')}</Text>
          </View>
        )}

        {/* Bấm vào pin thì hiện thẻ tin ở đáy — dùng đúng thẻ của danh sách,
            nên không phải dịch hay tô màu lại lần nữa. */}
        {selected && (
          <View style={[styles.selected, { paddingBottom: insets.bottom + spacing.sm }]}>
            <PetCard
              pet={selected}
              onPress={() => {
                setSelectedId(null);
                onOpenPet?.(selected._id);
              }}
            />
            <TouchableOpacity
              style={styles.selectedClose}
              onPress={() => setSelectedId(null)}
              hitSlop={10}
            >
              <Text style={styles.selectedCloseText}>✕</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );

    // Bản đồ tĩnh nhúng trong màn cuộn: hiện bản xem trước, chạm để mở to.
    if (!interactive) {
      return (
        <View style={style}>
          {preview}
          <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
            <View style={styles.modal}>
              <View style={[styles.modalHead, { paddingTop: insets.top + spacing.sm }]}>
                <Text style={styles.modalTitle}>{t('map.where')}</Text>
                <TouchableOpacity onPress={() => setOpen(false)} hitSlop={10}>
                  <Text style={styles.modalDone}>{t('map.done')}</Text>
                </TouchableOpacity>
              </View>
              {canvas}
            </View>
          </Modal>
        </View>
      );
    }

    return <View style={[styles.fill, style]}>{canvas}</View>;
  }

  // ---- mode="pick" --------------------------------------------------------

  return (
    <View style={style}>
      <Text style={styles.label}>{t('map.label')}</Text>

      {preview}

      <View style={styles.row}>
        <TouchableOpacity style={styles.btn} onPress={() => setOpen(true)}>
          <Text style={styles.btnText}>{t(point ? 'map.change' : 'map.open')}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.btn} onPress={useMyLocation} disabled={locating}>
          <Text style={styles.btnText}>{t(locating ? 'map.locating' : 'map.useMyLocation')}</Text>
        </TouchableOpacity>

        {point && (
          <TouchableOpacity style={styles.btnPlain} onPress={clear}>
            <Text style={styles.btnPlainText}>{t('map.clear')}</Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.state}>{t(point ? 'map.picked' : 'map.noPoint')}</Text>
      <Text style={styles.privacy}>{t('map.privacyNote')}</Text>
      {!!error && <Text style={styles.error}>{error}</Text>}

      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={styles.modal}>
          <View style={[styles.modalHead, { paddingTop: insets.top + spacing.sm }]}>
            <Text style={styles.modalTitle}>{t('map.label')}</Text>
            <TouchableOpacity onPress={() => setOpen(false)} hitSlop={10}>
              <Text style={styles.modalDone}>{t('map.done')}</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.modalHint}>{t('map.hint')}</Text>

          <MapCanvas pick interactive payload={payload} onPick={(p) => emit(p, true)} style={styles.fill} />

          <View style={[styles.modalFoot, { paddingBottom: insets.bottom + spacing.sm }]}>
            <TouchableOpacity style={styles.btn} onPress={useMyLocation} disabled={locating}>
              <Text style={styles.btnText}>{t(locating ? 'map.locating' : 'map.useMyLocation')}</Text>
            </TouchableOpacity>

            {point && (
              <TouchableOpacity style={styles.btnPlain} onPress={clear}>
                <Text style={styles.btnPlainText}>{t('map.clear')}</Text>
              </TouchableOpacity>
            )}
          </View>

          {!!error && <Text style={[styles.error, styles.modalError]}>{error}</Text>}
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
export function DirectionsButton({ lat, lng }) {
  const { t } = useLanguage();
  const styles = useThemedStyles(themedStyles);

  if (!hasPoint({ lat, lng })) return null;

  return (
    <TouchableOpacity
      style={styles.directions}
      onPress={() => Linking.openURL(directionsUrl(lat, lng))}
    >
      <Text style={styles.directionsText}>{t('map.directions')}</Text>
    </TouchableOpacity>
  );
}

const themedStyles = createThemedStyles((colors, shadow) =>
  StyleSheet.create({
      fill: { flex: 1 },

    canvas: {
      flex: 1,
      overflow: 'hidden',
      // Nền trùng với nền trang HTML, để lúc bản đồ chưa tải không loé ra một
      // khung trắng ở chế độ tối.
      backgroundColor: colors.surfaceTint,
    },
    // WebView mặc định nền TRẮNG, kể cả khi trang bên trong nền tối. Phải đặt
    // lại, không thì chế độ tối nháy trắng mỗi lần mở bản đồ.
    web: { flex: 1, backgroundColor: 'transparent' },

    loading: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
    },
    loadingText: { color: colors.textMuted, fontSize: 12 },

    previewBox: {
      borderRadius: radius.md,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceTint,
    },

    // --- mode="view" ---
    viewWrap: { flex: 1, backgroundColor: colors.surfaceTint },

    chip: {
      position: 'absolute',
      top: spacing.sm,
      left: spacing.sm,
      right: spacing.sm,
      backgroundColor: colors.surface,
      borderRadius: radius.full,
      paddingVertical: 6,
      paddingHorizontal: spacing.md,
      ...shadow.card,
    },
    chipText: { color: colors.textSoft, fontSize: 11, textAlign: 'center' },

    empty: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.xl,
    },
    emptyText: {
      color: colors.textSoft,
      fontSize: 13,
      textAlign: 'center',
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      padding: spacing.md,
      overflow: 'hidden',
    },

    selected: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      paddingHorizontal: spacing.md,
    },
    selectedClose: {
      position: 'absolute',
      top: -6,
      right: spacing.md - 6,
      width: 28,
      height: 28,
      borderRadius: radius.full,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      ...shadow.card,
    },
    selectedCloseText: { color: colors.textSoft, fontSize: 13, fontWeight: '700' },

    // --- mode="pick" ---
    label: {
      color: colors.textMuted,
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.6,
      marginBottom: spacing.sm,
    },

    row: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: spacing.sm,
      marginTop: spacing.sm,
    },
    btn: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.sm,
      paddingVertical: 8,
      paddingHorizontal: spacing.md,
      backgroundColor: colors.surface,
    },
    btnText: { color: colors.textSoft, fontSize: 12, fontWeight: '600' },
    btnPlain: { paddingVertical: 8, paddingHorizontal: spacing.sm },
    btnPlainText: { color: colors.danger, fontSize: 12, fontWeight: '600' },

    state: { color: colors.textMuted, fontSize: 11, marginTop: spacing.sm },
    privacy: { color: colors.secretText, fontSize: 11, lineHeight: 16, marginTop: spacing.xs },
    error: { color: colors.danger, fontSize: 12, marginTop: spacing.xs },

    // --- hộp thoại toàn màn hình ---
    modal: { flex: 1, backgroundColor: colors.background },
    modalHead: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.sm,
    },
    modalTitle: { color: colors.text, fontSize: 15, fontWeight: '700' },
    modalDone: { color: colors.primary, fontSize: 15, fontWeight: '700' },
    modalHint: {
      color: colors.textSoft,
      fontSize: 12,
      lineHeight: 17,
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.sm,
    },
    modalFoot: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
    },
    modalError: { paddingHorizontal: spacing.lg },

    directions: {
      alignSelf: 'flex-start',
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.sm,
      paddingVertical: 8,
      paddingHorizontal: spacing.md,
      backgroundColor: colors.surface,
      marginTop: spacing.sm,
    },
    directionsText: { color: colors.primary, fontSize: 13, fontWeight: '700' },
  }),
);
