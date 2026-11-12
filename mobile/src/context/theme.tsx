import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colorScheme } from 'nativewind';
import { darkColors, darkShadow, lightColors, lightShadow, type Colors } from '../theme';

/** Hai chế độ hiển thị app hỗ trợ. */
export type Scheme = 'light' | 'dark';

/** Bộ đổ bóng, lấy tên từ bảng sáng — bảng tối bị buộc phải có đúng từng ấy. */
export type Shadow = typeof lightShadow;

/*
 * Quản lý chế độ hiển thị: sáng (light) hay tối (dark).
 *
 * Cùng cách làm với context/language.js — cũng là "giữ một lựa chọn của người
 * dùng rồi phát cho cả app". Khác hai điểm:
 *
 *   1. KHÔNG đọc cài đặt sáng/tối của điện thoại. Lần đầu mở app là sáng,
 *      sau đó chỉ đổi khi người dùng tự chọn trong màn Cài đặt.
 *
 *      Trước đây có đọc, và nó đẻ ra lỗi màn chào: màn chào GỐC chạy trước cả
 *      JavaScript nên nó chỉ biết cài đặt của máy, còn màn chào của app thì
 *      biết lựa chọn trong app. Máy để tối mà app để sáng là hai màn ra hai
 *      màu khác nhau — nhìn ra như logo hiện hai lần, cái sau đè lên cái trước.
 *      Bỏ hẳn một trong hai nguồn thì hết đường lệch.
 *
 *   2. Đổi chế độ làm TOÀN BỘ bảng màu đổi theo. Phần đó nay do NativeWind
 *      lo: colorScheme.set() ở dưới đổi giá trị các biến --color-*, nên mọi
 *      lớp bg-..., text-... tự ra màu mới mà không phải dựng lại gì.
 */

const STORAGE_KEY = 'theme';

export interface ThemeValue {
  scheme: Scheme;
  setScheme: (scheme: Scheme) => void;
  colors: Colors;
  shadow: Shadow;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  // null = chưa đọc xong ổ đĩa, hoặc người dùng chưa chọn bao giờ.
  const [savedScheme, setSavedScheme] = useState<Scheme | null>(null);

  /*
   * Đã đọc xong lựa chọn trong ổ đĩa chưa.
   *
   * Cần vì đọc ổ đĩa mất một nhịp, và trong nhịp đó app ĐÃ VẼ RỒI — vẽ bằng
   * màu sáng mặc định, vì chưa biết người dùng đã chọn gì. Đọc xong mới đổi
   * sang lựa chọn thật.
   *
   * Hậu quả thấy được nếu không chặn: người dùng để app chế độ tối thì màn
   * chào hiện ra SÁNG một nhịp rồi mới chuyển sang tối — một mảng trắng chớp
   * lên rồi biến mất, tưởng app lỗi.
   *
   * Chặn không vẽ gì cho tới khi biết chắc. Màn chào gốc của hệ điều hành
   * vẫn đang che màn hình trong lúc đó, nên không ai thấy khoảng trống này.
   */
  const [ready, setReady] = useState(false);

  // Chỉ có một nguồn duy nhất: lựa chọn trong app. Chưa chọn gì thì sáng.
  const scheme = savedScheme ?? 'light';

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
      })
      .finally(() => {
        // finally chứ không phải chỉ trong then: ổ đĩa hỏng thì vẫn phải cho
        // app chạy tiếp bằng cài đặt của máy, không được treo màn chào mãi.
        if (!ignore) setReady(true);
      });

    return () => {
      ignore = true;
    };
  }, []);

  const setScheme = useCallback((next: Scheme) => {
    setSavedScheme(next);
    // Không await: màn hình phải đổi ngay, còn việc ghi xuống ổ đĩa chậm vài
    // mili giây cũng không ai chờ.
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
  }, []);

  const toggleScheme = useCallback(() => {
    setScheme(scheme === 'dark' ? 'light' : 'dark');
  }, [scheme, setScheme]);

  /*
   * Báo cho NativeWind biết app đang ở chế độ nào.
   *
   * tailwind.config.js khai darkMode: 'class', nghĩa là biến thể dark: chỉ ăn
   * khi có ai đó bật cờ lên — chứ không tự đọc cài đặt hệ điều hành. Phải vậy,
   * vì app có nút đổi sáng/tối riêng và nhớ lựa chọn đó trong máy; để
   * NativeWind tự đọc hệ điều hành là gỡ mất tính năng đang chạy.
   *
   * Không nối dòng này thì mọi lớp dark:... im lặng không bao giờ ăn, mà
   * Tailwind cũng chẳng báo gì — nhìn ra y như quên viết lớp đó.
   *
   * useLayoutEffect chứ không useEffect: nó chạy TRƯỚC khi màn hình được vẽ
   * ra. Dùng useEffect thì khung hình đầu tiên vẽ bằng chế độ mặc định của
   * NativeWind rồi mới nhảy sang chế độ của app — app để tối thì thấy một
   * nháy sáng rồi mới tối.
   *
   * Vẫn còn đúng một chỗ không cứu được: màn chào. Nó nằm trong Modal, mà
   * hiệu ứng của component con chạy TRƯỚC của component cha, nên lúc nó gắn
   * thì dòng này chưa chạy. Màn chào lấy màu thẳng từ useTheme() — xem ghi
   * chú trong SplashScreen.tsx.
   */
  useLayoutEffect(() => {
    colorScheme.set(scheme);
  }, [scheme]);

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

  /*
   * Chưa biết chế độ thì chưa vẽ gì.
   *
   * Trả null chứ không trả một khung tạm: khung tạm cũng phải chọn một màu,
   * mà chọn màu chính là thứ đang chưa biết. Màn chào gốc của hệ điều hành
   * vẫn che kín màn hình trong vài mili giây này — App.tsx chỉ tắt nó sau khi
   * ThemeProvider đã sẵn sàng, nên người dùng không thấy khoảng trống nào.
   */
  if (!ready) return null;

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);

  // Gọi hook này ở component nằm ngoài ThemeProvider thì context là null, và
  // lỗi thật sẽ hiện ra ở dòng `const { colors } = ...` rất khó hiểu.
  if (!context) throw new Error('useTheme phải nằm trong <ThemeProvider>');

  return context;
}
