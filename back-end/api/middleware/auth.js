const jwt = require('jsonwebtoken');

// Thiếu JWT_SECRET thì toàn bộ phần đăng nhập tắt đi, phần còn lại của web vẫn chạy.
const getSecret = () => process.env.JWT_SECRET || '';

const TOKEN_TTL = '7d';

exports.signToken = (user) =>
  jwt.sign({ sub: String(user._id), name: user.name }, getSecret(), { expiresIn: TOKEN_TTL });

// Đọc token nếu có, không có cũng cho qua. Dùng cho các route vừa phục vụ
// khách vãng lai vừa phục vụ người đã đăng nhập.
exports.optionalAuth = (req, _res, next) => {
  const header = req.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (token && getSecret()) {
    try {
      req.user = jwt.verify(token, getSecret());
    } catch {
      // Token hỏng hoặc hết hạn thì coi như khách vãng lai.
    }
  }
  next();
};

// Bắt buộc phải đăng nhập.
exports.requireAuth = (req, res, next) => {
  if (!getSecret()) {
    return res.status(503).json({ message: 'Đăng nhập chưa được cấu hình. Thiếu JWT_SECRET.' });
  }
  if (!req.user) {
    return res.status(401).json({ message: 'Bạn cần đăng nhập' });
  }
  next();
};
