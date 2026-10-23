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
});

router.post('/analyze-image', aiLimit, aiController.upload, aiController.analyze_image);
router.get('/match/:petId', aiLimit, aiController.match_posts);
router.post('/chat', aiLimit, chatController.chat);

module.exports = router;
