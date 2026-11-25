import { useEffect, useRef } from 'react';
import { Animated, Easing, Modal, Text, View } from 'react-native';
import { useLanguage } from '../context/language';
import { darkColors } from '../theme';

/*
 * Màn chào khi mở app.
 *
 * Có hai lớp splash, đừng nhầm:
 *
 *   1. Splash GỐC của hệ điều hành — cấu hình trong app.json, là một ảnh tĩnh.
 *      Nó hiện ngay từ lúc chạm icon, trong lúc mã JavaScript còn đang nạp.
 *      Không làm hiệu ứng gì được vì lúc đó app chưa chạy.
 *      (Chạy bằng Expo Go thì lớp này là logo của Expo, không đổi được.)
 *
 *   2. Màn này — do app tự vẽ, chạy NGAY SAU lớp 1, nên làm hiệu ứng thoải mái.
 *
 * Hai lớp dùng chung ảnh và chung nền nên lúc chuyển từ lớp 1 sang lớp 2,
 * logo đứng y nguyên một chỗ — người dùng không thấy giật.
 *
 * Giữ được điều đó phải trả giá bằng ba luật, phá luật nào cũng ra đúng cái
 * lỗi "logo hiện hai lần":
 *
 *   a. Cùng MÀU NỀN, và màu đó phải là MỘT màu cố định. Lớp 1 chạy trước cả
 *      JavaScript nên nó không đọc được lựa chọn sáng/tối trong app — nó chỉ
 *      đọc được một màu viết sẵn trong app.json. Vì vậy màn này KHÔNG dùng
 *      useTheme() nữa mà lấy thẳng bảng màu tối, khớp với nền navy khai ở
 *      app.json. Đổi màu theo chế độ app là lớp 1 và lớp 2 lệch nhau ngay.
 *
 *   b. Logo ở lớp 2 phải hiện SẴN, không được mờ dần hay nở ra. Trước đây nó
 *      bắt đầu từ opacity 0 và scale 0.88: lớp 1 tắt là logo biến mất một
 *      nhịp rồi mới bung trở lại — người dùng đọc ra thành hai lần hiện.
 *      Giờ chỉ slogan và hai gạch màu là hiện dần.
 *
 *   c. Ảnh của lớp 1 phải là ảnh CHỈ CÓ VÒNG TRÒN (logo-mark-dark.png), không
 *      có chữ. Từ Android 12, màn chào của hệ điều hành cắt ảnh theo một mặt
 *      nạ HÌNH TRÒN — expo-splash-screen 58 dựng theme kế thừa
 *      Theme.SplashScreen, đúng API đó. Đưa logo-full.png vào thì vòng tròn
 *      sống sót còn chữ "LostPets" bên dưới bị cắt cụt, nhìn như ảnh hỏng.
 *      Ảnh chỉ có vòng tròn thì mặt nạ không còn gì để cắt.
 *
 * ----------------------------------------------------------------------
 * Vì sao chế độ tối dùng ảnh KHÁC
 *
 * logo-full.png đã nướng sẵn chữ LostPets màu navy đậm vào ảnh. Màu đó nằm
 * trên nền trắng thì đẹp, nhưng đặt lên nền tối gần như không đọc được, mà
 * chữ trong ảnh thì không đổi màu được.
 *
 * Nên chế độ tối dùng logo-dark.png — bản riêng do chính chủ dự án vẽ, chữ
 * màu kem nổi rõ trên nền tối. Nền xám than của ảnh gốc đã được tách thành
 * trong suốt, nên nó ăn theo nền của màn hình, không để lại khối chữ nhật.
  *
 * -----------------------------------------------------------------------
 * Vì sao bọc trong Modal?
 *
 * Trước đây màn này là một View phủ lên bằng position: 'absolute'. Cách đó
 * phụ thuộc vào khung cha và vào thứ tự xếp lớp (zIndex trên iOS, elevation
 * trên Android) — sai một mắt xích là nó rơi xuống dưới hoặc bị danh sách đâm
 * xuyên lên, đúng như lỗi đã gặp.
 *
 * Modal thì khác hẳn: hệ điều hành mở hẳn một CỬA SỔ RIÊNG đè lên toàn bộ app.
 * Không còn khái niệm khung cha hay thứ tự lớp nữa, nên không thể dính vào
 * trang chủ được.
 */

/*
 * Giữ logo đứng yên bao lâu trước khi rút đi.
 *
 * Hạ từ 1100 xuống 450. Cả màn chào trước đây ngốn 2,2 giây cố định — và đó
 * là 2,2 giây người dùng KHÔNG làm gì được, cộng thêm vào mọi thứ chậm khác.
 * Nay còn chừng 1,57 giây, vẫn đủ một nhịp để nhận ra logo chứ không hụt.
 *
 * Không rút ngắn thêm nữa: dưới khoảng 300ms thì logo chớp một cái rồi biến,
 * nhìn như app lỗi chứ không ra màn chào.
 */
const HOLD_MS = 450;

// logo-dark.png gốc 471x591. Giữ đúng tỉ lệ để chữ và hình không bị bóp méo.
// Chỉ còn bản tối: màn chào nay luôn nền navy, xem luật (a) ở đầu file.
const DARK_WIDTH = 220;
const DARK_HEIGHT = Math.round((DARK_WIDTH * 591) / 471);

export default function SplashScreen({ onFinish }: { onFinish: () => void }) {
  const { t } = useLanguage();

  /*
   * Bảng màu CỐ ĐỊNH, không theo chế độ của app — xem luật (a) ở đầu file.
   * Màn chào là một tấm biển thương hiệu, không phải một màn hình của app:
   * nó phải trùng khít với nền navy mà app.json khai cho lớp 1, mà app.json
   * thì chỉ nhận được đúng một màu.
   */
  const colors = darkColors;

  /*
   * useRef chứ không useState: giá trị animation đổi 60 lần mỗi giây.
   * Dùng state thì mỗi khung hình là một lần render lại — giật ngay.
   * Animated.Value đổi thẳng ở tầng native, không đụng tới React.
   */
  // Bắt đầu ở đúng trạng thái cuối của màn chào gốc: hiện đủ, đúng cỡ.
  // Xem luật (b) ở đầu file — đổi hai số này là lỗi "logo hiện hai lần" quay lại.
  const logoScale = useRef(new Animated.Value(1)).current;
  const tailOpacity = useRef(new Animated.Value(0)).current;

  // Độ mờ của TOÀN BỘ nội dung, dùng ở bước cuối để rút đi.
  // Nền nằm ngoài, giữ đặc từ đầu đến cuối.
  const contentOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      // Logo đã nằm sẵn đó từ màn chào gốc, không diễn lại. Chỉ hai gạch màu
      // và slogan là hiện ra thêm — đó là phần lớp 1 không vẽ được.
      Animated.timing(tailOpacity, {
        toValue: 1,
        duration: 360,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),

      Animated.delay(HOLD_MS),

      // Nội dung rút đi, kèm phóng to nhẹ cho đỡ cụt
      Animated.parallel([
        Animated.timing(contentOpacity, {
          toValue: 0,
          duration: 340,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(logoScale, {
          toValue: 1.08,
          duration: 340,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    ]).start(({ finished }) => {
      // Chỉ gọi khi chạy hết. Bị ngắt giữa chừng (app xuống nền) thì bỏ qua.
      if (finished) onFinish();
    });
  }, [logoScale, tailOpacity, contentOpacity, onFinish]);

  return (
    <Modal
      visible
      // animationType="none": Modal không tự làm hiệu ứng. Để nó tự mờ đi thì
      // trang chủ phía sau lại lộ ra giữa chừng — đúng cái lỗi cần tránh.
      animationType="none"
      // Android: cho cửa sổ trùm lên cả thanh trạng thái, không chừa vệt xám.
      statusBarTranslucent
      // Android có nút Back vật lý. Không bắt thì bấm Back lúc đang chào là
      // thoát app. Để hàm rỗng nghĩa là bỏ qua, màn chào tự tắt theo hiệu ứng.
      onRequestClose={() => {}}
    >
      {/*
        View thường, KHÔNG phải Animated.View: nền này không bao giờ mờ.

        Mọi thứ xếp theo dòng chảy bình thường, không position: 'absolute' ở
        bất cứ đâu. Đơn giản thì không có chỗ cho lỗi vị trí chen vào.
      */}
      {/*
        MÀU Ở ĐÂY LẤY THẲNG TỪ BẢNG MÀU TỐI, KHÔNG QUA useTheme() VÀ KHÔNG QUA
        LỚP TIỆN ÍCH.

        Không qua useTheme(): màn chào phải trùng màu với lớp 1, mà lớp 1 chỉ
        nhận đúng một màu viết sẵn trong app.json — xem luật (a) ở đầu file.

        Không qua lớp tiện ích: màn chào vẽ ra ở khoảnh khắc đầu tiên của app,
        trước khi ThemeProvider kịp báo cho NativeWind biết chế độ nào. Mà nó
        lại nằm trong Modal — một cây giao diện riêng ở tầng hệ điều hành —
        nên đã gắn rồi thì không nhận lại giá trị mới nữa, kẹt màu sai suốt
        thời gian hiện.

        Các màn khác không dính vì chúng vẽ sau khi mọi thứ đã yên vị. Bảng
        lọc cũng là Modal và vẫn đúng, vì nó chỉ mở khi người dùng bấm.
      */}
      <View
        className="flex-1 items-center justify-center"
        style={{ backgroundColor: colors.background }}
      >
        {/* opacity do Animated giữ, đổi từng khung hình -> phải ở style */}
        <Animated.View className="items-center" style={{ opacity: contentOpacity }}>
          <Animated.Image
            source={require('../../assets/logo-dark.png')}
            /*
              Kích thước logo là hằng số tính sẵn ở đầu file, không phải lớp
              tiện ích cố định. Bề ngang 220 khớp với imageWidth 220 khai cho
              lớp 1 trong app.json, nên vòng tròn hai lớp ra cùng cỡ.
            */
            style={{
              width: DARK_WIDTH,
              height: DARK_HEIGHT,
              resizeMode: 'contain',
              transform: [{ scale: logoScale }],
            }}
          />

          <Animated.View className="mt-lg items-center" style={{ opacity: tailOpacity }}>
            {/* Hai gạch nhỏ lấy đúng cặp màu hai nửa của logo */}
            <View className="flex-row gap-1.5">
              {/* Hai màu này giống nhau ở cả hai chế độ nên class hoá cũng
                  đúng, nhưng để cùng một lối với phần trên cho khỏi rối. */}
              <View className="h-1 w-[26px] rounded-sm" style={{ backgroundColor: colors.orange }} />
              <View className="h-1 w-[26px] rounded-sm" style={{ backgroundColor: colors.teal }} />
            </View>

            <Text className="mt-md text-[14px]" style={{ color: colors.textMuted }}>
              {t('brand.slogan')}
            </Text>
          </Animated.View>
        </Animated.View>
      </View>
    </Modal>
  );
}
