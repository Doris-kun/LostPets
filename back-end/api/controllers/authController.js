const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../models/userModel');
const { signToken, isAdminEmail } = require('../middleware/auth');
const {
  OAuthError, verifyGoogle, verifyFacebook, googleConfigured, facebookConfigured,
  googleMobileConfigured, facebookPublic,
} = require('../lib/oauth');
const { mailerConfigured, sendMail } = require('../lib/mailer');
const { isExpoToken } = require('../lib/push');

const SALT_ROUNDS = 10;
const MIN_PASSWORD_LENGTH = 6;

const publicUser = (user) => ({
  _id: user._id, name: user.name, email: user.email, role: user.role,
  // Front-end cần biết để hiện lối vào trang xác minh cho ai chưa xác minh.
  // Trạng thái của chính người đang đăng nhập, không phải bí mật.
  emailVerified: Boolean(user.emailVerified),
});

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
      // LUÔN là 'user' dù email có nằm trong ADMIN_EMAILS. Quyền quản trị chỉ
      // đến sau khi xác minh hộp thư — xem hàm vaiTro() ở trên.
      role: 'user',
    });

    // CÓ await, khác với luồng quên mật khẩu. Ở đây không có kênh thời gian
    // nào để lộ, vì đăng ký đã tự báo email trùng bằng mã 409 rồi. Đợi ở đây
    // chỉ là đợi một lượt ghi database; việc gửi thư vẫn bắn-rồi-quên bên
    // trong hàm. Đổi lại được tính xác định: mã xác minh chắc chắn đã lưu
    // xong trước khi người dùng cầm token trong tay.
    await guiThuXacMinh(user);

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
    const expectedRole = vaiTro(user);
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

  // Đăng nhập bằng Google hay Facebook thì chính nhà cung cấp đã xác minh hộp
  // thư trước khi trả email sang đây. Không công nhận điều đó thì người dùng
  // Google vĩnh viễn không xác minh được, vì họ chưa từng đặt mật khẩu.
  user.emailVerified = true;
  // Đồng bộ vai trò mỗi lần đăng nhập, giống hệt đường đăng nhập bằng mật khẩu.
  user.role = vaiTro(user);
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
  res.json({
    google: googleConfigured(),
    // facebookPublic chứ không phải facebookConfigured: endpoint vẫn chạy,
    // chỉ là không chìa nút ra khi ứng dụng Meta còn ở chế độ Development.
    facebook: facebookPublic(),
    // Front-end không dùng tới, đây là chỗ để kiểm từ ngoài rằng biến môi
    // trường cho app mobile đã tới máy chủ. Chỉ true/false, không có giá trị.
    googleMobile: googleMobileConfigured(),
  });
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

// ---------------------------------------------------------- quên mật khẩu

// Thư xác minh sống lâu hơn thư đặt lại mật khẩu: đặt lại là việc gấp, còn
// xác minh thì người ta hay để đó rồi quay lại sau.
const VERIFY_TTL_MS = 24 * 60 * 60 * 1000;

// Chỉ cấp quyền quản trị cho email ĐÃ XÁC MINH.
//
// Không có điều kiện emailVerified thì ai đoán được địa chỉ trong ADMIN_EMAILS
// là đăng ký bằng địa chỉ đó và thành quản trị viên ngay — không cần mở được
// hộp thư. Đây là đường leo thang quyền rẻ nhất có thể có.
const vaiTro = (user) =>
  (user.emailVerified && isAdminEmail(user.email)) ? 'admin' : 'user';

const RESET_TTL_MS = 60 * 60 * 1000; // một giờ
const hashResetToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const appUrl = () => (process.env.APP_URL || 'http://localhost:8080').replace(/\/+$/, '');

// Scheme của ứng dụng điện thoại, để thư đặt lại mật khẩu mở thẳng app thay vì
// bắt người dùng đặt mật khẩu trên trình duyệt rồi tự quay lại app.
//
// PHẢI KHỚP với "scheme" trong mobile/app.json của bản React Native. Đổi một
// bên mà quên bên kia thì đường dẫn im lặng không làm gì — không có lỗi nào
// báo ra, nên để hằng số ở đây kèm ghi chú thay vì rải chuỗi trong thư.
//
// LƯU Ý BẢO MẬT: scheme riêng KHÔNG độc quyền. Trên Android, ứng dụng khác
// cũng khai được "lostpets" và người dùng sẽ thấy hộp chọn ứng dụng; trên iOS
// thì ứng dụng cài trước thắng. Nghĩa là một app độc hại đã nằm sẵn trên máy
// có thể nhận được mã đặt lại. Cách chặn triệt để là App Links / Universal
// Links — dùng chính đường https và cho miền xác minh quyền sở hữu app — mà
// việc đó cần miền riêng và bản app đã ký, chưa làm được ở giai đoạn này.
// Thiệt hại bị chặn hai lớp sẵn có: mã dùng MỘT LẦN và hết hạn sau một giờ.
const MOBILE_SCHEME = 'lostpets';

// Trả về CÙNG MỘT CÂU dù email có tài khoản hay không.
//
// Nếu báo "email không tồn tại" thì trang quên mật khẩu biến thành công cụ dò:
// gõ lần lượt vài nghìn địa chỉ là biết ai có tài khoản ở đây. Với web đăng
// tin thú cưng thì danh sách đó đủ để nhắm mục tiêu lừa đảo.
const RESET_SENT = 'Nếu email này có tài khoản, thư hướng dẫn đã được gửi. Kiểm tra cả hộp thư rác.';

exports.forgotPassword = async (req, res) => {
  if (secretMissing(res)) return;
  if (!mailerConfigured()) {
    return res.status(503).json({ message: 'Chức năng này chưa được cấu hình. Thiếu thiết lập gửi thư.' });
  }

  const email = String((req.body || {}).email || '').trim().toLowerCase();
  if (!email) return res.status(400).json({ message: 'Thiếu email' });

  try {
    const user = await User.findOne({ email }).select('+passwordHash +google +facebook');

    // Không có tài khoản: im lặng, vẫn trả về câu chung.
    if (!user) return res.json({ message: RESET_SENT });

    // Tài khoản tạo bằng Google/Facebook thì chưa từng có mật khẩu để mà quên.
    // Vẫn gửi thư, nhưng chỉ đường về đúng nút họ cần bấm — để họ khỏi ngồi
    // chờ một lá thư đặt lại mật khẩu không bao giờ tới.
    if (!user.passwordHash) {
      const provider = user.google ? 'Google' : 'Facebook';
      // KHÔNG await, và đó là cố ý — đừng thêm await vào.
      //
      // Trả lời phải tốn chừng ấy thời gian dù email có tài khoản hay không.
      // Đợi gửi thư xong mới trả lời thì hai nhánh lệch nhau rất xa — đo trên
      // Render: email không có tài khoản 0,58 giây, email có tài khoản hàng chục
      // giây. Cùng một câu chữ, nhưng đồng hồ tố cáo hết: bấm giờ là dò ra email
      // nào có tài khoản, đúng thứ mà RESET_SENT sinh ra để ngăn.
      //
      // .catch() là bắt buộc: một promise bị bỏ rơi mà văng lỗi sẽ làm Node giết
      // cả tiến trình. sendMail tự nuốt lỗi rồi, đây là lớp chặn cuối.
      sendMail({
        to: email,
        subject: 'LostPets — cách đăng nhập vào tài khoản của bạn',
        text: [
          `Chào ${user.name},`,
          '',
          `Tài khoản này được tạo bằng ${provider}, nên nó chưa từng có mật khẩu.`,
          `Bạn đăng nhập bằng cách bấm nút "Tiếp tục với ${provider}" ở trang đăng nhập.`,
          '',
          `${appUrl()}/login`,
        ].join('\n'),
      }).catch(() => {});
      return res.json({ message: RESET_SENT });
    }

    const token = crypto.randomBytes(32).toString('hex');
    user.resetHash = hashResetToken(token);
    user.resetExpires = new Date(Date.now() + RESET_TTL_MS);
    await user.save();

    const webLink = `${appUrl()}/reset-password?token=${token}`;
    const appLink = `${MOBILE_SCHEME}://reset-password?token=${token}`;
    // KHÔNG await, và đó là cố ý — đừng thêm await vào.
    //
    // Trả lời phải tốn chừng ấy thời gian dù email có tài khoản hay không.
    // Đợi gửi thư xong mới trả lời thì hai nhánh lệch nhau rất xa — đo trên
    // Render: email không có tài khoản 0,58 giây, email có tài khoản hàng chục
    // giây. Cùng một câu chữ, nhưng đồng hồ tố cáo hết: bấm giờ là dò ra email
    // nào có tài khoản, đúng thứ mà RESET_SENT sinh ra để ngăn.
    //
    // .catch() là bắt buộc: một promise bị bỏ rơi mà văng lỗi sẽ làm Node giết
    // cả tiến trình. sendMail tự nuốt lỗi rồi, đây là lớp chặn cuối.
    sendMail({
      to: email,
      subject: 'LostPets — đặt lại mật khẩu',
      text: [
        `Chào ${user.name},`,
        '',
        'Bấm vào đường dẫn dưới đây để đặt mật khẩu mới. Đường dẫn có hiệu lực trong một giờ.',
        '',
        // Đường web đứng TRƯỚC vì nó chạy được với mọi người. Đường app chỉ
        // chạy khi đã cài ứng dụng, mà ứng dụng thì chưa phát hành — để nó
        // đứng đầu là phần lớn người nhận bấm vào một thứ không mở ra gì.
        'Mở bằng trình duyệt:',
        webLink,
        '',
        'Hoặc mở thẳng trong ứng dụng LostPets (nếu bạn đã cài):',
        appLink,
        '',
        'Nếu không phải bạn yêu cầu, cứ bỏ qua thư này — mật khẩu hiện tại vẫn nguyên.',
      ].join('\n'),
    }).catch(() => {});

    res.json({ message: RESET_SENT });
  } catch (err) {
    console.error('forgotPassword:', err && err.message);
    // Vẫn trả về câu chung. Lỗi máy chủ cũng không được làm lộ email nào có
    // tài khoản — một mã 500 đúng lúc cũng là một tín hiệu.
    res.json({ message: RESET_SENT });
  }
};

exports.resetPassword = async (req, res) => {
  if (secretMissing(res)) return;

  const { token, password } = req.body || {};
  if (!token || !password) return res.status(400).json({ message: 'Thiếu thông tin' });
  if (String(password).length < MIN_PASSWORD_LENGTH) {
    return res.status(400).json({ message: `Mật khẩu tối thiểu ${MIN_PASSWORD_LENGTH} ký tự` });
  }

  try {
    const user = await User.findOne({
      resetHash: hashResetToken(String(token)),
      resetExpires: { $gt: new Date() },
    }).select('+resetHash +resetExpires');

    if (!user) {
      return res.status(400).json({ message: 'Đường dẫn không còn hiệu lực. Hãy yêu cầu lại.' });
    }

    user.passwordHash = await bcrypt.hash(String(password), SALT_ROUNDS);
    // Huỷ MỌI phiên đang đăng nhập. Đặt lại mật khẩu là việc người ta làm khi
    // nghi tài khoản bị chiếm; không tăng số này thì token của kẻ chiếm vẫn
    // sống tới 7 ngày và việc đặt lại chắng đuổi được ai.
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    // Đọc được thư đặt lại tức là mở được hộp thư. Đây là bằng chứng tương
    // đương với bấm đường dẫn xác minh, nên không bắt họ làm lại một lần nữa.
    user.emailVerified = true;
    user.role = vaiTro(user);
    // Dùng một lần rồi bỏ. Không xoá thì cùng một đường dẫn đặt lại được mãi,
    // và ai đọc được hộp thư cũ vẫn chiếm được tài khoản.
    user.resetHash = undefined;
    user.resetExpires = undefined;
    await user.save();

    res.json({ message: 'Đã đổi mật khẩu. Hãy đăng nhập lại.' });
  } catch (err) {
    console.error('resetPassword:', err && err.message);
    res.status(500).json({ message: 'Server error' });
  }
};


// ------------------------------------------------ mã thiết bị nhận thông báo

// ------------------------------------------------------ xác minh địa chỉ thư

const hashVerifyToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

// Sinh mã xác minh, lưu BĂM của nó, rồi gửi thư. Không ném lỗi ra ngoài.
async function guiThuXacMinh(user) {
  if (!mailerConfigured()) return false;
  try {
    const token = crypto.randomBytes(32).toString('hex');
    user.verifyHash = hashVerifyToken(token);
    user.verifyExpires = new Date(Date.now() + VERIFY_TTL_MS);
    await user.save();

    const webLink = `${appUrl()}/verify-email?token=${token}`;
    const appLink = `${MOBILE_SCHEME}://verify-email?token=${token}`;
    sendMail({
      to: user.email,
      subject: 'LostPets — xác minh địa chỉ email',
      text: [
        `Chào ${user.name},`,
        '',
        'Bấm vào đường dẫn dưới đây để xác nhận đây đúng là hộp thư của bạn. Đường dẫn có hiệu lực trong 24 giờ.',
        '',
        'Mở bằng trình duyệt:',
        webLink,
        '',
        'Hoặc mở thẳng trong ứng dụng LostPets (nếu bạn đã cài):',
        appLink,
        '',
        'Chưa xác minh thì bạn vẫn đăng tin và dùng web bình thường.',
        '',
        'Nếu không phải bạn đăng ký, cứ bỏ qua thư này.',
      ].join('\n'),
    }).catch(() => {});
    return true;
  } catch (err) {
    console.error('guiThuXacMinh:', err && err.message);
    return false;
  }
}

exports.verifyEmail = async (req, res) => {
  if (secretMissing(res)) return;
  const { token } = req.body || {};
  if (!token) return res.status(400).json({ message: 'Thiếu mã xác minh' });

  try {
    const user = await User.findOne({
      verifyHash: hashVerifyToken(String(token)),
      verifyExpires: { $gt: new Date() },
    }).select('+verifyHash +verifyExpires');

    if (!user) {
      return res.status(400).json({ message: 'Đường dẫn không còn hiệu lực. Hãy yêu cầu gửi lại.' });
    }

    user.emailVerified = true;
    // Dùng một lần rồi bỏ, giống hệt mã đặt lại mật khẩu.
    user.verifyHash = undefined;
    user.verifyExpires = undefined;
    // Chỉ tại đây quyền quản trị mới được cấp, nếu email nằm trong ADMIN_EMAILS.
    user.role = vaiTro(user);
    await user.save();

    // Trả token mới vì vai trò trong token cũ đã lạc hậu.
    res.json({ token: signToken(user), user: publicUser(user) });
  } catch (err) {
    console.error('verifyEmail:', err && err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Trả về CÙNG MỘT CÂU dù email có tài khoản hay không, cùng lý do với luồng
// quên mật khẩu: không biến endpoint này thành công cụ dò xem ai đã đăng ký.
const VERIFY_SENT = 'Nếu địa chỉ này cần xác minh, thư đã được gửi. Kiểm tra cả hộp thư rác.';

exports.resendVerification = async (req, res) => {
  if (!mailerConfigured()) {
    return res.status(503).json({ message: 'Chức năng này chưa được cấu hình. Thiếu thiết lập gửi thư.' });
  }
  const email = String((req.body || {}).email || '').trim().toLowerCase();
  if (!email) return res.status(400).json({ message: 'Thiếu email' });

  try {
    const user = await User.findOne({ email });
    // Không có tài khoản, hoặc đã xác minh rồi: im lặng, vẫn trả câu chung.
    if (user && !user.emailVerified) await guiThuXacMinh(user);
    res.json({ message: VERIFY_SENT });
  } catch (err) {
    console.error('resendVerification:', err && err.message);
    res.json({ message: VERIFY_SENT });
  }
};

exports.savePushToken = async (req, res) => {
  const { token } = req.body || {};
  if (!isExpoToken(token)) return res.status(400).json({ message: 'Mã thiết bị không hợp lệ' });

  try {
    // $addToSet chứ không $push: mở app mười lần thì app gửi lên mười lần
    // cùng một mã, mà $push thì thành mười dòng, và người dùng nhận mười
    // thông báo giống hệt nhau cho mỗi tin mới.
    await User.updateOne({ _id: req.user.sub }, { $addToSet: { pushTokens: String(token) } });
    res.json({ ok: true });
  } catch (err) {
    console.error('savePushToken:', err && err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.removePushToken = async (req, res) => {
  const { token } = req.body || {};
  if (!token) return res.status(400).json({ message: 'Thiếu mã thiết bị' });

  try {
    await User.updateOne({ _id: req.user.sub }, { $pull: { pushTokens: String(token) } });
    res.json({ ok: true });
  } catch (err) {
    console.error('removePushToken:', err && err.message);
    res.status(500).json({ message: 'Server error' });
  }
};
