const bcrypt = require('bcryptjs');
const User = require('../models/userModel');
const { signToken } = require('../middleware/auth');

const SALT_ROUNDS = 10;
const MIN_PASSWORD_LENGTH = 6;

const publicUser = (user) => ({ _id: user._id, name: user.name, email: user.email });

const secretMissing = (res) => {
  if (process.env.JWT_SECRET) return false;
  res.status(503).json({ message: 'Đăng nhập chưa được cấu hình. Thiếu JWT_SECRET.' });
  return true;
};

exports.register = async (req, res) => {
  if (secretMissing(res)) return;
  try {
    const { name, email, password } = req.body || {};
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Cần đủ tên, email và mật khẩu' });
    }
    if (String(password).length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({ message: `Mật khẩu cần ít nhất ${MIN_PASSWORD_LENGTH} ký tự` });
    }

    const exists = await User.findOne({ email: String(email).toLowerCase().trim() });
    if (exists) {
      return res.status(409).json({ message: 'Email này đã được đăng ký' });
    }

    const user = await User.create({
      name: String(name).trim(),
      email: String(email).toLowerCase().trim(),
      passwordHash: await bcrypt.hash(String(password), SALT_ROUNDS),
    });

    res.status(201).json({ token: signToken(user), user: publicUser(user) });
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: 'Dữ liệu không hợp lệ' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

exports.login = async (req, res) => {
  if (secretMissing(res)) return;
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ message: 'Cần email và mật khẩu' });
    }

    const user = await User.findOne({ email: String(email).toLowerCase().trim() }).select('+passwordHash');
    // Cùng một thông báo cho email sai và mật khẩu sai, tránh để lộ email nào đã đăng ký.
    const ok = user && (await bcrypt.compare(String(password), user.passwordHash));
    if (!ok) {
      return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng' });
    }

    res.json({ token: signToken(user), user: publicUser(user) });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

// Dùng để front-end kiểm tra token còn hiệu lực sau khi tải lại trang.
exports.me = async (req, res) => {
  try {
    const user = await User.findById(req.user.sub);
    if (!user) return res.status(404).json({ message: 'Không tìm thấy tài khoản' });
    res.json(publicUser(user));
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};
