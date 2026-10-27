const express = require('express');
const router = express.Router();
const petController = require('../controllers/petController');
const { optionalAuth, requireAuth } = require('../middleware/auth');

// optionalAuth ở mọi route: khách vãng lai vẫn dùng được, người đã đăng nhập
// thì server biết họ là ai để gắn chủ sở hữu và bỏ qua bước hỏi mã.
router.use(optionalAuth);

router.route('/')
  .get(petController.list_all_pets)
  .post(petController.upload, petController.create_a_pet);

router.get('/mine', requireAuth, petController.list_my_pets);

// upload ở cả PUT để sửa tin đổi được ảnh. Multer bỏ qua request không phải
// multipart, nên những chỗ gửi JSON như nút "Đã tìm thấy" vẫn chạy như cũ.
router.route('/:petId')
  .get(petController.read_a_pet)
  .put(petController.upload, petController.update_a_pet)
  .delete(petController.delete_a_pet);

module.exports = router;
