// Nhớ những tin trình duyệt này đã báo cáo, để nút đổi thành "đã báo cáo"
// thay vì cho bấm mãi.
//
// Đây là MA SÁT chống bấm bừa, không phải bảo mật: xoá dữ liệu trình duyệt là
// báo cáo lại được. Chặn thật thì phải định danh người gửi, mà báo cáo lại cố
// ý không cần đăng nhập — người cần báo cáo nhất (bị kẻ khác đem số điện thoại
// đi đăng tin giả) chính là người không có tài khoản. Phần chặn thật nằm ở bộ
// đếm tần suất theo IP phía server.
const KEY = (petId) => `report:${petId}`;

export default {
  has(petId) {
    try {
      return localStorage.getItem(KEY(petId)) !== null;
    } catch {
      // Chế độ ẩn danh hoặc trình duyệt chặn: coi như chưa báo cáo. Cho bấm
      // thừa một lần còn hơn khoá mất đường tố cáo của người ta.
      return false;
    }
  },
  mark(petId) {
    try {
      localStorage.setItem(KEY(petId), String(Date.now()));
    } catch {
      /* không lưu được thì thôi, lần sau hỏi lại */
    }
  },
};
