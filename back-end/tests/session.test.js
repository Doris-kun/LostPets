const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Chặn hẳn đường ra mạng và giữ lại thư để moi mã đặt lại.
const mockSent = [];
// Công tắc để thử cảnh máy chủ chưa cấu hình gửi thư.
let mockMailerOn = true;
jest.mock('../api/lib/mailer', () => ({
  mailerConfigured: () => mockMailerOn,
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
  mockMailerOn = true;
  mockSent.length = 0;
  delete process.env.ADMIN_EMAILS;
  if (rateLimit.reset) rateLimit.reset();
});

afterEach(async () => {
  await User.deleteMany({});
});

// Đăng ký THÔI, chưa xác minh gì cả. Không trả token vì tài khoản chưa dùng
// được — đó là cả điểm của việc bắt xác minh.
const dangKyThoi = (email = 'nguoidung@example.com') =>
  request(app).post('/auth/register')
    .send({ name: 'Người Dùng', email, password: 'matkhaucu' });

// Đi trọn vòng đời thật: đăng ký, bấm đường dẫn trong thư, rồi đăng nhập.
const dangKy = async (email = 'nguoidung@example.com') => {
  await dangKyThoi(email);
  await request(app).post('/auth/verify-email')
    .send({ token: maTrongThu(/verify-email\?token=([a-f0-9]+)/) });
  const { body } = await request(app).post('/auth/login')
    .send({ email, password: 'matkhaucu' });
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
    // dangKy đã đi qua bước xác minh, nên quyền quản trị được cấp luôn.
    return dangKy('sep@example.com');
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
  it('xác minh xong thì được cấp quyền quản trị', async () => {
    process.env.ADMIN_EMAILS = 'sep@example.com';
    await dangKyThoi('sep@example.com');
    await request(app).post('/auth/verify-email')
      .send({ token: maTrongThu(/verify-email\?token=([a-f0-9]+)/) });

    const { body } = await request(app).post('/auth/login')
      .send({ email: 'sep@example.com', password: 'matkhaucu' });

    expect(body.user.emailVerified).toBe(true);
    expect(body.user.role).toBe('admin');
  });

  it('/auth/me báo đã xác minh', async () => {
    await dangKyThoi();

    // Chưa xác minh thì không quan sát được qua /auth/me, vì chưa đăng nhập
    // được. Trạng thái đó chỉ thấy trong database.
    const chua = await User.findOne({ email: 'nguoidung@example.com' });
    expect(chua.emailVerified).toBe(false);

    const token = await (async () => {
      await request(app).post('/auth/verify-email')
        .send({ token: maTrongThu(/verify-email\?token=([a-f0-9]+)/) });
      const { body } = await request(app).post('/auth/login')
        .send({ email: 'nguoidung@example.com', password: 'matkhaucu' });
      return body.token;
    })();

    expect((await goiMe(token)).body.emailVerified).toBe(true);
  });
});

describe('tài khoản không còn thì token cũng không còn', () => {
  it('xoá tài khoản là mọi token của nó hết hiệu lực', async () => {
    const token = await dangKy();
    await User.deleteMany({ email: 'nguoidung@example.com' });

    expect((await goiMe(token)).status).toBe(401);
  });
});
describe('đăng ký bắt buộc xác minh', () => {
  it('đăng ký KHÔNG cấp token khi gửi được thư', async () => {
    const res = await dangKyThoi();

    expect(res.status).toBe(201);
    expect(res.body.verifyRequired).toBe(true);
    expect(res.body.token).toBeUndefined();
    expect(res.body.email).toBe('nguoidung@example.com');
  });

  it('không gửi được thư thì KHÔNG khoá tài khoản lại', async () => {
    mockMailerOn = false;
    const res = await dangKyThoi('khong-co-thu@example.com');

    // Bắt xác minh trong hoàn cảnh không gửi nổi thư nào là tạo ra tài
    // khoản vĩnh viễn không ai vào được.
    expect(res.body.token).toBeTruthy();
    expect(res.body.verifyRequired).toBeUndefined();

    const u = await User.findOne({ email: 'khong-co-thu@example.com' });
    expect(u.emailVerified).toBe(true);
  });

  it('tài khoản Google không bị chặn, vì nhà cung cấp đã xác minh hộ', async () => {
    // Tạo thẳng một tài khoản Google chưa đánh dấu xác minh, giống dữ liệu cũ.
    await User.create({ name: 'Người Google', email: 'g@example.com', google: 'gg-1' });

    // Luồng OAuth tự đánh dấu xác minh, nên không đi qua cửa chặn này. Ở đây
    // chỉ khẳng định cửa chặn nằm ở đường mật khẩu, không chặn nhầm đường khác.
    const res = await request(app).post('/auth/login')
      .send({ email: 'g@example.com', password: 'bat-ky' });
    expect(res.status).toBe(401);
    expect(res.body.verifyRequired).toBeUndefined();
  });
});

describe('xác minh địa chỉ email', () => {
  const maXacMinh = () => maTrongThu(/verify-email\?token=([a-f0-9]+)/);

  it('chỉ BIẾT một địa chỉ trong ADMIN_EMAILS thì KHÔNG vào được gì', async () => {
    process.env.ADMIN_EMAILS = 'sep@example.com';
    const res = await dangKyThoi('sep@example.com');

    // Đây là đường leo thang quyền rẻ nhất có thể có: trước đây ai đoán
    // được địa chỉ quản trị là đăng ký bằng địa chỉ đó và thành admin ngay,
    // không cần mở được hộp thư. Giờ đăng ký không cấp cả token lẫn vai trò.
    expect(res.body.token).toBeUndefined();
    expect(res.body.verifyRequired).toBe(true);

    const u = await User.findOne({ email: 'sep@example.com' });
    expect(u.role).toBe('user');
    expect(u.emailVerified).toBe(false);
  });

  it('chưa xác minh thì KHÔNG đăng nhập được', async () => {
    await dangKyThoi();

    const res = await request(app).post('/auth/login')
      .send({ email: 'nguoidung@example.com', password: 'matkhaucu' });

    // Chặn ở đăng nhập chứ không chặn ở chỗ đăng tin: khách vãng lai vốn
    // đăng tin được mà không cần tài khoản, nên chặn chỗ đó không ngăn được gì.
    expect(res.status).toBe(403);
    expect(res.body.verifyRequired).toBe(true);
    expect(res.body.token).toBeUndefined();
  });

  it('xác minh xong thì đăng nhập được, và mật khẩu vẫn phải đúng', async () => {
    await dangKyThoi();
    await request(app).post('/auth/verify-email')
      .send({ token: maTrongThu(/verify-email\?token=([a-f0-9]+)/) });

    expect((await request(app).post('/auth/login')
      .send({ email: 'nguoidung@example.com', password: 'matkhaucu' })).status).toBe(200);

    // Xác minh không được phép thay thế mật khẩu.
    expect((await request(app).post('/auth/login')
      .send({ email: 'nguoidung@example.com', password: 'sai-mat-khau' })).status).toBe(401);
  });

  it('xác minh xong thì mới được cấp quyền', async () => {
    process.env.ADMIN_EMAILS = 'sep@example.com';
    await dangKyThoi('sep@example.com');

    const res = await request(app).post('/auth/verify-email').send({ token: maXacMinh() });
    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe('admin');

    expect((await request(app).get('/admin/stats')
      .set('Authorization', `Bearer ${res.body.token}`)).status).toBe(200);
  });

  it('mã xác minh chỉ dùng được một lần', async () => {
    await dangKyThoi();
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
