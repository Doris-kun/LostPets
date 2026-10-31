import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { darkColors, darkShadow, lightColors, lightShadow } from '../theme';

/*
 * Quản lý chế độ hiển thị: sáng (light) hay tối (dark).
 *
 * Cùng cách làm với context/language.js — cũng là "giữ một lựa chọn của người
 * dùng rồi phát cho cả app". Khác hai điểm:
 *
 *   1. Có giá trị mặc định THÔNG MINH: lần đầu mở app thì theo luôn cài đặt
 *      của điện thoại. Máy đang để nền tối thì app mở ra cũng tối, không bắt
 *      người dùng phải tự chỉnh.
 *
 *   2. Đổi chế độ làm TOÀN BỘ bảng màu đổi theo, nên mọi StyleSheet phải dựng
 *      lại. Xem createThemedStyles ở cuối file.
 */

const STORAGE_KEY = 'theme';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  /*
   * Cài đặt sáng/tối của chính điện thoại. Trả 'light', 'dark', hoặc null khi
   * chưa đọc được. Người dùng đổi trong Cài đặt máy thì giá trị này tự đổi.
   */
  const systemScheme = useColorScheme();

  // null = chưa đọc xong ổ đĩa, đang tạm theo máy.
  const [savedScheme, setSavedScheme] = useState(null);

  // Lựa chọn riêng trong app luôn thắng cài đặt máy. Chưa chọn gì thì theo máy.
  const scheme = savedScheme ?? systemScheme ?? 'light';

  // Đọc lựa chọn của lần chạy trước. Chạy đúng một lần lúc app mở.
  useEffect(() => {
    let ignore = false;

    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        // Kiểm tra giá trị đọc lên: file lưu có thể hỏng. Gán bừa thì
        // colorsByScheme[undefined] ra undefined -> app trắng màn.
        if (!ignore && (saved === 'light' || saved === 'dark')) setSavedScheme(saved);
      })
      .catch(() => {
        // Không đọc được thì theo máy, không cần báo gì.
      });

    return () => {
      ignore = true;
    };
  }, []);

  const setScheme = useCallback((next) => {
    setSavedScheme(next);
    // Không await: màn hình phải đổi ngay, còn việc ghi xuống ổ đĩa chậm vài
    // mili giây cũng không ai chờ.
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
  }, []);

  const toggleScheme = useCallback(() => {
    setScheme(scheme === 'dark' ? 'light' : 'dark');
  }, [scheme, setScheme]);

  const value = useMemo(
    () => ({
      scheme,
      isDark: scheme === 'dark',
      colors: scheme === 'dark' ? darkColors : lightColors,
      shadow: scheme === 'dark' ? darkShadow : lightShadow,
      setScheme,
      toggleScheme,
    }),
    [scheme, setScheme, toggleScheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);

  // Gọi hook này ở component nằm ngoài ThemeProvider thì context là null, và
  // lỗi thật sẽ hiện ra ở dòng `const { colors } = ...` rất khó hiểu.
  if (!context) throw new Error('useTheme phải nằm trong <ThemeProvider>');

  return context;
}

/*
 * ----------------------------------------------------------------------
 * Cách dùng màu trong màn hình
 *
 * Vấn đề: StyleSheet.create() chạy MỘT LẦN lúc nạp file, lúc đó chưa ai biết
 * người dùng chọn chế độ nào. Viết thẳng màu vào đó thì đổi chế độ không ăn.
 *
 * Cách giải: gói phần tạo style vào một hàm nhận bảng màu, rồi dựng SẴN cả
 * hai bản ngay lúc nạp file. Lúc vẽ chỉ việc chọn bản đúng — không phải tính
 * lại gì cả, nên đổi chế độ là đổi tức thì.
 *
 * Trong file màn hình:
 *
 *   const themed = createThemedStyles((colors, shadow) =>
 *     StyleSheet.create({ box: { backgroundColor: colors.surface, ...shadow.card } }),
 *   );
 *
 *   function MyScreen() {
 *     const { colors } = useTheme();
 *     const styles = useThemedStyles(themed);
 *     ...
 *   }
 */
export function createThemedStyles(make) {
  // Tham số thứ ba isDark cho những chỗ cần đổi KÍCH THƯỚC chứ không chỉ màu.
  // Ví dụ: ảnh logo bản tối có vầng sáng toả ra nên phải chừa lề trong ảnh,
  // khiến vòng tròn chiếm ít chỗ hơn — phải phóng to bù lại.
  return {
    light: make(lightColors, lightShadow, false),
    dark: make(darkColors, darkShadow, true),
  };
}

export function useThemedStyles(themed) {
  const { scheme } = useTheme();
  return themed[scheme];
}
