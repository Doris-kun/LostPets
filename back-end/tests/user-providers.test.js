const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const User = require('../api/models/userModel');

// Canh đúng một cái bẫy đã làm sập chức năng đăng ký trên web thật.
//
// Chỉ mục trên google và facebook là unique + sparse. sparse CHỈ bỏ qua tài
// liệu không có trường đó; trường có mặt mà mang null thì vẫn bị đánh chỉ mục,
// nên unique chỉ cho phép đúng MỘT tài liệu mang null.
//
// Schema từng khai `default: null`, tức mọi user mới đều mang null. Người đầu
// tiên chiếm chỗ, người thứ hai trở đi nhận lỗi trùng khoá 11000 — không ai
// đăng ký mới được nữa, kể cả bằng mật khẩu.
//
// Những test dưới đây sẽ GÃY nếu ai đó thêm lại `default: null`.

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  // Bắt buộc: chờ chỉ mục dựng xong. Không có dòng này thì test chèn dữ liệu
  // trước khi có chỉ mục, mọi thứ đều "qua" và cái bẫy lọt lưới.
  await User.init();
}, 30000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await User.deleteMany({});
});

const make = (n) => ({
  name: `Người ${n}`,
  email: `nguoi${n}@example.com`,
  passwordHash: `bam-gia-${n}`,
});

describe('tài khoản chưa gắn nhà cung cấp', () => {
  it('hai người cùng đăng ký bằng mật khẩu mà không đụng nhau', async () => {
    await User.create(make(1));
    await User.create(make(2));
    expect(await User.countDocuments({})).toBe(2);
  });

  it('năm người cũng không sao', async () => {
    for (let i = 1; i <= 5; i++) await User.create(make(i));
    expect(await User.countDocuments({})).toBe(5);
  });

  it('trường phải VẮNG MẶT chứ không phải mang null', async () => {
    await User.create(make(1));
    // Đọc thẳng từ collection để thấy tài liệu thật, không qua lớp Mongoose.
    const raw = await mongoose.connection.collection('users').findOne({});
    expect('google' in raw).toBe(false);
    expect('facebook' in raw).toBe(false);
  });
});

describe('ràng buộc unique vẫn còn nguyên', () => {
  it('hai tài khoản không được mang cùng một mã Google', async () => {
    await User.create({ ...make(1), google: 'google-abc' });
    await expect(User.create({ ...make(2), google: 'google-abc' }))
      .rejects.toThrow(/duplicate key|E11000/i);
  });

  it('hai tài khoản không được mang cùng một mã Facebook', async () => {
    await User.create({ ...make(1), facebook: 'fb-xyz' });
    await expect(User.create({ ...make(2), facebook: 'fb-xyz' }))
      .rejects.toThrow(/duplicate key|E11000/i);
  });

  it('cùng email vẫn bị chặn như cũ', async () => {
    await User.create(make(1));
    await expect(User.create(make(1))).rejects.toThrow(/duplicate key|E11000/i);
  });
});

describe('mật khẩu', () => {
  it('bắt buộc khi chưa gắn nhà cung cấp nào', async () => {
    await expect(User.create({ name: 'A', email: 'a@example.com' }))
      .rejects.toThrow(/passwordHash/);
  });

  it('không bắt buộc khi đã có mã Google', async () => {
    const u = await User.create({ name: 'A', email: 'a@example.com', google: 'g-1' });
    expect(u.email).toBe('a@example.com');
  });
});
