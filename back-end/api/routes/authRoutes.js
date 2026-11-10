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

// Quên mật khẩu. Chặn chặt hơn đăng nhập: mỗi lượt gọi là một lá thư gửi đi,
// nên lạm dụng ở đây vừa đốt hạn mức gửi thư vừa biến web thành công cụ dội
// thư vào hộp thư người khác.
const forgotLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: () => Number(process.env.FORGOT_RATE_LIMIT) || 5,
  message: 'Bạn đã yêu cầu quá nhiều lần, thử lại sau một giờ',
  scope: 'auth:forgot',
});

router.post('/forgot-password', forgotLimit, authController.forgotPassword);
// Đặt lại thì không gửi thư, nhưng vẫn chặn để không ai dò mã bằng cách thử
// hàng loạt. Mã dài 64 ký tự hex nên dò mù là vô vọng, chặn cho chắc.
router.post('/reset-password', loginLimit, authController.resetPassword);

// Xác minh địa chỉ thư. Dùng chung bộ đếm với quên mật khẩu: cả hai đều là
// đường làm máy chủ gửi thư đi, nên để riêng thì lách bằng cách gọi xen kẽ.
router.post('/verify-email', loginLimit, authController.verifyEmail);
router.post('/resend-verification', forgotLimit, authController.resendVerification);

router.get('/providers', authController.providers);
router.post('/google', providerLimit, authController.google);
router.post('/facebook', providerLimit, authController.facebook);

// Mã thiết bị nhận thông báo đẩy. Bắt buộc đăng nhập: thông báo gắn với tài
// khoản, nên khách vãng lai đăng tin bằng mã xác nhận sẽ không nhận được gì.
// Đó là giới hạn đã biết, không phải chỗ sót.
router.post('/push-token', optionalAuth, requireAuth, authController.savePushToken);
router.delete('/push-token', optionalAuth, requireAuth, authController.removePushToken);

router.get('/me', optionalAuth, requireAuth, authController.me);

module.exports = router;
