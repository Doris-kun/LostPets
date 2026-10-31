import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
let currentToken = null;
let handleUnauthorized = () => {};

export const getToken = () => currentToken;

// api.js gọi hàm này khi server trả 401 — token hết hạn hoặc bị thu hồi.
export const reportUnauthorized = () => handleUnauthorized();

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
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

  const login = useCallback((nextToken, nextUser) => {
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
    handleUnauthorized = logout;
    return () => {
      handleUnauthorized = () => {};
    };
  }, [logout]);

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
