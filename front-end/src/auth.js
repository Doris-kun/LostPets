// Token và thông tin tài khoản, giữ trong localStorage để F5 không mất phiên.
// Vue 2 không có store nên dùng một object reactive dùng chung cho cả app.
import Vue from 'vue';

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

// Vue.observable để nav tự cập nhật khi đăng nhập hoặc đăng xuất.
export const state = Vue.observable({
  token: read(TOKEN_KEY),
  user: storedUser,
});

export default {
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
  },

  logout() {
    state.token = null;
    state.user = null;
    write(TOKEN_KEY, null);
    write(USER_KEY, null);
  },
};
