const mongoose = require('mongoose');
const { Schema } = mongoose;

// Biên nhận thông báo đẩy đang chờ đọc.
//
// Expo trả "ok" cho gần như mọi thông báo ngay lúc nhận, rồi mới báo hỏng sau
// trong biên nhận. Nên phải giữ lại mã biên nhận ở đâu đó cho tới khi đợt dọn
// hằng đêm đọc lại — xem push.checkReceipts().
//
// Để trong database chứ không giữ trong bộ nhớ tiến trình: Render bản miễn
// phí ngủ sau 15 phút không ai dùng, biến trong bộ nhớ mất sạch theo.
const PushReceiptSchema = new Schema({
  receiptId: { type: String, required: true, index: true },
  // Giữ luôn mã thiết bị bên cạnh, vì biên nhận của Expo chỉ trả trạng thái
  // chứ không nhắc lại gửi cho ai. Không lưu thì biết hỏng mà không biết gỡ
  // mã nào ra.
  token:     { type: String, required: true },
  // Dọn theo thứ tự cũ trước, và cũng để biết hàng chờ có bị ùn không.
  createdAt: { type: Date, default: Date.now, index: true },
}, { collection: 'pushreceipts' });

module.exports = mongoose.model('PushReceipt', PushReceiptSchema);
