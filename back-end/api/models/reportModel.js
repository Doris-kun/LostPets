const mongoose = require('mongoose');
const { Schema } = mongoose;

// Lý do lưu dưới dạng mã, không lưu câu tiếng Việt. Giao diện tự dịch ra, nhờ
// vậy đổi câu chữ hay thêm tiếng Anh không phải đụng tới dữ liệu đã lưu.
const REASONS = ['scam', 'fake_image', 'wrong_contact', 'offensive', 'duplicate', 'other'];

const MAX_NOTE_CHARS = 500;

const ReportSchema = new Schema({
  // Cố ý KHÔNG đặt ràng buộc "mỗi người một báo cáo" ở đây. Báo cáo không cần
  // đăng nhập nên server không biết ai là ai; chặn trùng chỉ làm được ở phía
  // trình duyệt, và đó là ma sát chống bấm bừa chứ không phải bảo mật.
  pet:    { type: Schema.Types.ObjectId, ref: 'Pet', required: true, index: true },
  reason: { type: String, required: true, enum: REASONS },
  note:   { type: String, default: '', maxlength: MAX_NOTE_CHARS },
  date:   { type: Date, default: Date.now, index: true },
}, { collection: 'reports' });

module.exports = mongoose.model('Report', ReportSchema);
module.exports.REASONS = REASONS;
module.exports.MAX_NOTE_CHARS = MAX_NOTE_CHARS;
