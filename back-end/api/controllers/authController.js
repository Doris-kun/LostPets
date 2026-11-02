const bcrypt = require('bcryptjs');
const User = require('../models/userModel');
const { signToken, isAdminEmail } = require('../middleware/auth');
const {
  OAuthError, verifyGoogle, verifyFacebook, googleConfigured, facebookConfigured,
} = require('../lib/oauth');

const SALT_ROUNDS = 10;
const MIN_PASSWORD_LENGTH = 6;

const publicUser = (user) => ({ _id: user._id, name: user.name, email: user.email, role: user.role });

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

    const normalisedEmail = String(email).toLowerCase().trim();
    const user = await User.create({
      name: String(name).trim(),
      email: normalisedEmail,
      passwordHash: await bcrypt.hash(String(password), SALT_ROUNDS),
      role: isAdminEmail(normalisedEmail) ? 'admin' : 'user',
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
    // Tài khoản tạo bằng Google hoặc Facebook không có passwordHash. Phải chặn
    // trước khi gọi bcrypt.compare, vì truyền undefined vào đó là ném lỗi và
    // người dùng nhận 500 thay vì "sai mật khẩu".
    const ok = user && user.passwordHash
      && (await bcrypt.compare(String(password), user.passwordHash));
    if (!ok) {
      return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng' });
    }

    // Đồng bộ lại vai trò mỗi lần đăng nhập, để thêm hoặc bỏ quản trị viên
    // chỉ cần sửa ADMIN_EMAILS rồi đăng nhập lại, không phải động vào database.
    const shouldBeAdmin = isAdminEmail(user.email);
    const expectedRole = shouldBeAdmin ? 'admin' : 'user';
    if (user.role !== expectedRole) {
      user.role = expectedRole;
      await user.save();
    }

    res.json({ token: signToken(user), user: publicUser(user) });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

// Đăng nhập bằng Google hoặc Facebook.
//
// Quy tắc GẮN TÀI KHOẢN là chỗ dễ sai nhất ở đây, nên viết rõ:
//
// 1. Có tài khoản mang đúng mã định danh đó rồi  -> đăng nhập vào tài khoản đó.
// 2. Chưa có, nhưng email trùng một tài khoản cũ -> gắn thêm, VỚI ĐIỀU KIỆN
//    nhà cung cấp khẳng định email đã xác minh.
// 3. Không có gì trùng                           -> tạo tài khoản mới, không mật khẩu.
//
// Điều kiện "đã xác minh" ở bước 2 không phải thủ tục cho đẹp. Nếu nhận cả
// email chưa xác minh thì ai đó tạo một tài khoản ở nhà cung cấp với email
// nam@gmail.com mà không cần chứng minh mình sở hữu hộp thư đó, rồi đăng nhập
// vào đây và chiếm trọn tài khoản của người tên Nam — kèm mọi tin đã đăng.
async function signInWithProvider(res, provider, profile) {
  // Mã định danh có select: false nên phải xin rõ mới đọc được.
  const byProvider = await User.findOne({ [provider]: profile.id }).select(`+${provider}`);
  let user = byProvider;

  if (!user) {
    const byEmail = await User.findOne({ email: profile.email });
    if (byEmail) {
      if (!profile.emailVerified) {
        return res.status(403).json({
          message: 'Email này đã có tài khoản. Hãy đăng nhập bằng mật khẩu.',
        });
      }
      byEmail[provider] = profile.id;
      user = byEmail;
    } else {
      user = new User({ name: profile.name, email: profile.email, [provider]: profile.id });
    }
  }

  // Đồng bộ vai trò mỗi lần đăng nhập, giống hệt đường đăng nhập bằng mật khẩu.
  user.role = isAdminEmail(user.email) ? 'admin' : 'user';
  await user.save();

  res.json({ token: signToken(user), user: publicUser(user) });
}

function handleProviderError(res, err) {
  if (err instanceof OAuthError) return res.status(401).json({ message: err.message });
  // Email trùng mà không bắt được ở trên: hai lượt đăng nhập chạy song song.
  if (err.code === 11000) {
    return res.status(409).json({ message: 'Email này đã được đăng ký' });
  }
  console.error('OAuth error:', err && err.message);
  return res.status(500).json({ message: 'Server error' });
}

exports.google = async (req, res) => {
  if (secretMissing(res)) return;
  if (!googleConfigured()) {
    return res.status(503).json({ message: 'Đăng nhập Google chưa được cấu hình. Thiếu GOOGLE_CLIENT_ID.' });
  }
  try {
    const profile = await verifyGoogle((req.body || {}).credential);
    await signInWithProvider(res, 'google', profile);
  } catch (err) {
    handleProviderError(res, err);
  }
};

exports.facebook = async (req, res) => {
  if (secretMissing(res)) return;
  if (!facebookConfigured()) {
    return res.status(503).json({ message: 'Đăng nhập Facebook chưa được cấu hình. Thiếu FACEBOOK_APP_ID hoặc FACEBOOK_APP_SECRET.' });
  }
  try {
    const profile = await verifyFacebook((req.body || {}).accessToken);
    await signInWithProvider(res, 'facebook', profile);
  } catch (err) {
    handleProviderError(res, err);
  }
};

// Cho front-end biết nên hiện nút nào. Chưa cấu hình mà vẫn vẽ nút ra thì
// người dùng bấm vào chỉ nhận lỗi.
exports.providers = (_req, res) => {
  res.json({ google: googleConfigured(), facebook: facebookConfigured() });
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
