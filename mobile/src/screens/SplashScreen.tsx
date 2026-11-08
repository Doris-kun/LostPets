import { useEffect, useRef } from 'react';
import { Animated, Easing, Modal, StyleSheet, Text, View } from 'react-native';
import { useLanguage } from '../context/language';
import { useTheme } from '../context/theme';
import { spacing } from '../theme';

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

const HOLD_MS = 1100; // giữ logo đứng yên trước khi rút đi

// logo-full.png gốc 471x590.
// Giữ đúng tỉ lệ để chữ và hình không bị bóp méo.
const FULL_WIDTH = 220;
const FULL_HEIGHT = Math.round((FULL_WIDTH * 590) / 471);
// logo-dark.png gốc 471x591 — cùng tỉ lệ với bản sáng nên dùng chung bề ngang
const DARK_WIDTH = 220;
const DARK_HEIGHT = Math.round((DARK_WIDTH * 591) / 471);

export default function SplashScreen({ onFinish }: { onFinish: () => void }) {
  const { t } = useLanguage();
  const { isDark } = useTheme();

  /*
   * useRef chứ không useState: giá trị animation đổi 60 lần mỗi giây.
   * Dùng state thì mỗi khung hình là một lần render lại — giật ngay.
   * Animated.Value đổi thẳng ở tầng native, không đụng tới React.
   */
  const logoScale = useRef(new Animated.Value(0.88)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const tailOpacity = useRef(new Animated.Value(0)).current;

  // Độ mờ của TOÀN BỘ nội dung, dùng ở bước cuối để rút đi.
  // Nền nằm ngoài, giữ đặc từ đầu đến cuối.
  const contentOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      // Logo hiện ra và nở nhẹ
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 420,
          useNativeDriver: true,
        }),
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 6,
          tension: 55,
          useNativeDriver: true,
        }),
      ]),

      // Hai gạch màu và slogan theo sau, trễ một nhịp cho có lớp lang
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
  }, [logoOpacity, logoScale, tailOpacity, contentOpacity, onFinish]);

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
      <View className="flex-1 items-center justify-center bg-background">
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
              tiện ích cố định — bản tối có vầng sáng toả ra nên chiếm ít chỗ
              hơn, phải phóng to bù lại.
            */
            style={{
              width: isDark ? DARK_WIDTH : FULL_WIDTH,
              height: isDark ? DARK_HEIGHT : FULL_HEIGHT,
              resizeMode: 'contain',
              opacity: logoOpacity,
              transform: [{ scale: logoScale }],
            }}
          />

          <Animated.View className="mt-lg items-center" style={{ opacity: tailOpacity }}>
            {/* Hai gạch nhỏ lấy đúng cặp màu hai nửa của logo */}
            <View className="flex-row gap-1.5">
              <View className="h-1 w-[26px] rounded-sm bg-orange" />
              <View className="h-1 w-[26px] rounded-sm bg-teal" />
            </View>

            <Text className="mt-md text-[14px] text-text-muted">{t('brand.slogan')}</Text>
          </Animated.View>
        </Animated.View>
      </View>
    </Modal>
  );
}
