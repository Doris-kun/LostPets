// Sổ ghi "đã hỏi tin này chưa, bao giờ được hỏi lại".
//
// Vì sao cần: nút "Đã tìm thấy" nằm im vì người ta đoàn tụ xong là quên web
// này tồn tại, chứ không phải vì nút khó bấm. Cuộc đoàn tụ diễn ra ngoài đời,
// không có dữ liệu nào trong hệ thống đổi khi con vật về nhà — nên web không
// đoán được, chỉ hỏi được. Chỗ này giữ nhịp hỏi sao cho không thành phiền.
//
// Tất cả nằm trong localStorage của chính người đăng, không gửi đi đâu cả.
const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;

const SCAN_KEY = 'nudge:scan';
const askKey = (id) => `nudge:ask:${id}`;

// Hỏng thì coi như "chưa hẹn gì", tức là được phép hỏi. Thà hỏi thừa một lần
// còn hơn im lặng vĩnh viễn ở chế độ ẩn danh.
const readAt = (key) => {
  try { return Number(localStorage.getItem(key)) || 0; } catch { return 0; }
};
const writeAt = (key, at) => {
  try { localStorage.setItem(key, String(at)); } catch { /* chế độ ẩn danh */ }
};

export default {
  // Mỗi lần dò là vài request lên server, mà tin chỉ cũ đi theo ngày chứ không
  // theo phút. Dò lại sau 12 tiếng là quá đủ.
  // Muốn thử nhanh lúc phát triển: localStorage.removeItem('nudge:scan')
  dueForScan() {
    return Date.now() >= readAt(SCAN_KEY);
  },
  markScanned() {
    writeAt(SCAN_KEY, Date.now() + 12 * HOUR);
  },

  mayAsk(id) {
    return Date.now() >= readAt(askKey(id));
  },
  snooze(id, days) {
    writeAt(askKey(id), Date.now() + days * DAY);
  },
  forget(id) {
    try { localStorage.removeItem(askKey(id)); } catch { /* không sao */ }
  },
};
