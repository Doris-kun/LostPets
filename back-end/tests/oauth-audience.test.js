// Kiểm riêng danh sách `aud` mà back-end chấp nhận.
//
// tests/oauth.test.js thay cả module oauth bằng bản giả để kiểm quy tắc gắn
// tài khoản, nên không chạm tới phần này. Ở đây làm ngược lại: giữ nguyên
// oauth thật, chỉ thay thư viện của Google, để soi đúng tham số được truyền
// xuống lúc kiểm token.

const mockVerifyIdToken = jest.fn();
jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({
    verifyIdToken: (...args) => mockVerifyIdToken(...args),
  })),
}));

const { verifyGoogle, OAuthError } = require('../api/lib/oauth');

const WEB = 'web-123.apps.googleusercontent.com';
const IOS = 'ios-456.apps.googleusercontent.com';
const ANDROID = 'android-789.apps.googleusercontent.com';

const okTicket = {
  getPayload: () => ({
    sub: '1234567890',
    email: 'Nguoi.Dung@Example.COM',
    email_verified: true,
    name: 'Người Dùng',
  }),
};

const audiencePassed = () => mockVerifyIdToken.mock.calls[0][0].audience;

beforeEach(() => {
  mockVerifyIdToken.mockReset();
  mockVerifyIdToken.mockResolvedValue(okTicket);
  delete process.env.GOOGLE_CLIENT_ID;
  delete process.env.GOOGLE_CLIENT_ID_IOS;
  delete process.env.GOOGLE_CLIENT_ID_ANDROID;
});

describe('danh sách aud được chấp nhận', () => {
  it('gửi xuống cả ba mã khi khai đủ', async () => {
    process.env.GOOGLE_CLIENT_ID = WEB;
    process.env.GOOGLE_CLIENT_ID_IOS = IOS;
    process.env.GOOGLE_CLIENT_ID_ANDROID = ANDROID;

    await verifyGoogle('token-gia');
    expect(audiencePassed()).toEqual([WEB, IOS, ANDROID]);
  });

  it('bỏ qua mã chưa khai, web vẫn chạy một mình', async () => {
    process.env.GOOGLE_CLIENT_ID = WEB;

    await verifyGoogle('token-gia');
    expect(audiencePassed()).toEqual([WEB]);
  });

  it('bỏ qua cả chuỗi rỗng chứ không chỉ biến thiếu hẳn', async () => {
    process.env.GOOGLE_CLIENT_ID = WEB;
    process.env.GOOGLE_CLIENT_ID_IOS = '';
    process.env.GOOGLE_CLIENT_ID_ANDROID = ANDROID;

    await verifyGoogle('token-gia');
    expect(audiencePassed()).toEqual([WEB, ANDROID]);
  });

  it('không hề gọi thư viện khi chưa khai mã nào', async () => {
    await expect(verifyGoogle('token-gia')).rejects.toThrow(OAuthError);
    expect(mockVerifyIdToken).not.toHaveBeenCalled();
  });

  it('không bao giờ truyền undefined hay null xuống thư viện', async () => {
    // Đây mới là giá trị nguy hiểm. google-auth-library bỏ qua TOÀN BỘ bước
    // kiểm aud khi nhận undefined hoặc null, tức token của ứng dụng bất kỳ
    // cũng đăng nhập được. Mảng rỗng thì ngược lại, nó từ chối sạch.
    // Test này canh để lần sau ai đó đừng viết lại thành một biến trần.
    process.env.GOOGLE_CLIENT_ID = WEB;
    await verifyGoogle('token-gia');
    const aud = audiencePassed();
    expect(Array.isArray(aud)).toBe(true);
    expect(aud).not.toBeUndefined();
    expect(aud).not.toBeNull();
  });

  it('báo đúng là lỗi cấu hình, không đổ cho token', async () => {
    await expect(verifyGoogle('token-gia')).rejects.toThrow('Chưa cấu hình đăng nhập Google');
  });

  it('vẫn chặn khi thiếu token, trước cả khi xét cấu hình', async () => {
    process.env.GOOGLE_CLIENT_ID = WEB;
    await expect(verifyGoogle('')).rejects.toThrow('Thiếu token');
  });

  it('trả về hồ sơ đã chuẩn hoá khi token hợp lệ', async () => {
    process.env.GOOGLE_CLIENT_ID = WEB;
    process.env.GOOGLE_CLIENT_ID_ANDROID = ANDROID;

    const profile = await verifyGoogle('token-gia');
    expect(profile).toEqual({
      id: '1234567890',
      email: 'nguoi.dung@example.com',
      name: 'Người Dùng',
      emailVerified: true,
    });
  });
});
