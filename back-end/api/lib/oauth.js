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

// Mỗi nền tảng một client ID. Google bắt buộc web, iOS và Android đăng ký
// riêng, nên ID token phát cho app mobile mang `aud` khác hẳn bản web — chỉ
// nhận đúng một mã thì mobile đăng nhập là bị từ chối ngay.
//
// Nhận ba mã KHÔNG có nghĩa là lỏng hơn: vẫn phải là một trong ba mã của chính
// dự án này. Token của ứng dụng lạ vẫn bị loại y như trước.
//
// filter(Boolean) bỏ các biến chưa khai, nên thiếu mã mobile thì web vẫn chạy
// bình thường thay vì gãy.
// Báo đã khai hay chưa, KHÔNG trả về giá trị.
//
// Có để kiểm được từ ngoài rằng biến môi trường đã tới nơi. Biến back-end
// không lộ ra đâu cả — đúng như phải thế — nên khai thiếu một biến là im lặng
// hoàn toàn cho tới lúc có người đăng nhập hỏng. Dự án này đã mất một buổi vì
// đúng kiểu im lặng đó ở phía front-end.
//
// An toàn vì client ID là mã công khai, mà ở đây còn không trả cả mã, chỉ trả
// true/false.
exports.googleMobileConfigured = () => ({
  ios: Boolean(process.env.GOOGLE_CLIENT_ID_IOS),
  android: Boolean(process.env.GOOGLE_CLIENT_ID_ANDROID),
});

const googleAudience = () =>
  [
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_ID_IOS,
    process.env.GOOGLE_CLIENT_ID_ANDROID,
  ].filter(Boolean);
exports.facebookConfigured = () =>
  Boolean(process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET);

// Có chìa nút Facebook ra cho mọi người không. MẶC ĐỊNH LÀ KHÔNG.
//
// Khác hẳn facebookConfigured() ở trên, và sự khác nhau đó là cả mục đích:
//   facebookConfigured  -> endpoint có chạy được không
//   facebookPublic      -> có nên vẽ nút ra không
//
// Vì sao mặc định tắt: ứng dụng Meta đang ở chế độ Development, nên chỉ người
// có vai trò trong ứng dụng mới đăng nhập được. Người lạ bấm vào nhận thẳng
// màn hình "App not active" bằng tiếng Anh, không hiểu gì. Một nút chắc chắn
// hỏng nằm giữa màn hình đăng nhập còn tệ hơn là không có nút.
//
// Điều này đặc biệt quan trọng khi chạy UAT: Objective 5 chấm bằng điểm SUS
// do người lạ cho, mà họ sẽ trừ điểm vì một nút hỏng chẳng liên quan gì tới
// chất lượng sản phẩm.
//
// Tính năng KHÔNG bị gỡ: code còn nguyên, test còn nguyên, POST /auth/facebook
// vẫn chạy. Bật lại bằng FACEBOOK_PUBLIC=on bất cứ lúc nào — để demo cho người
// chấm, hoặc khi ứng dụng Meta được duyệt sang Live.
exports.facebookPublic = () =>
  exports.facebookConfigured()
  && String(process.env.FACEBOOK_PUBLIC || 'off').toLowerCase() === 'on';

// Google gửi về một ID token đã ký. Thư viện tự tải khoá công khai của Google
// và kiểm chữ ký, hạn dùng, và quan trọng nhất là `aud` — token phải được cấp
// cho ĐÚNG ứng dụng này. Thiếu bước kiểm aud thì token lấy từ bất kỳ web nào
// khác cũng đăng nhập được vào đây.
exports.verifyGoogle = async (idToken) => {
  if (!idToken) throw new OAuthError('Thiếu token');

  // Danh sách rỗng là lỗi cấu hình phía mình, không phải lỗi người đăng nhập.
  //
  // Mảng rỗng KHÔNG gây lỗ hổng — đã đọc google-auth-library, phần kiểm aud là:
  //
  //   if (typeof requiredAudience !== 'undefined' && requiredAudience !== null) {
  //     if (requiredAudience.constructor === Array)
  //       audVerified = requiredAudience.indexOf(aud) > -1;   // [] -> -1 -> false
  //     if (!audVerified) throw new Error('Wrong recipient...');
  //   }
  //
  // Mảng rỗng làm indexOf trả -1 nên nó TỪ CHỐI SẠCH, an toàn. Thứ nguy hiểm
  // là `undefined` hoặc `null`: cả khối bị bỏ qua, token của ứng dụng bất kỳ
  // cũng lọt. Nên googleAudience() luôn trả về mảng, không bao giờ undefined.
  //
  // Vậy dòng chặn này không phải để vá bảo mật, mà để BÁO ĐÚNG BỆNH: không có
  // nó thì người dùng nhận "Token Google không hợp lệ" trong khi lỗi nằm ở chỗ
  // mình quên khai biến môi trường. Chặn trước khối try để thông báo không bị
  // khối catch nuốt mất.
  //
  // (authController còn một lớp nữa: thiếu GOOGLE_CLIENT_ID thì trả 503 trước
  // khi tới được đây.)
  const audience = googleAudience();
  if (audience.length === 0) throw new OAuthError('Chưa cấu hình đăng nhập Google');

  let payload;
  try {
    const ticket = await getGoogleClient().verifyIdToken({
      idToken: String(idToken),
      audience,
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
