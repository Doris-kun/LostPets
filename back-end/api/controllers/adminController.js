const mongoose = require('mongoose');
const Pet = require('../models/petModel');
const User = require('../models/userModel');

const TOP_LIMIT = 5;
const PAGE_SIZE = 20;

// Tổng hợp số liệu cho trang quản trị. Gom các phép đếm chạy song song để
// trang không phải chờ lần lượt.
exports.stats = async (_req, res) => {
  try {
    const [total, lost, found, resolved, withImage, users, topAreas, topBreeds] = await Promise.all([
      Pet.countDocuments(),
      Pet.countDocuments({ type: 'lost' }),
      Pet.countDocuments({ type: 'found' }),
      Pet.countDocuments({ resolved: true }),
      Pet.countDocuments({ image: { $ne: '' } }),
      User.countDocuments(),
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
