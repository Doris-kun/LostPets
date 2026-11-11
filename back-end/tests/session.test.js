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

// Tìm thư theo NỘI DUNG chứ không lấy cái cuối cùng: một lượt đăng ký sinh
// ra thư xác minh, một lượt quên mật khẩu sinh ra thư đặt lại, và thứ tự
// chúng trong mảng không phải thứ nào cũng đoán được.
const maTrongThu = (mau) => {
  for (let i = mockSent.length - 1; i >= 0; i--) {
    const m = mau.exec(mockSent[i].text);
    if (m) return m[1];
  }
  throw new Error('Không tìm thấy thư khớp mẫu ' + mau);
};

const maTuThu = () => maTrongThu(/reset-password\?token=([a-f0-9]+)/);

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
  // Đăng ký xong PHẢI xác minh hộp thư thì mới được cấp quyền quản trị.
  const dangKyAdmin = async () => {
    process.env.ADMIN_EMAILS = 'sep@example.com';
    await dangKy('sep@example.com');
    await User.updateOne({ email: 'sep@example.com' }, { emailVerified: true });
    const { body } = await request(app).post('/auth/login')
      .send({ email: 'sep@example.com', password: 'matkhaucu' });
    return body.token;
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

describe('trả trạng thái xác minh ra API', () => {
  it('/auth/me nói rõ đã xác minh hay chưa', async () => {
    const token = await dangKy();
    const chua = await goiMe(token);

    // Front-end cần biết để hiện lối vào trang xác minh. Không trả ra thì
    // trang /verify-email không được liên kết từ đâu cả, chỉ tới được bằng
    // đường dẫn trong thư — thư lạc là hết đường.
    expect(chua.body.emailVerified).toBe(false);

    await request(app).post('/auth/verify-email')
      .send({ token: maTrongThu(/verify-email\?token=([a-f0-9]+)/) });

    const { body } = await request(app).post('/auth/login')
      .send({ email: 'nguoidung@example.com', password: 'matkhaucu' });
    expect(body.user.emailVerified).toBe(true);
  });
});

describe('tài khoản không còn thì token cũng không còn', () => {
  it('xoá tài khoản là mọi token của nó hết hiệu lực', async () => {
    const token = await dangKy();
    await User.deleteMany({ email: 'nguoidung@example.com' });

    expect((await goiMe(token)).status).toBe(401);
  });
});
describe('xác minh địa chỉ email', () => {
  const maXacMinh = () => maTrongThu(/verify-email\?token=([a-f0-9]+)/);

  it('chỉ BIẾT một địa chỉ trong ADMIN_EMAILS thì KHÔNG thành quản trị viên', async () => {
    process.env.ADMIN_EMAILS = 'sep@example.com';
    const token = await dangKy('sep@example.com');

    // Đây là đường leo thang quyền rẻ nhất có thể có: trước đây ai đoán
    // được địa chỉ quản trị là đăng ký bằng địa chỉ đó và thành admin ngay,
    // không cần mở được hộp thư.
    expect((await request(app).get('/admin/stats')
      .set('Authorization', `Bearer ${token}`)).status).toBe(403);
  });

  it('chưa xác minh thì ĐĂNG NHẬP LẠI cũng không được cấp quyền', async () => {
    process.env.ADMIN_EMAILS = 'sep@example.com';
    await dangKy('sep@example.com');

    // Đăng nhập là chỗ vai trò được tính lại. Không chặn ở đây thì việc
    // đăng ký không cấp quyền chỉ là chậm một nhịp: đăng nhập lại là có ngay.
    const { body } = await request(app).post('/auth/login')
      .send({ email: 'sep@example.com', password: 'matkhaucu' });

    expect(body.user.role).toBe('user');
    expect((await request(app).get('/admin/stats')
      .set('Authorization', `Bearer ${body.token}`)).status).toBe(403);
  });

  it('xác minh xong thì mới được cấp quyền', async () => {
    process.env.ADMIN_EMAILS = 'sep@example.com';
    await dangKy('sep@example.com');

    const res = await request(app).post('/auth/verify-email').send({ token: maXacMinh() });
    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe('admin');

    expect((await request(app).get('/admin/stats')
      .set('Authorization', `Bearer ${res.body.token}`)).status).toBe(200);
  });

  it('mã xác minh chỉ dùng được một lần', async () => {
    await dangKy();
    const ma = maXacMinh();

    expect((await request(app).post('/auth/verify-email').send({ token: ma })).status).toBe(200);
    expect((await request(app).post('/auth/verify-email').send({ token: ma })).status).toBe(400);
  });

  it('mã bịa thì bị từ chối', async () => {
    await dangKy();
    const res = await request(app).post('/auth/verify-email').send({ token: 'khong-phai-ma-that' });
    expect(res.status).toBe(400);
  });

  it('đặt lại mật khẩu thành công cũng tính là đã xác minh', async () => {
    process.env.ADMIN_EMAILS = 'sep@example.com';
    await dangKy('sep@example.com');
    // Đọc được thư đặt lại tức là mở được hộp thư — bằng chứng tương
    // đương với bấm đường dẫn xác minh.
    await datLaiMatKhau('sep@example.com');

    const { body } = await request(app).post('/auth/login')
      .send({ email: 'sep@example.com', password: 'matkhaumoi' });
    expect(body.user.role).toBe('admin');
  });

  it('gửi lại thư xác minh trả cùng một câu dù email có tồn tại hay không', async () => {
    await dangKy();
    const co = await request(app).post('/auth/resend-verification')
      .send({ email: 'nguoidung@example.com' });
    const khong = await request(app).post('/auth/resend-verification')
      .send({ email: 'khong-ai@example.com' });

    // Cùng lý do với luồng quên mật khẩu: không biến endpoint này thành
    // công cụ dò xem ai đã đăng ký.
    expect(co.status).toBe(200);
    expect(khong.status).toBe(200);
    expect(co.body.message).toBe(khong.body.message);
  });
});
