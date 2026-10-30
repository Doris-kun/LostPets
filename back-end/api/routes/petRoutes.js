const express = require('express');
const router = express.Router();
const petController = require('../controllers/petController');
const { optionalAuth, requireAuth } = require('../middleware/auth');
const rateLimit = require('../middleware/rateLimit');

// optionalAuth ở mọi route: khách vãng lai vẫn dùng được, người đã đăng nhập
// thì server biết họ là ai để gắn chủ sở hữu và bỏ qua bước hỏi mã.
router.use(optionalAuth);

// Mỗi lượt tìm kiếm có chữ đều gọi Gemini để nhúng câu hỏi, tức là tốn quota.
// GET /pets là endpoint công khai không cần đăng nhập, nên không chặn thì một
// vòng lặp tự động gọi /pets?q=... vài nghìn lần là đốt sạch quota miễn phí
// của cả dự án. Duyệt danh sách bình thường (không có q) thì không bị đếm.
const searchLimit = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: () => Number(process.env.SEARCH_RATE_LIMIT) || 60,
  message: 'Bạn tìm kiếm hơi nhanh, chờ một chút rồi thử lại',
});
const limitWhenSearching = (req, res, next) =>
  (String(req.query.q || '').trim() ? searchLimit(req, res, next) : next());

router.route('/')
  .get(limitWhenSearching, petController.list_all_pets)
  .post(petController.upload, petController.create_a_pet);

router.get('/mine', requireAuth, petController.list_my_pets);

// upload ở cả PUT để sửa tin đổi được ảnh. Multer bỏ qua request không phải
// multipart, nên những chỗ gửi JSON như nút "Đã tìm thấy" vẫn chạy như cũ.
router.route('/:petId')
  .get(petController.read_a_pet)
  .put(petController.upload, petController.update_a_pet)
  .delete(petController.delete_a_pet);

module.exports = router;
