const request = require('supertest');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Chặn hẳn đường ra mạng. Test này kiểm quy tắc GẮN TÀI KHOẢN của chính mình,
// không kiểm Google hay Facebook có hoạt động không.
const mockVerifyGoogle = jest.fn();
const mockVerifyFacebook = jest.fn();
jest.mock('../api/lib/oauth', () => {
  const real = jest.requireActual('../api/lib/oauth');
  return {
    ...real,
    verifyGoogle: (...args) => mockVerifyGoogle(...args),
    verifyFacebook: (...args) => mockVerifyFacebook(...args),
  };
});
const { OAuthError } = jest.requireActual('../api/lib/oauth');

process.env.JWT_SECRET = 'test-secret-chi-dung-trong-test';
process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
process.env.FACEBOOK_APP_ID = 'test-fb-app';
process.env.FACEBOOK_APP_SECRET = 'test-fb-secret';
process.env.ADMIN_EMAILS = 'sep@example.com';

const app = require('../app');
const rateLimit = require('../api/middleware/rateLimit');
const User = require('../api/models/userModel');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
}, 30000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(() => {
  rateLimit.reset();
  mockVerifyGoogle.mockReset();
  mockVerifyFacebook.mockReset();
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) await collections[key].deleteMany({});
});

const profile = (over = {}) => ({
  id: 'google-123', email: 'nam@example.com', name: 'Nam', emailVerified: true, ...over,
});

const loginGoogle = () => request(app).post('/auth/google').send({ credential: 'bat-ky' });
const loginFacebook = () => request(app).post('/auth/facebook').send({ accessToken: 'bat-ky' });

describe('POST /auth/google', () => {
  it('tạo tài khoản mới khi chưa có gì trùng', async () => {
    mockVerifyGoogle.mockResolvedValue(profile());

    const res = await loginGoogle();

    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user.email).toBe('nam@example.com');
    expect(res.body.user.name).toBe('Nam');
    expect(await User.countDocuments()).toBe(1);
  });

  it('tài khoản tạo kiểu này không có mật khẩu mà vẫn lưu được', async () => {
    mockVerifyGoogle.mockResolvedValue(profile());

    await loginGoogle();

    const user = await User.findOne().select('+passwordHash +google');
    expect(user.passwordHash).toBeUndefined();
    expect(user.google).toBe('google-123');
  });

  it('lần đăng nhập thứ hai dùng lại tài khoản cũ, không tạo thêm', async () => {
    mockVerifyGoogle.mockResolvedValue(profile());

    await loginGoogle();
    await loginGoogle();

    expect(await User.countDocuments()).toBe(1);
  });

  it('nhận ra người cũ kể cả khi họ đã đổi email ở Google', async () => {
    mockVerifyGoogle.mockResolvedValue(profile());
    await loginGoogle();

    mockVerifyGoogle.mockResolvedValue(profile({ email: 'nam-moi@example.com' }));
    const res = await loginGoogle();

    // Khớp theo mã định danh chứ không theo email, nên vẫn là một người.
    expect(await User.countDocuments()).toBe(1);
    expect(res.body.user.email).toBe('nam@example.com');
  });

  it('gắn vào tài khoản mật khẩu sẵn có khi email đã được xác minh', async () => {
    await request(app).post('/auth/register')
      .send({ name: 'Nam cũ', email: 'nam@example.com', password: 'matkhau123' });
    mockVerifyGoogle.mockResolvedValue(profile());

    const res = await loginGoogle();

    expect(res.status).toBe(200);
    expect(await User.countDocuments()).toBe(1);
    expect(res.body.user.name).toBe('Nam cũ');
    expect((await User.findOne().select('+google')).google).toBe('google-123');
  });

  it('sau khi gắn thì vẫn đăng nhập được bằng mật khẩu như cũ', async () => {
    await request(app).post('/auth/register')
      .send({ name: 'Nam', email: 'nam@example.com', password: 'matkhau123' });
    mockVerifyGoogle.mockResolvedValue(profile());
    await loginGoogle();

    const res = await request(app).post('/auth/login')
      .send({ email: 'nam@example.com', password: 'matkhau123' });

    expect(res.status).toBe(200);
  });

  it('TỪ CHỐI gắn khi nhà cung cấp không xác minh email', async () => {
    await request(app).post('/auth/register')
      .send({ name: 'Nam thật', email: 'nam@example.com', password: 'matkhau123' });
    mockVerifyGoogle.mockResolvedValue(profile({ emailVerified: false }));

    const res = await loginGoogle();

    // Nhận email chưa xác minh thì kẻ gian chỉ cần tạo một tài khoản mang
    // email của người khác là chiếm được tài khoản ở đây, kèm mọi tin đã đăng.
    expect(res.status).toBe(403);
    expect((await User.findOne().select('+google')).google).toBeNull();
  });

  it('cấp quyền admin nếu email nằm trong ADMIN_EMAILS', async () => {
    mockVerifyGoogle.mockResolvedValue(profile({ email: 'sep@example.com', id: 'g-sep' }));

    const res = await loginGoogle();

    expect(res.body.user.role).toBe('admin');
  });

  it('token nhà cung cấp hỏng thì trả 401, không tạo tài khoản', async () => {
    mockVerifyGoogle.mockRejectedValue(new OAuthError('Token Google không hợp lệ'));

    const res = await loginGoogle();

    expect(res.status).toBe(401);
    expect(await User.countDocuments()).toBe(0);
  });

  it('không bao giờ để lọt mã định danh hay mật khẩu ra response', async () => {
    mockVerifyGoogle.mockResolvedValue(profile());

    const res = await loginGoogle();

    expect(res.body.user.google).toBeUndefined();
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  it('trả 503 khi chưa cấu hình GOOGLE_CLIENT_ID', async () => {
    const saved = process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_ID;

    expect((await loginGoogle()).status).toBe(503);

    process.env.GOOGLE_CLIENT_ID = saved;
  });
});

describe('POST /auth/facebook', () => {
  it('tạo tài khoản mới và lưu mã định danh Facebook', async () => {
    mockVerifyFacebook.mockResolvedValue({
      id: 'fb-999', email: 'hieu@example.com', name: 'Híu', emailVerified: true,
    });

    const res = await loginFacebook();

    expect(res.status).toBe(200);
    expect((await User.findOne().select('+facebook')).facebook).toBe('fb-999');
  });

  it('một người gắn được cả Google lẫn Facebook vào cùng tài khoản', async () => {
    mockVerifyGoogle.mockResolvedValue(profile());
    await loginGoogle();
    mockVerifyFacebook.mockResolvedValue({
      id: 'fb-777', email: 'nam@example.com', name: 'Nam', emailVerified: true,
    });

    await loginFacebook();

    const user = await User.findOne().select('+google +facebook');
    expect(await User.countDocuments()).toBe(1);
    expect(user.google).toBe('google-123');
    expect(user.facebook).toBe('fb-777');
  });

  it('trả 503 khi thiếu FACEBOOK_APP_SECRET', async () => {
    const saved = process.env.FACEBOOK_APP_SECRET;
    delete process.env.FACEBOOK_APP_SECRET;

    expect((await loginFacebook()).status).toBe(503);

    process.env.FACEBOOK_APP_SECRET = saved;
  });
});

describe('đăng nhập bằng mật khẩu khi tài khoản không có mật khẩu', () => {
  it('trả 401 chứ không phải 500', async () => {
    mockVerifyGoogle.mockResolvedValue(profile());
    await loginGoogle();

    const res = await request(app).post('/auth/login')
      .send({ email: 'nam@example.com', password: 'doan-bua' });

    // bcrypt.compare(mật khẩu, undefined) là ném lỗi. Không chặn trước thì
    // người dùng nhận "lỗi máy chủ" trong khi thật ra chỉ là sai cách đăng nhập.
    expect(res.status).toBe(401);
  });

  it('vẫn dùng chung một thông báo với trường hợp sai mật khẩu', async () => {
    await User.create({
      name: 'Có mật khẩu', email: 'co@example.com',
      passwordHash: await bcrypt.hash('matkhau123', 10),
    });
    mockVerifyGoogle.mockResolvedValue(profile({ email: 'khong@example.com', id: 'g-2' }));
    await loginGoogle();

    const sai = await request(app).post('/auth/login')
      .send({ email: 'co@example.com', password: 'sai-mat-khau' });
    const khongCo = await request(app).post('/auth/login')
      .send({ email: 'khong@example.com', password: 'bat-ky' });

    // Thông báo khác nhau là lộ tài khoản nào tồn tại và đăng ký kiểu gì.
    expect(khongCo.body.message).toBe(sai.body.message);
  });
});

describe('GET /auth/providers', () => {
  it('cho front-end biết nên vẽ nút nào', async () => {
    const res = await request(app).get('/auth/providers');

    expect(res.body).toEqual({ google: true, facebook: true });
  });

  it('báo false cho nhà cung cấp chưa cấu hình', async () => {
    const saved = process.env.FACEBOOK_APP_ID;
    delete process.env.FACEBOOK_APP_ID;

    expect((await request(app).get('/auth/providers')).body.facebook).toBe(false);

    process.env.FACEBOOK_APP_ID = saved;
  });
});
