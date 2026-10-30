const express = require('express');
const router = express.Router();
const petController = require('../controllers/petController');
const reportController = require('../controllers/reportController');
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

// Phải đứng trên '/:petId', nếu không Express hiểu 'map' là một mã tin.
// Cùng bộ chặn tần suất với danh sách vì cũng nhận tham số q.
router.get('/map', limitWhenSearching, petController.list_pets_for_map);

// Báo cáo tin xấu. Không cần đăng nhập, nhưng chặn tần suất chặt hơn các
// route khác: một người thật báo cáo vài tin là cùng, ai gửi hàng trăm lượt
// thì đang cố nhấn chìm hàng chờ của quản trị viên chứ không phải đang tố cáo.
const reportLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: () => Number(process.env.REPORT_RATE_LIMIT) || 20,
  message: 'Bạn đã gửi quá nhiều báo cáo, thử lại sau một giờ',
  // Một bộ đếm chung cho mọi tin, không phải mỗi tin một bộ.
  scope: 'pets:report',
});
router.post('/:petId/report', reportLimit, reportController.create_a_report);

// upload ở cả PUT để sửa tin đổi được ảnh. Multer bỏ qua request không phải
// multipart, nên những chỗ gửi JSON như nút "Đã tìm thấy" vẫn chạy như cũ.
router.route('/:petId')
  .get(petController.read_a_pet)
  .put(petController.upload, petController.update_a_pet)
  .delete(petController.delete_a_pet);

module.exports = router;
