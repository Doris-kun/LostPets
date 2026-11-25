// Token và thông tin tài khoản, giữ trong localStorage để F5 không mất phiên.
//
// Bản Vue dùng Vue.observable để thanh điều hướng tự cập nhật khi đăng nhập
// hoặc đăng xuất. React không có thứ tương đương sẵn, nên file này tự giữ một
// store nhỏ: một bộ đếm phiên bản, một danh sách người nghe, và hook useAuth
// ở cuối file nối chúng vào React qua useSyncExternalStore.
//
// Tự giữ store trong chính file này chứ không dựng một module store dùng
// chung: bản Vue cũng vậy — mỗi file một observable riêng — và mỗi store ở
// đây chỉ vài dòng, gom lại một chỗ chỉ thêm một lớp phải đi qua.
import { useSyncExternalStore } from 'react';

const TOKEN_KEY = 'auth:token';
const USER_KEY = 'auth:user';

const read = (key) => {
  try { return localStorage.getItem(key); } catch { return null; }
};
const write = (key, value) => {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch { /* chế độ ẩn danh */ }
};

let storedUser = null;
try { storedUser = JSON.parse(read(USER_KEY) || 'null'); } catch { storedUser = null; }

export const state = {
  token: read(TOKEN_KEY),
  user: storedUser,
};

/*
 * Phần nối với React.
 *
 * phienBan là một SỐ, không phải object. useSyncExternalStore so sánh ảnh
 * chụp bằng Object.is: trả về một object mới mỗi lần gọi là React thấy "đổi
 * rồi" ở mọi lần vẽ và quay vòng vô tận. Một con số tăng dần thì so sánh luôn
 * đúng, và nó cũng đủ để báo "có gì đó vừa đổi, đọc lại đi".
 */
let phienBan = 0;
const nguoiNghe = new Set();

const bao = () => {
  phienBan += 1;
  nguoiNghe.forEach((goi) => goi());
};

const theoDoi = (goi) => {
  nguoiNghe.add(goi);
  return () => nguoiNghe.delete(goi);
};

const auth = {
  state,
  get token() { return state.token; },
  get user() { return state.user; },
  isLoggedIn() { return Boolean(state.token); },
  isAdmin() { return Boolean(state.user && state.user.role === 'admin'); },

  login(token, user) {
    state.token = token;
    state.user = user;
    write(TOKEN_KEY, token);
    write(USER_KEY, JSON.stringify(user));
    bao();
  },

  // Cập nhật lại thông tin tài khoản mà KHÔNG đụng tới token.
  //
  // Cần vì bản sao tài khoản trong trình duyệt là ảnh chụp lúc đăng nhập và
  // trước đây không bao giờ được làm mới. Đổi vai trò ở nơi khác — xác minh
  // email trên điện thoại, được cấp quyền quản trị, bị gỡ quyền — thì máy này
  // vẫn hiện thông tin cũ cho tới khi đăng xuất rồi đăng nhập lại.
  setUser(user) {
    state.user = user;
    write(USER_KEY, JSON.stringify(user));
    bao();
  },

  logout() {
    state.token = null;
    state.user = null;
    write(TOKEN_KEY, null);
    write(USER_KEY, null);
    bao();
  },
};

/**
 * Đọc phiên đăng nhập trong một component, và vẽ lại khi nó đổi.
 *
 * Trả về giá trị đọc tại thời điểm vẽ chứ không trả về chính `auth`: trả về
 * `auth` thì component nào quên đọc qua hook vẫn chạy được lúc thử, rồi im
 * lặng không cập nhật khi người dùng đăng xuất ở tab khác.
 */
export function useAuth() {
  useSyncExternalStore(theoDoi, () => phienBan, () => phienBan);

  return {
    token: state.token,
    user: state.user,
    isLoggedIn: Boolean(state.token),
    isAdmin: Boolean(state.user && state.user.role === 'admin'),
  };
}

export default auth;
