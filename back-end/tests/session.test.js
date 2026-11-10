const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Chặn hẳn đường ra mạng và giữ lại thư để moi mã đặt lại.
const mockSent = [];
jest.mock('../api/lib/mailer', () => ({
  mailerConfigured: () => true,
  sendMail: (mail) => { mockSent.push(mail); return Promise.resolve(true); },
}));

process.env.JWT_SECRET = 'test-secret-chi-dung-trong-test';
process.env.APP_URL = 'https://lostpets.test';

const app = require('../app');
const User = require('../api/models/userModel');
const rateLimit = require('../api/middleware/rateLimit');

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
  mockSent.length = 0;
  delete process.env.ADMIN_EMAILS;
  if (rateLimit.reset) rateLimit.reset();
});

afterEach(async () => {
  await User.deleteMany({});
});

const dangKy = async (email = 'nguoidung@example.com') => {
  const { body } = await request(app).post('/auth/register')
    .send({ name: 'Người Dùng', email, password: 'matkhaucu' });
  return body.token;
};

const goiMe = (token) =>
  request(app).get('/auth/me').set('Authorization', `Bearer ${token}`);

const maTuThu = () =>
  /reset-password\?token=([a-f0-9]+)/.exec(mockSent[mockSent.length - 1].text)[1];

const datLaiMatKhau = async (email) => {
  await request(app).post('/auth/forgot-password').send({ email });
  return request(app).post('/auth/reset-password')
    .send({ token: maTuThu(), password: 'matkhaumoi' });
};

describe('đặt lại mật khẩu đuổi được phiên đang mở', () => {
  it('token cũ hết hiệu lực ngay sau khi đặt lại', async () => {
    const tokenCu = await dangKy();
    expect((await goiMe(tokenCu)).status).toBe(200);

    await datLaiMatKhau('nguoidung@example.com');

    // Đây là cả lý do tồn tại của tokenVersion. Người ta đặt lại mật khẩu KHI
    // nghi tài khoản bị chiếm; token cũ còn sống thì việc đặt lại vô nghĩa.
    expect((await goiMe(tokenCu)).status).toBe(401);
  });

  it('đăng nhập lại bằng mật khẩu mới thì dùng được bình thường', async () => {
    await dangKy();
    await datLaiMatKhau('nguoidung@example.com');

    const { body } = await request(app).post('/auth/login')
      .send({ email: 'nguoidung@example.com', password: 'matkhaumoi' });
    expect((await goiMe(body.token)).status).toBe(200);
  });

  it('đặt lại hai lần thì token của lần một cũng chết', async () => {
    await dangKy();
    await datLaiMatKhau('nguoidung@example.com');
    const { body } = await request(app).post('/auth/login')
      .send({ email: 'nguoidung@example.com', password: 'matkhaumoi' });

    await request(app).post('/auth/forgot-password').send({ email: 'nguoidung@example.com' });
    await request(app).post('/auth/reset-password')
      .send({ token: maTuThu(), password: 'matkhauthuba' });

    expect((await goiMe(body.token)).status).toBe(401);
  });

  it('mã đặt lại của người này KHÔNG đụng tới phiên của người khác', async () => {
    const tokenA = await dangKy('a@example.com');
    await dangKy('b@example.com');

    await datLaiMatKhau('b@example.com');

    expect((await goiMe(tokenA)).status).toBe(200);
  });
});

describe('quyền quản trị lấy từ database, không lấy từ token', () => {
  const dangKyAdmin = async () => {
    process.env.ADMIN_EMAILS = 'sep@example.com';
    const token = await dangKy('sep@example.com');
    return token;
  };

  it('quản trị viên vào được trang quản trị', async () => {
    const token = await dangKyAdmin();
    expect((await request(app).get('/admin/stats')
      .set('Authorization', `Bearer ${token}`)).status).toBe(200);
  });

  it('hạ quyền trong database thì MẤT quyền ngay, không đợi token hết hạn', async () => {
    const token = await dangKyAdmin();
    await User.updateOne({ email: 'sep@example.com' }, { role: 'user' });

    // Token vẫn ghi role admin. Tin token thì người vừa bị gỡ quyền còn làm
    // quản trị viên thêm 7 ngày nữa.
    expect((await request(app).get('/admin/stats')
      .set('Authorization', `Bearer ${token}`)).status).toBe(403);
  });

  it('nâng quyền trong database thì có quyền ngay', async () => {
    const token = await dangKy('thuong@example.com');
    expect((await request(app).get('/admin/stats')
      .set('Authorization', `Bearer ${token}`)).status).toBe(403);

    await User.updateOne({ email: 'thuong@example.com' }, { role: 'admin' });
    expect((await request(app).get('/admin/stats')
      .set('Authorization', `Bearer ${token}`)).status).toBe(200);
  });
});

describe('tài khoản không còn thì token cũng không còn', () => {
  it('xoá tài khoản là mọi token của nó hết hiệu lực', async () => {
    const token = await dangKy();
    await User.deleteMany({ email: 'nguoidung@example.com' });

    expect((await goiMe(token)).status).toBe(401);
  });
});
