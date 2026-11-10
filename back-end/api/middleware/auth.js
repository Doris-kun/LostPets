const jwt = require('jsonwebtoken');
const User = require('../models/userModel');

// Thiếu JWT_SECRET thì toàn bộ phần đăng nhập tắt đi, phần còn lại của web vẫn chạy.
const getSecret = () => process.env.JWT_SECRET || '';

const TOKEN_TTL = '7d';

exports.signToken = (user) =>
  jwt.sign(
    {
      sub: String(user._id),
      name: user.name,
      role: user.role || 'user',
      ver: user.tokenVersion || 0,
    },
    getSecret(),
    { expiresIn: TOKEN_TTL }
  );

// Danh sách email quản trị, ngăn cách bằng dấu phẩy.
exports.isAdminEmail = (email) =>
  (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
    .includes(String(email || '').trim().toLowerCase());

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

// Đọc tài khoản thật từ database và đối chiếu với token.
//
// Vì sao phải hỏi lại database mỗi lượt thay vì tin JWT: JWT là ảnh chụp tại
// thời điểm đăng nhập và không rút lại được. Không đối chiếu thì đổi mật khẩu
// không đuổi được kẻ đang chiếm tài khoản, và gỡ một người khỏi ADMIN_EMAILS
// cũng không gỡ được quyền của họ — cả hai đều phải đợi token hết hạn, tới 7
// ngày.
//
// Giá phải trả là một lượt đọc database cho mọi request CÓ đăng nhập. Khách
// vãng lai không tốn thêm gì, vì optionalAuth không gọi tới đây.
async function loadAccount(req, res) {
  if (!req.user) {
    res.status(401).json({ message: 'Bạn cần đăng nhập' });
    return null;
  }
  const account = await User.findById(req.user.sub);
  if (!account) {
    res.status(401).json({ message: 'Tài khoản không còn tồn tại' });
    return null;
  }
  // Token cũ không có trường ver; coi như 0 để token phát trước thay đổi này
  // vẫn dùng được cho tới khi có lý do thật sự để huỷ.
  if ((account.tokenVersion || 0) !== (req.user.ver || 0)) {
    res.status(401).json({ message: 'Phiên đăng nhập đã hết hiệu lực. Hãy đăng nhập lại.' });
    return null;
  }
  req.account = account;
  return account;
}

// Bắt buộc phải là quản trị viên.
exports.requireAdmin = async (req, res, next) => {
  try {
    const account = await loadAccount(req, res);
    if (!account) return;
    // Lấy role từ DATABASE chứ không từ token.
    if (account.role !== 'admin') {
      return res.status(403).json({ message: 'Chỉ quản trị viên mới xem được' });
    }
    next();
  } catch (err) {
    console.error('requireAdmin:', err && err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Bắt buộc phải đăng nhập.
exports.requireAuth = async (req, res, next) => {
  if (!getSecret()) {
    return res.status(503).json({ message: 'Đăng nhập chưa được cấu hình. Thiếu JWT_SECRET.' });
  }
  try {
    if (!(await loadAccount(req, res))) return;
    next();
  } catch (err) {
    console.error('requireAuth:', err && err.message);
    res.status(500).json({ message: 'Server error' });
  }
};
