const mongoose = require('mongoose');
const Report = require('../models/reportModel');
const Pet = require('../models/petModel');

const { REASONS, MAX_NOTE_CHARS } = Report;

// Người đang bị hại vì một tin giả thường KHÔNG có tài khoản — họ không đăng
// tin nào cả, số điện thoại của họ bị người khác đem đi dùng. Bắt đăng nhập
// mới được báo cáo là chặn đúng người cần báo cáo nhất.
exports.create_a_report = async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.petId)) {
    return res.status(404).json({ message: 'Pet not found' });
  }
  try {
    const { reason, note } = req.body || {};
    if (!REASONS.includes(reason)) {
      return res.status(400).json({ message: 'Lý do báo cáo không hợp lệ' });
    }

    // Chỉ cần biết tin có tồn tại không, không cần kéo cả nội dung về.
    const exists = await Pet.exists({ _id: req.params.petId });
    if (!exists) return res.status(404).json({ message: 'Pet not found' });

    await Report.create({
      pet: req.params.petId,
      reason,
      note: String(note || '').trim().slice(0, MAX_NOTE_CHARS),
    });

    // Không trả về tổng số báo cáo của tin này. Biết được con số đó thì người
    // ta đoán ra tin nào sắp bị gỡ, và kẻ xấu biết mình đã dồn đủ chưa.
    res.status(201).json({ message: 'Đã nhận báo cáo' });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};
