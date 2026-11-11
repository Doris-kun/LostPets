const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const chatController = require('../controllers/chatController');
const rateLimit = require('../middleware/rateLimit');

// Mỗi lượt gọi AI đều tốn quota, nên chặn vòng lặp tự động.
// Ngưỡng đặt rộng hơn nhiều so với người dùng thật.
const aiLimit = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: () => Number(process.env.AI_RATE_LIMIT) || 30,
  message: 'Bạn thao tác hơi nhanh, chờ vài phút rồi thử lại',
  // scope BẮT BUỘC phải có ở đây.
  //
  // Không khai thì bộ đếm lấy khoá theo đường dẫn, mà '/match/:petId' có mã
  // tin nằm ngay trong đường dẫn — thành ra MỖI TIN một hạn mức riêng. Lặp
  // qua danh sách tin là nhân số lượt gọi lên bằng số tin, trong khi ngưỡng
  // nhìn vẫn như cũ.
  //
  // Dùng chung một scope cho cả ba đường AI: cả ba đều tốn quota, nên tách
  // riêng thì lách được bằng cách gọi xen kẽ.
  scope: 'ai',
});

router.post('/analyze-image', aiLimit, aiController.upload, aiController.analyze_image);
router.get('/match/:petId', aiLimit, aiController.match_posts);
router.post('/chat', aiLimit, chatController.chat);

module.exports = router;
