import { useEffect, useRef } from 'react';
import { Animated, Easing, Modal, Text, View } from 'react-native';
import { useLanguage } from '../context/language';
import { useTheme } from '../context/theme';

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
 *   a. Cùng MÀU NỀN. Đây là luật khó nhất, vì hai lớp đọc được hai thứ
 *      KHÁC NHAU và không lớp nào đọc được thứ của lớp kia:
 *
 *        lớp 1  chạy trước cả JavaScript, trước cả khi app kịp sống. Nó chỉ
 *               đọc được tài nguyên của hệ điều hành, tức là cài đặt sáng/tối
 *               của ĐIỆN THOẠI. app.json khai cả bản sáng lẫn bản dark, hệ
 *               điều hành tự chọn.
 *
 *        lớp 2  là React, đọc được lựa chọn trong app — thứ lớp 1 không với
 *               tới, vì nó nằm trong ổ đĩa của app mà lúc đó app chưa chạy.
 *
 *      Từng thử ép lớp 2 theo một màu cố định cho khớp lớp 1. Hỏng cả hai
 *      chiều: cố định navy thì người để app sáng bị chào bằng màn tối, cố
 *      định trắng thì người để app TỐI bị chào bằng màn trắng — chói mắt, và
 *      đó chính là lỗi vừa báo.
 *
 *      Nên lớp 2 đi theo lựa chọn trong app, đúng thứ nó đọc được. Hai lớp
 *      khớp nhau khi cài đặt máy và lựa chọn trong app cùng chiều — là trường
 *      hợp của gần như mọi người, vì ai để máy tối thường cũng để app tối.
 *
 *      Ai cố ý để ngược chiều nhau thì thấy một bước đổi màu ở chỗ giao giữa
 *      hai lớp. Không xoá được bước đó bằng mã JavaScript: muốn xoá phải viết
 *      mã native đọc ổ đĩa của app trước khi cửa sổ mở, mà cửa sổ thì do hệ
 *      điều hành dựng lúc app còn chưa khởi động.
 *
 *   b. Logo ở lớp 2 phải hiện SẴN, không được mờ dần hay nở ra. Trước đây nó
 *      bắt đầu từ opacity 0 và scale 0.88: lớp 1 tắt là logo biến mất một
 *      nhịp rồi mới bung trở lại — người dùng đọc ra thành hai lần hiện.
 *      Giờ chỉ slogan và hai gạch màu là hiện dần.
 *
 *   c. Ảnh của lớp 1 phải là ảnh CHỈ CÓ VÒNG TRÒN (logo-mark.png), không có
 *      chữ. Từ Android 12, màn chào của hệ điều hành cắt ảnh theo một mặt nạ
 *      HÌNH TRÒN — expo-splash-screen 58 dựng theme kế thừa
 *      Theme.SplashScreen, đúng API đó. Đưa logo-full.png vào thì vòng tròn
 *      sống sót còn chữ "LostPets" bên dưới bị cắt cụt, nhìn như ảnh hỏng.
 *      Ảnh chỉ có vòng tròn thì mặt nạ không còn gì để cắt.
 *
 *   d. Vòng tròn của lớp 2 phải CHẠY TỪ chỗ lớp 1 để nó về. Android tự quyết
 *      cỡ icon màn chào, không cho đặt, nên hai vòng tròn không thể bằng nhau
 *      sẵn — lớp 1 nhỏ hơn và nằm giữa màn hình, lớp 2 to hơn và nằm cao hơn
 *      vì còn chừa chỗ cho chữ với slogan bên dưới. Cắt phụt một cái là mắt
 *      đọc ra "hai tấm ảnh". Cho nó phóng và trượt lên trong 320ms thì mắt
 *      đọc ra "một vòng tròn đang nở" — vẫn một vật, không phải hai.
 *
 * ----------------------------------------------------------------------
 * Vì sao chế độ tối dùng ẢNH KHÁC
 *
 * logo-full.png đã nướng sẵn chữ LostPets màu navy đậm vào ảnh. Màu đó đẹp
 * trên nền trắng nhưng gần như không đọc được trên nền tối, mà chữ nằm trong
 * ảnh thì không đổi màu được.
 *
 * Nên chế độ tối dùng logo-dark.png — bản riêng, chữ màu kem nổi rõ trên nền
 * tối. Nền xám than của ảnh gốc đã được tách thành trong suốt nên nó ăn theo
 * nền màn hình, không để lại khối chữ nhật.
 *
 * Lớp 1 cũng vậy: app.json khai logo-mark.png cho nền sáng và
 * logo-mark-dark.png cho nền tối.
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

// logo-full.png gốc 471x590, logo-dark.png gốc 471x591 — cùng tỉ lệ nên dùng
// chung một bề ngang. Giữ đúng tỉ lệ để chữ và hình không bị bóp méo.
const LOGO_WIDTH = 220;
const LOGO_HEIGHT = Math.round((LOGO_WIDTH * 590) / 471);

/*
 * Hai số để nối liền lớp 1 với lớp 2 — xem luật (d) ở đầu file.
 *
 * START_SCALE: vòng tròn của lớp 1 nhỏ hơn, và nhỏ hơn đúng HAI PHẦN BA.
 *
 * Con số này ĐO ĐƯỢC chứ không phỏng đoán. expo-splash-screen dựng ảnh cho
 * lớp 1 trong một tấm 288x288dp rồi đặt logo 220dp vào giữa — xem
 * android/app/src/main/res/drawable-mdpi/splashscreen_logo.png sau khi
 * prebuild, khung bao của phần không trong suốt là 216x220dp.
 *
 * Nhưng Android chỉ để lộ ra VÒNG TRÒN GIỮA bằng 2/3 tấm ảnh, tức 192dp;
 * phần ngoài bị mặt nạ cắt. Nên logo hiện ra trên màn hình chỉ còn
 *
 *     216 * 192/288 = 144dp,  so với 220dp của lớp 2 là 0.655
 *
 * Lần đầu tôi đặt 0.87 vì tưởng cả tấm ảnh hiện ra. Lệch 30% — đủ để mắt
 * thấy logo nhảy một cái, đúng thứ đang cố bỏ. Đo rồi mới đúng.
 *
 * Tỉ lệ 2/3 là hằng số trong đặc tả màn chào Android 12, không phải thứ
 * riêng của máy nào, nên nó đúng trên mọi máy Android 12 trở lên.
 *
 * START_SHIFT: lớp 1 đặt vòng tròn ngay giữa màn hình. Lớp 2 thì xếp cả cụm
 * (logo + hai gạch + slogan) vào giữa, nên riêng vòng tròn bị đẩy lên cao hơn.
 * Tính ra khoảng cách đó:
 *
 *   vòng tròn chiếm 479/590 chiều cao ảnh -> tâm vòng tròn cách đỉnh ảnh
 *     LOGO_HEIGHT * 479/590 / 2 ~ 112dp
 *   cả cụm cao  = 276 (ảnh) + 16 (mt-lg) + 4 (gạch) + 12 (mt-md) + 20 (slogan)
 *               = 328dp, đặt giữa nên nửa trên là 164dp
 *   lệch = 164 - 112 = 52dp  -> bắt đầu thấp hơn 52dp rồi trượt lên 0
 */
const START_SCALE = 0.655;
const START_SHIFT = 52;

export default function SplashScreen({ onFinish }: { onFinish: () => void }) {
  const { t } = useLanguage();

  /*
   * Lấy cả màu lẫn cờ giảm chuyển động từ useTheme.
   *
   * Lấy màu ở đây AN TOÀN, dù màn này nằm trong Modal — một cây giao diện
   * riêng ở tầng hệ điều hành, gắn rồi thì không nhận giá trị mới nữa. An
   * toàn vì ThemeProvider chặn không vẽ gì cho tới khi đọc xong ổ đĩa, nên
   * lúc màn chào gắn vào thì chế độ sáng/tối đã biết chắc, không còn đổi.
   *
   * Trước khi có cái chặn đó thì đúng là không lấy được: màn chào vẽ ra ở
   * khoảnh khắc đầu tiên, lúc chưa đọc xong lựa chọn của người dùng, nên nó
   * lấy nhầm mặc định rồi kẹt màu sai suốt thời gian hiện.
   */
  const { colors, isDark, reduceMotion } = useTheme();

  /*
   * useRef chứ không useState: giá trị animation đổi 60 lần mỗi giây.
   * Dùng state thì mỗi khung hình là một lần render lại — giật ngay.
   * Animated.Value đổi thẳng ở tầng native, không đụng tới React.
   */
  /*
   * Bắt đầu ở đúng chỗ màn chào gốc để nó lại: cùng cỡ, cùng vị trí, HIỆN ĐỦ.
   *
   * Không có opacity ở đây là cố ý — xem luật (b) ở đầu file. Logo chỉ được
   * phóng và trượt, không được mờ đi rồi hiện lại, vì mờ là mắt đọc ra thành
   * hai lần xuất hiện.
   */
  const logoScale = useRef(new Animated.Value(START_SCALE)).current;
  const logoShift = useRef(new Animated.Value(START_SHIFT)).current;
  const tailOpacity = useRef(new Animated.Value(0)).current;

  // Độ mờ của TOÀN BỘ nội dung, dùng ở bước cuối để rút đi.
  // Nền nằm ngoài, giữ đặc từ đầu đến cuối.
  const contentOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    /*
     * Bật "giảm chuyển động": bỏ hết hiệu ứng, chỉ giữ tấm biển đứng yên.
     *
     * Đặt thẳng mọi giá trị về trạng thái cuối — logo đúng cỡ đúng chỗ, hai
     * gạch và slogan hiện đủ — rồi đợi một nhịp cho người ta đọc kịp, xong
     * tắt. Không phóng, không trượt, không mờ dần.
     *
     * Vẫn phải đợi HOLD_MS chứ không gọi onFinish() ngay: tắt phụt một cái
     * thì người dùng thấy màn hình chớp, cũng là một loại chuyển động đột
     * ngột — đúng thứ họ bật tuỳ chọn này để tránh.
     *
     * setTimeout chứ không Animated.delay: Animated.delay vẫn dựng cả bộ máy
     * animation lên chỉ để không làm gì, mà ở đây không có gì để chạy cả.
     */
    if (reduceMotion) {
      logoScale.setValue(1);
      logoShift.setValue(0);
      tailOpacity.setValue(1);

      const hen = setTimeout(onFinish, HOLD_MS + 320);
      return () => clearTimeout(hen);
    }

    Animated.sequence([
      /*
        Nối liền từ màn chào gốc: vòng tròn phóng và trượt lên đúng chỗ của
        nó. Logo KHÔNG mờ đi rồi hiện lại — nó đã nằm sẵn đó, chỉ di chuyển.
        Xem luật (d) ở đầu file.
      */
      Animated.parallel([
        Animated.timing(logoScale, {
          toValue: 1,
          duration: 320,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(logoShift, {
          toValue: 0,
          duration: 320,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),

      // Hai gạch màu và slogan theo sau, trễ một nhịp cho có lớp lang.
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
  }, [logoScale, logoShift, tailOpacity, contentOpacity, reduceMotion, onFinish]);

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
        MÀU Ở ĐÂY LẤY THẲNG TỪ useTheme(), KHÔNG QUA LỚP TIỆN ÍCH.

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
            source={
              isDark
                ? require('../../assets/logo-dark.png')
                : require('../../assets/logo-full.png')
            }
            /*
              Kích thước logo là hằng số tính sẵn ở đầu file, không phải lớp
              tiện ích cố định.

              translateY đứng TRƯỚC scale trong mảng: React Native nhân ma
              trận theo đúng thứ tự này, nên phóng trước rồi mới dời. Nhờ vậy
              START_SHIFT là 52dp thật, không bị nhân với tỉ lệ phóng.
            */
            style={{
              width: LOGO_WIDTH,
              height: LOGO_HEIGHT,
              resizeMode: 'contain',
              transform: [{ translateY: logoShift }, { scale: logoScale }],
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
