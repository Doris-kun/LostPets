import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLanguage } from './language';
import type { User } from '../types';

/*
 * Quản lý phiên đăng nhập: token và thông tin tài khoản.
 *
 * Tương đương front-end/src/auth.js bên web, nhưng khác hai chỗ:
 *
 *   1. Web đọc localStorage ra kết quả NGAY. Mobile dùng AsyncStorage phải
 *      CHỜ, nên lúc app vừa mở chưa biết đã đăng nhập hay chưa. Có thêm cờ
 *      `loading` để màn hình biết mà đừng vội kết luận là khách vãng lai.
 *
 *   2. Web dùng Vue.observable, mobile dùng Context — giống hệt cách
 *      context/language.js và context/theme.js đang làm.
 */

const TOKEN_KEY = 'auth:token';
const USER_KEY = 'auth:user';

/*
 * ----------------------------------------------------------------------
 * Phần cầu nối với api.js
 *
 * api.js là một module thường, không phải component, nên KHÔNG gọi được hook
 * để lấy token ra. Mà mỗi request lại cần kèm token.
 *
 * Giải pháp: giữ thêm một bản token ở cấp module ngay tại đây. Provider cập
 * nhật nó mỗi khi đăng nhập hoặc đăng xuất, api.js chỉ việc đọc.
 *
 * Chiều phụ thuộc chỉ đi MỘT HƯỚNG: api.js -> file này. File này tuyệt đối
 * không import api.js, nếu không hai file sẽ gọi vòng tròn lẫn nhau.
 */
let currentToken: string | null = null;
let handleUnauthorized: () => void = () => {};

export const getToken = (): string | null => currentToken;

// api.js gọi hàm này khi server trả 401 — token hết hạn hoặc bị thu hồi.
export const reportUnauthorized = () => handleUnauthorized();

export interface AuthValue {
  token: string | null;
  user: User | null;
  /** true = chưa đọc xong ổ đĩa. KHÁC với "đã đọc xong và không ai đăng nhập". */
  loading: boolean;
  isLoggedIn: boolean;
  isAdmin: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  // AuthProvider nằm TRONG LanguageProvider (xem App.tsx) nên gọi được hook này.
  const { t } = useLanguage();

  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  // Chưa đọc xong ổ đĩa. Khác với "đã đọc xong và không có ai đăng nhập".
  const [loading, setLoading] = useState(true);

  // Đọc phiên của lần chạy trước. Chạy đúng một lần lúc app mở.
  useEffect(() => {
    let ignore = false;

    // multiGet lấy nhiều khoá trong một lần chạm ổ đĩa, nhanh hơn gọi hai lần.
    AsyncStorage.multiGet([TOKEN_KEY, USER_KEY])
      .then((pairs) => {
        if (ignore) return;

        const saved = Object.fromEntries(pairs);
        const savedToken = saved[TOKEN_KEY];
        if (!savedToken) return;

        currentToken = savedToken;
        setToken(savedToken);

        try {
          setUser(JSON.parse(saved[USER_KEY] || 'null'));
        } catch {
          // Dữ liệu hỏng thì bỏ qua phần thông tin, token vẫn dùng được.
          // Màn hình nào cần tên thì gọi /auth/me lấy lại.
        }
      })
      .catch(() => {
        // Không đọc được thì coi như chưa đăng nhập.
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  /*
   * Đã báo "hết phiên" chưa, để không hiện ba hộp thoại chồng nhau khi vài
   * lượt gọi cùng nhận 401 một lúc. Đăng nhập lại thì xoá dấu, vì lần sau là
   * một phiên khác.
   */
  const daBao = useRef(false);

  const login = useCallback((nextToken: string, nextUser: User) => {
    daBao.current = false;
    currentToken = nextToken;
    setToken(nextToken);
    setUser(nextUser);

    // Không await: giao diện phải đổi ngay, ghi ổ đĩa chậm vài mili giây
    // cũng không ai chờ.
    AsyncStorage.multiSet([
      [TOKEN_KEY, nextToken],
      [USER_KEY, JSON.stringify(nextUser)],
    ]).catch(() => {});
  }, []);

  const logout = useCallback(() => {
    currentToken = null;
    setToken(null);
    setUser(null);
    AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]).catch(() => {});
  }, []);

  // Nối hàm đăng xuất vào cái móc mà api.js sẽ giật khi gặp 401.
  // Đặt trong effect để luôn trỏ tới bản logout mới nhất.
  useEffect(() => {
    /*
     * Bị đăng xuất ÉP BUỘC thì phải nói ra.
     *
     * Trước đây chỗ này chỉ gọi logout(): người dùng đang xem dở bỗng thành
     * khách, không một lời giải thích, và họ sẽ tưởng app lỗi. Chuyện này nay
     * xảy ra thật chứ không còn hiếm — back-end huỷ mọi phiên cũ sau khi đổi
     * mật khẩu (PR #94), nên đổi mật khẩu trên web là máy này bị đẩy ra ngay.
     *
     * Hai điều kiện trước khi báo:
     *
     *   1. Phải ĐANG có phiên. Khách vãng lai gặp 401 là chuyện bình thường
     *      của vài đường API, báo cho họ thì vừa sai vừa khó hiểu.
     *   2. Chỉ báo MỘT lần. Mở một màn là vài lượt gọi chạy song song, hỏng
     *      cùng lúc thì không được đổ ra ba cái hộp thoại chồng lên nhau.
     */
    handleUnauthorized = () => {
      if (!currentToken) return;
      if (daBao.current) return;
      daBao.current = true;

      logout();
      Alert.alert(t('auth.expiredTitle'), t('auth.expiredText'));
    };

    return () => {
      handleUnauthorized = () => {};
    };
  }, [logout, t]);

  const value = useMemo(
    () => ({
      token,
      user,
      loading,
      isLoggedIn: Boolean(token),
      isAdmin: user?.role === 'admin',
      login,
      logout,
    }),
    [token, user, loading, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  // Gọi hook này ở component nằm ngoài AuthProvider thì context là null, và
  // lỗi thật sẽ hiện ra ở dòng `const { user } = ...` rất khó hiểu.
  if (!context) throw new Error('useAuth phải nằm trong <AuthProvider>');

  return context;
}
