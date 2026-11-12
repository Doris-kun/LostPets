const request = require('supertest');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Chặn hẳn đường ra mạng và giữ lại thư để đọc nội dung.
let mockMailerOn = true;
// Bật lên thì sendMail trả về một promise KHÔNG BAO GIỜ xong — giả cảnh máy
// chủ thư nhận kết nối rồi im luôn. Đó là cách duy nhất chứng minh luồng trả
// lời không đứng đợi gửi thư.
let mockMailHangs = false;
const mockSent = [];
jest.mock('../api/lib/mailer', () => ({
  mailerConfigured: () => mockMailerOn,
  sendMail: (mail) => {
    mockSent.push(mail);
    if (mockMailHangs) return new Promise(() => {});
    return Promise.resolve(true);
  },
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
  mockMailHangs = false;
  mockSent.length = 0;
  if (rateLimit.reset) rateLimit.reset();
});

afterEach(async () => {
  await User.deleteMany({});
});

const seedWithPassword = () => User.create({
  name: 'Người Dùng',
  email: 'nguoidung@example.com',
  passwordHash: bcrypt.hashSync('matkhaucu', 10),
  // Đánh dấu sẵn đã xác minh: từ khi đăng ký bắt buộc xác minh, tài khoản
  // chưa xác minh không đăng nhập được. Bộ test này nói về quên mật khẩu,
  // không nói về xác minh — để false thì nó đỏ vì một lý do chẳng liên quan.
  emailVerified: true,
});

const seedGoogleOnly = () => User.create({
  name: 'Người Google',
  email: 'google@example.com',
  google: 'google-id-123',
});

const forgot = (email) => request(app).post('/auth/forgot-password').send({ email });
const reset = (token, password) => request(app).post('/auth/reset-password').send({ token, password });

// Lấy mã từ đường dẫn trong thư, đúng như người dùng bấm vào.
const tokenFromMail = () => {
  const m = /reset-password\?token=([a-f0-9]+)/.exec(mockSent[mockSent.length - 1].text);
  return m && m[1];
};

describe('không để lộ email nào có tài khoản', () => {
  it('email CÓ tài khoản và email KHÔNG có trả về cùng một câu', async () => {
    await seedWithPassword();

    const co = await forgot('nguoidung@example.com');
    const khong = await forgot('khongaica@example.com');

    expect(co.status).toBe(200);
    expect(khong.status).toBe(200);
    expect(co.body.message).toBe(khong.body.message);
  });

  it('email không có tài khoản thì không gửi thư nào', async () => {
    await forgot('khongaica@example.com');
    expect(mockSent).toHaveLength(0);
  });
});

describe('tài khoản có mật khẩu', () => {
  it('gửi thư kèm đường dẫn đặt lại', async () => {
    await seedWithPassword();
    await forgot('nguoidung@example.com');

    expect(mockSent).toHaveLength(1);
    expect(mockSent[0].to).toBe('nguoidung@example.com');
    expect(mockSent[0].text).toContain('https://lostpets.test/reset-password?token=');
  });

  it('đổi được mật khẩu rồi đăng nhập bằng mật khẩu mới', async () => {
    await seedWithPassword();
    await forgot('nguoidung@example.com');

    const res = await reset(tokenFromMail(), 'matkhaumoi');
    expect(res.status).toBe(200);

    const cu = await request(app).post('/auth/login')
      .send({ email: 'nguoidung@example.com', password: 'matkhaucu' });
    const moi = await request(app).post('/auth/login')
      .send({ email: 'nguoidung@example.com', password: 'matkhaumoi' });

    expect(cu.status).toBe(401);
    expect(moi.status).toBe(200);
  });

  it('mã chỉ dùng được MỘT lần', async () => {
    await seedWithPassword();
    await forgot('nguoidung@example.com');
    const token = tokenFromMail();

    expect((await reset(token, 'matkhaumoi')).status).toBe(200);
    // Ai đọc được hộp thư cũ cũng không chiếm lại được tài khoản.
    expect((await reset(token, 'matkhaukhac')).status).toBe(400);
  });

  it('mã hết hạn thì từ chối', async () => {
    const user = await seedWithPassword();
    await forgot('nguoidung@example.com');
    const token = tokenFromMail();

    await User.updateOne({ _id: user._id }, { $set: { resetExpires: new Date(Date.now() - 1000) } });

    expect((await reset(token, 'matkhaumoi')).status).toBe(400);
  });

  it('mã bịa ra thì từ chối', async () => {
    await seedWithPassword();
    expect((await reset('a'.repeat(64), 'matkhaumoi')).status).toBe(400);
  });

  it('mật khẩu mới quá ngắn thì từ chối', async () => {
    await seedWithPassword();
    await forgot('nguoidung@example.com');

    const res = await reset(tokenFromMail(), 'abc');
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/tối thiểu/);
  });

  it('thiếu mã hoặc thiếu mật khẩu thì từ chối', async () => {
    expect((await reset('', 'matkhaumoi')).status).toBe(400);
    expect((await reset('a'.repeat(64), '')).status).toBe(400);
  });
});

describe('tài khoản tạo bằng Google', () => {
  it('không tạo mã đặt lại, vì tài khoản chưa từng có mật khẩu', async () => {
    const user = await seedGoogleOnly();
    await forgot('google@example.com');

    const raw = await User.findById(user._id).select('+resetHash');
    expect(raw.resetHash).toBeUndefined();
  });

  it('vẫn gửi thư, nhưng chỉ đường về nút Google', async () => {
    await seedGoogleOnly();
    await forgot('google@example.com');

    expect(mockSent).toHaveLength(1);
    expect(mockSent[0].text).toContain('Google');
    expect(mockSent[0].text).not.toContain('reset-password?token=');
  });
});

describe('chưa cấu hình gửi thư', () => {
  it('báo 503 thay vì im lặng nuốt thư', async () => {
    mockMailerOn = false;
    await seedWithPassword();

    const res = await forgot('nguoidung@example.com');
    expect(res.status).toBe(503);
    expect(mockSent).toHaveLength(0);
  });
});

describe('mã băm không được lọt ra ngoài', () => {
  it('phản hồi đăng nhập không chứa resetHash', async () => {
    await seedWithPassword();
    await forgot('nguoidung@example.com');

    const res = await request(app).post('/auth/login')
      .send({ email: 'nguoidung@example.com', password: 'matkhaucu' });

    expect(JSON.stringify(res.body)).not.toContain('resetHash');
    expect(res.body.user.resetHash).toBeUndefined();
  });

  it('database lưu BĂM chứ không lưu mã trong thư', async () => {
    const user = await seedWithPassword();
    await forgot('nguoidung@example.com');

    const raw = await User.findById(user._id).select('+resetHash');
    expect(raw.resetHash).toBeTruthy();
    expect(raw.resetHash).not.toBe(tokenFromMail());
  });
});
describe('thư kèm đường mở thẳng ứng dụng điện thoại', () => {
  it('có cả đường web lẫn đường app', async () => {
    await seedWithPassword();
    await forgot('nguoidung@example.com');

    const { text } = mockSent[0];
    expect(text).toContain('https://lostpets.test/reset-password?token=');
    expect(text).toContain('lostpets://reset-password?token=');
  });

  it('hai đường mang CÙNG một mã', async () => {
    await seedWithPassword();
    await forgot('nguoidung@example.com');

    const { text } = mockSent[0];
    const web = /https:\/\/lostpets\.test\/reset-password\?token=([a-f0-9]+)/.exec(text);
    const app = /lostpets:\/\/reset-password\?token=([a-f0-9]+)/.exec(text);
    // Lấy nhầm mã cho một trong hai đường thì đường đó im lặng hỏng: người
    // dùng bấm vào, app mở ra, rồi báo mã không hợp lệ mà không ai hiểu vì sao.
    expect(app[1]).toBe(web[1]);
  });

  it('mã lấy từ đường app đặt lại được mật khẩu thật', async () => {
    await seedWithPassword();
    await forgot('nguoidung@example.com');

    const token = /lostpets:\/\/reset-password\?token=([a-f0-9]+)/.exec(mockSent[0].text)[1];
    // Đây mới là thứ cần chứng minh: đường deep link không chỉ có mặt trong
    // thư mà còn dùng được từ đầu đến cuối.
    expect((await reset(token, 'matkhaumoi')).status).toBe(200);
  });

  it('đường web đứng TRƯỚC đường app', async () => {
    await seedWithPassword();
    await forgot('nguoidung@example.com');

    const { text } = mockSent[0];
    // Ứng dụng chưa phát hành, nên phần lớn người nhận không cài nó. Để đường
    // app đứng đầu là họ bấm vào một thứ không mở ra gì.
    expect(text.indexOf('https://lostpets.test/reset-password'))
      .toBeLessThan(text.indexOf('lostpets://reset-password'));
  });

  it('thư cho tài khoản Google KHÔNG kèm đường đặt lại nào', async () => {
    await User.create({
      name: 'Người Dùng', email: 'google@example.com', google: 'google-123',
    });
    await forgot('google@example.com');

    // Tài khoản chưa từng có mật khẩu thì không có gì để đặt lại — cả hai
    // đường đều phải vắng mặt, kể cả đường deep link vừa thêm.
    expect(mockSent[0].text).not.toContain('reset-password?token=');
    expect(mockSent[0].text).not.toContain('lostpets://');
  });
});
describe('không đứng đợi máy chủ thư', () => {
  it('trả lời ngay cả khi máy chủ thư treo hẳn', async () => {
    mockMailHangs = true;
    await seedWithPassword();

    const t0 = Date.now();
    const res = await forgot('nguoidung@example.com');

    // Có await trước sendMail thì dòng này không bao giờ tới, Jest hết giờ.
    expect(res.status).toBe(200);
    expect(Date.now() - t0).toBeLessThan(1000);
  });

  it('vẫn lưu mã đặt lại dù thư chưa gửi xong', async () => {
    mockMailHangs = true;
    const user = await seedWithPassword();
    await forgot('nguoidung@example.com');

    // Trả lời sớm không được phép bỏ qua việc chính: mã phải nằm trong
    // database trước khi thư đi, nếu không thì người dùng bấm vào đường dẫn
    // nhanh tay sẽ gặp mã không hợp lệ.
    const raw = await User.findById(user._id).select('+resetHash +resetExpires');
    expect(raw.resetHash).toBeTruthy();
    expect(raw.resetExpires.getTime()).toBeGreaterThan(Date.now());
  });

  it('email KHÔNG có tài khoản và email CÓ tài khoản trả lời gần bằng nhau', async () => {
    mockMailHangs = true;
    await seedWithPassword();

    const t1 = Date.now();
    await forgot('khong-ai-dung@example.com');
    const khongCo = Date.now() - t1;

    const t2 = Date.now();
    await forgot('nguoidung@example.com');
    const co = Date.now() - t2;

    // Cùng một câu chữ mà lệch thời gian thì vẫn lộ: bấm giờ là dò ra email
    // nào có tài khoản. Ngưỡng rộng vì máy chạy test hay giật, nhưng đủ chật
    // để bắt trường hợp đứng đợi gửi thư — lúc đó chên lệch là vô hạn.
    expect(Math.abs(co - khongCo)).toBeLessThan(500);
  });
});
