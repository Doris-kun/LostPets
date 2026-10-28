// Mã xác nhận của từng tin, lưu trong trình duyệt người đăng.
// Nhờ đó họ sửa/xoá tin của mình mà không phải gõ lại mã.
// Đổi máy hoặc xoá dữ liệu trình duyệt thì phải nhập tay mã đã lưu lúc đăng.
const key = (id) => `claim:${id}`;

export default {
  save(id, code) {
    if (!id || !code) return;
    try { localStorage.setItem(key(id), code); } catch { /* chế độ ẩn danh */ }
  },
  get(id) {
    try { return localStorage.getItem(key(id)) || ''; } catch { return ''; }
  },
  remove(id) {
    try { localStorage.removeItem(key(id)); } catch { /* không sao */ }
  },
  // Id mọi tin đã đăng từ trình duyệt này. Dùng để hỏi lại xem tin nào đã xong.
  // Đây là nguồn duy nhất biết được khách vãng lai đã đăng những tin nào —
  // họ không có tài khoản nên server không gắn tin với ai cả.
  list() {
    try {
      return Object.keys(localStorage)
        .filter((k) => k.startsWith('claim:'))
        .map((k) => k.slice('claim:'.length))
        .filter(Boolean);
    } catch {
      return [];
    }
  },
};
