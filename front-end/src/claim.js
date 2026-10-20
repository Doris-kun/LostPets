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
};
