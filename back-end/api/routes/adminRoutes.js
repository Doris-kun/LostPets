const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { optionalAuth, requireAdmin } = require('../middleware/auth');

// So sánh không rò thời gian. Băm hai bên trước để luôn đủ 32 byte —
// timingSafeEqual ném lỗi nếu hai buffer khác độ dài, mà chính độ dài đó đã là
// một manh mối cho người đang dò mã.
const sameSecret = (a, b) => {
  const sha = (s) => crypto.createHash('sha256').update(String(s)).digest();
  return crypto.timingSafeEqual(sha(a), sha(b));
};

// Đợt dọn tự động do GitHub Actions gọi, mà cron thì không đăng nhập được nên
// không có JWT. Cho phép thêm một đường vào bằng mã bí mật trong header.
// Không có CLEANUP_TOKEN thì đường này đóng hẳn, chỉ còn quản trị viên bấm tay —
// mặc định phải là đóng, không thì quên đặt biến môi trường là ai cũng gọi được
// endpoint xoá hàng loạt.
const cleanupAuth = (req, res, next) => {
  const expected = process.env.CLEANUP_TOKEN;
  const given = req.get('x-cleanup-token');
  if (expected && given && sameSecret(expected, given)) return next();
  return requireAdmin(req, res, next);
};

// PHẢI đứng trên router.use bên dưới. Đặt xuống dưới thì requireAdmin chạy trước
// và cron luôn nhận 401 dù mã đúng.
router.post('/cleanup', optionalAuth, cleanupAuth, adminController.cleanup);

// Mọi route dưới đây chỉ dành cho quản trị viên.
router.use(optionalAuth, requireAdmin);

router.get('/stats', adminController.stats);
router.get('/pets', adminController.list_pets);
router.delete('/pets/:petId', adminController.delete_pet);

router.get('/reports', adminController.list_reports);
router.delete('/reports/:reportId', adminController.dismiss_report);

module.exports = router;
