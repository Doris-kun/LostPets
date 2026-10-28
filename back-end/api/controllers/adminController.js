const mongoose = require('mongoose');
const Pet = require('../models/petModel');
const User = require('../models/userModel');
const { discardImages } = require('../lib/images');

const TOP_LIMIT = 5;
const PAGE_SIZE = 20;

// Giữ tin đã đoàn tụ thêm bao nhiêu ngày trước khi xoá hẳn. Để sửa được bằng
// biến môi trường vì lúc kiểm thử trên Render cần hạ xuống 1 ngày để xem nó
// thật sự chạy, chứ chờ 30 ngày thì không ai biết nó có hoạt động hay không.
const DEFAULT_CLEANUP_DAYS = 30;
const cleanupAfterDays = () => {
  const n = Number.parseInt(process.env.CLEANUP_AFTER_DAYS, 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_CLEANUP_DAYS;
};
const cutoffDate = () => new Date(Date.now() - cleanupAfterDays() * 24 * 60 * 60 * 1000);

// Tổng hợp số liệu cho trang quản trị. Gom các phép đếm chạy song song để
// trang không phải chờ lần lượt.
exports.stats = async (_req, res) => {
  try {
    const [total, lost, found, resolved, withImage, users, pendingCleanup, topAreas, topBreeds] = await Promise.all([
      Pet.countDocuments(),
      Pet.countDocuments({ type: 'lost' }),
      Pet.countDocuments({ type: 'found' }),
      Pet.countDocuments({ resolved: true }),
      Pet.countDocuments({ image: { $ne: '' } }),
      User.countDocuments(),
      Pet.countDocuments({ resolved: true, resolvedAt: { $lte: cutoffDate() } }),
      Pet.aggregate([
        { $group: { _id: '$area', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: TOP_LIMIT },
      ]),
      Pet.aggregate([
        { $group: { _id: '$breed', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: TOP_LIMIT },
      ]),
    ]);

    res.json({
      total,
      lost,
      found,
      resolved,
      open: total - resolved,
      withImage,
      users,
      // Tỉ lệ đoàn tụ: phần trăm tin đã được đánh dấu tìm thấy.
      resolvedRate: total === 0 ? 0 : Math.round((resolved / total) * 100),
      // Số tin đã quá hạn giữ lại, tức là đợt dọn kế tiếp sẽ xoá đúng ngần này.
      pendingCleanup,
      cleanupDays: cleanupAfterDays(),
      topAreas: topAreas.map((a) => ({ label: a._id, count: a.count })),
      topBreeds: topBreeds.map((b) => ({ label: b._id, count: b.count })),
    });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

// Danh sách toàn bộ tin, có lọc và phân trang, kèm tên chủ tài khoản nếu có.
exports.list_pets = async (req, res) => {
  try {
    const filter = {};
    if (req.query.type === 'lost' || req.query.type === 'found') filter.type = req.query.type;
    if (req.query.resolved === 'true') filter.resolved = true;
    if (req.query.resolved === 'false') filter.resolved = false;
    if (req.query.q) {
      const q = String(req.query.q).trim().slice(0, 100);
      if (q) {
        const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        filter.$or = [{ breed: rx }, { area: rx }, { name: rx }, { postId: rx }];
      }
    }

    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || PAGE_SIZE, 1), 100);
    const skip = Math.max(Number.parseInt(req.query.skip, 10) || 0, 0);

    const [pets, total] = await Promise.all([
      Pet.find(filter).sort({ date: -1 }).skip(skip).limit(limit).populate('owner', 'name email'),
      Pet.countDocuments(filter),
    ]);

    res.json({ pets, total });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

// Xoá hẳn những tin đã đoàn tụ quá hạn giữ lại, kèm ảnh trên Cloudinary.
// Chạy bằng cron hằng ngày, hoặc bấm tay từ trang quản trị.
//
// Vì sao không dùng TTL index của MongoDB — cách đó không cần dòng code nào:
// TTL xoá thẳng dưới tầng database nên code của app không chạy, ảnh trên
// Cloudinary bị bỏ lại vĩnh viễn, không còn tin nào trỏ tới để biết đường dọn.
// Đổi một việc tốn vài chục dòng lấy một đống rác không bao giờ dọn được.
exports.cleanup = async (_req, res) => {
  try {
    // Tin đã đoàn tụ từ trước khi có trường resolvedAt thì không có mốc thời
    // gian nào để tính hạn. Đóng dấu mốc "bây giờ" cho chúng, nghĩa là chúng
    // được hưởng trọn kỳ hạn kể từ lần dọn đầu tiên. Cố ý không suy ra mốc cũ
    // từ `date`: đoán sai một tin là xoá nhầm tin của người ta, không lấy lại được.
    const stamp = await Pet.updateMany(
      { resolved: true, resolvedAt: null },
      { $set: { resolvedAt: new Date() } }
    );

    // Đọc cả danh sách trước khi xoá vì cần imageId để dọn ảnh — xoá xong rồi
    // thì không còn chỗ nào biết ảnh nào thuộc tin nào.
    const doomed = await Pet.find({ resolved: true, resolvedAt: { $lte: cutoffDate() } })
      .select('+imageId');

    if (doomed.length > 0) {
      await Pet.deleteMany({ _id: { $in: doomed.map((p) => p._id) } });
      // Xoá ảnh sau khi tin đã biến mất, giống lúc xoá tin lẻ: làm ngược lại mà
      // lệnh xoá hỏng giữa chừng thì tin còn đó nhưng trỏ vào ảnh đã mất.
      discardImages(doomed);
    }

    res.json({
      deleted: doomed.length,
      stamped: stamp.modifiedCount || 0,
      days: cleanupAfterDays(),
    });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

// Quản trị viên xoá được bất kỳ tin nào, không cần mã xác nhận.
exports.delete_pet = async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.petId)) {
    return res.status(404).json({ message: 'Pet not found' });
  }
  try {
    const pet = await Pet.findByIdAndDelete(req.params.petId);
    if (!pet) return res.status(404).json({ message: 'Pet not found' });
    res.json({ message: 'Pet deleted successfully' });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};
