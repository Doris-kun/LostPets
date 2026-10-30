const axios = require('axios');
const { OAuth2Client } = require('google-auth-library');

// Mỗi nhà cung cấp trả về một hình dạng dữ liệu khác nhau. Quy về đúng một
// dạng chung để authController không phải biết Google hay Facebook là gì:
//   { id, email, name, emailVerified }
//
// id là mã định danh của người dùng Ở PHÍA nhà cung cấp, không phải email.
// Phải lưu id chứ không chỉ lưu email: người ta đổi được email Google của mình,
// đổi xong mà hệ thống chỉ biết email cũ thì họ mất luôn tài khoản.

class OAuthError extends Error {}

const HTTP_TIMEOUT_MS = 10000;

let googleClient = null;
const getGoogleClient = () => {
  if (!googleClient) googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  return googleClient;
};

exports.OAuthError = OAuthError;

exports.googleConfigured = () => Boolean(process.env.GOOGLE_CLIENT_ID);
exports.facebookConfigured = () =>
  Boolean(process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET);

// Google gửi về một ID token đã ký. Thư viện tự tải khoá công khai của Google
// và kiểm chữ ký, hạn dùng, và quan trọng nhất là `aud` — token phải được cấp
// cho ĐÚNG ứng dụng này. Thiếu bước kiểm aud thì token lấy từ bất kỳ web nào
// khác cũng đăng nhập được vào đây.
exports.verifyGoogle = async (idToken) => {
  if (!idToken) throw new OAuthError('Thiếu token');
  let payload;
  try {
    const ticket = await getGoogleClient().verifyIdToken({
      idToken: String(idToken),
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    payload = ticket.getPayload();
  } catch {
    throw new OAuthError('Token Google không hợp lệ');
  }

  if (!payload || !payload.sub) throw new OAuthError('Token Google không hợp lệ');
  if (!payload.email) throw new OAuthError('Tài khoản Google này không chia sẻ email');

  return {
    id: String(payload.sub),
    email: String(payload.email).toLowerCase().trim(),
    name: String(payload.name || payload.email.split('@')[0]).trim(),
    emailVerified: payload.email_verified === true,
  };
};

// Facebook không ký token theo kiểu đọc được tại chỗ, phải hỏi ngược lại Graph API.
//
// Cố ý KHÔNG ghim số phiên bản vào địa chỉ. Gọi không ghim thì Facebook dùng
// phiên bản cũ nhất còn sống, tức là địa chỉ này không bao giờ chết vì hết hạn
// phiên bản. Hai trường mình cần (debug_token và id/name/email) có hình dạng
// y hệt nhau qua mọi phiên bản nên không mất gì.
exports.verifyFacebook = async (accessToken) => {
  if (!accessToken) throw new OAuthError('Thiếu token');
  const appId = process.env.FACEBOOK_APP_ID;
  const appToken = `${appId}|${process.env.FACEBOOK_APP_SECRET}`;

  let debug;
  try {
    const res = await axios.get('https://graph.facebook.com/debug_token', {
      params: { input_token: String(accessToken), access_token: appToken },
      timeout: HTTP_TIMEOUT_MS,
    });
    debug = res.data && res.data.data;
  } catch {
    throw new OAuthError('Không kiểm tra được token Facebook');
  }

  // BẮT BUỘC kiểm app_id. Token Facebook là token "mang đi được": một web khác
  // cũng xin được token của chính người dùng đó. Không đối chiếu app_id thì chủ
  // một web bất kỳ lấy token người dùng của họ rồi đăng nhập vào đây được —
  // Google đã kiểm sẵn qua `aud`, Facebook thì phải tự làm.
  if (!debug || debug.is_valid !== true || String(debug.app_id) !== String(appId)) {
    throw new OAuthError('Token Facebook không hợp lệ');
  }

  let me;
  try {
    const res = await axios.get('https://graph.facebook.com/me', {
      params: { fields: 'id,name,email', access_token: String(accessToken) },
      timeout: HTTP_TIMEOUT_MS,
    });
    me = res.data;
  } catch {
    throw new OAuthError('Không đọc được thông tin Facebook');
  }

  if (!me || !me.id) throw new OAuthError('Token Facebook không hợp lệ');
  // Tài khoản Facebook đăng ký bằng số điện thoại thì không có email. Không có
  // email thì không gắn được vào tài khoản sẵn có, cũng không liên hệ được.
  if (!me.email) throw new OAuthError('Tài khoản Facebook này không có email');

  return {
    id: String(me.id),
    email: String(me.email).toLowerCase().trim(),
    name: String(me.name || 'Người dùng Facebook').trim(),
    // Facebook chỉ trả email đã qua xác minh của họ.
    emailVerified: true,
  };
};
