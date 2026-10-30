const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { optionalAuth, requireAuth } = require('../middleware/auth');
const rateLimit = require('../middleware/rateLimit');

const registerLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: () => Number(process.env.REGISTER_RATE_LIMIT) || 30,
  message: 'Đã tạo quá nhiều tài khoản từ máy này, thử lại sau một giờ',
});

// Chặn dò mật khẩu bằng cách thử liên tục.
const loginLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: () => Number(process.env.LOGIN_RATE_LIMIT) || 20,
  message: 'Đăng nhập sai quá nhiều lần, thử lại sau ít phút',
});

router.post('/register', registerLimit, authController.register);
router.post('/login', loginLimit, authController.login);
// Đăng nhập bằng nhà cung cấp cũng tạo được tài khoản mới, nên dùng chung bộ
// chặn với đăng ký. Dùng scope chung để ai đó không lách bằng cách gọi xen kẽ
// /auth/register và /auth/google.
const providerLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: () => Number(process.env.REGISTER_RATE_LIMIT) || 30,
  message: 'Đã đăng nhập quá nhiều lần từ máy này, thử lại sau một giờ',
  scope: 'auth:provider',
});

router.get('/providers', authController.providers);
router.post('/google', providerLimit, authController.google);
router.post('/facebook', providerLimit, authController.facebook);

router.get('/me', optionalAuth, requireAuth, authController.me);

module.exports = router;
