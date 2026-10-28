const request = require('supertest');
const crypto = require('crypto');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Theo dõi lệnh xoá ảnh để chắc chắn đợt dọn không bỏ lại rác trên Cloudinary.
const mockDestroy = jest.fn().mockResolvedValue({ result: 'ok' });
jest.mock('cloudinary', () => ({
  v2: {
    config: jest.fn(),
    uploader: {
      upload_stream: jest.fn(),
      destroy: mockDestroy,
    },
  },
}));

process.env.JWT_SECRET = 'test-secret-chi-dung-trong-test';
process.env.ADMIN_EMAILS = 'sep@example.com';
process.env.CLEANUP_TOKEN = 'ma-cron-bi-mat';
const app = require('../app');
const rateLimit = require('../api/middleware/rateLimit');
const Pet = require('../api/models/petModel');

let mongoServer;

beforeEach(() => {
  rateLimit.reset();
  mockDestroy.mockClear();
  delete process.env.CLEANUP_AFTER_DAYS;
});

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
}, 30000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) await collections[key].deleteMany({});
});

const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

const makePet = (over = {}) =>
  Pet.create({
    postId: `P-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    type: 'lost', species: 'Chó', breed: 'Corgi', color: 'Nâu trắng',
    area: 'Quận 1, TP.HCM', contact: '0900 000 001', ...over,
  });

// Gắn mã xác nhận đã biết vào một tin dựng sẵn, để test gọi PUT được.
const giveClaimCode = async (pet, code) => {
  await Pet.updateOne(
    { _id: pet._id },
    { $set: { claimHash: crypto.createHash('sha256').update(code).digest('hex') } }
  );
};

async function adminToken() {
  const { body } = await request(app)
    .post('/auth/register')
    .send({ name: 'Sếp', email: 'sep@example.com', password: 'matkhau123' });
  return body.token;
}

const callCleanup = () =>
  request(app).post('/admin/cleanup').set('x-cleanup-token', 'ma-cron-bi-mat');

describe('Quyền gọi đợt dọn dẹp', () => {
  it('mã cron đúng thì chạy được dù không đăng nhập', async () => {
    const res = await callCleanup();
    expect(res.status).toBe(200);
  });

  it('mã cron sai trả 401', async () => {
    const res = await request(app).post('/admin/cleanup').set('x-cleanup-token', 'ma-sai');
    expect(res.status).toBe(401);
  });

  it('không gửi mã và không đăng nhập thì trả 401', async () => {
    const res = await request(app).post('/admin/cleanup');
    expect(res.status).toBe(401);
  });

  it('người dùng thường trả 403', async () => {
    const { body } = await request(app)
      .post('/auth/register')
      .send({ name: 'Thường', email: 'thuong@example.com', password: 'matkhau123' });
    const res = await request(app)
      .post('/admin/cleanup')
      .set('Authorization', `Bearer ${body.token}`);
    expect(res.status).toBe(403);
  });

  it('quản trị viên bấm tay thì chạy được, không cần mã cron', async () => {
    const token = await adminToken();
    const res = await request(app)
      .post('/admin/cleanup')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it('chưa đặt CLEANUP_TOKEN thì đường vào bằng mã đóng hẳn', async () => {
    const before = process.env.CLEANUP_TOKEN;
    delete process.env.CLEANUP_TOKEN;
    try {
      const res = await request(app).post('/admin/cleanup').set('x-cleanup-token', 'bat-ky');
      expect(res.status).toBe(401);
    } finally {
      process.env.CLEANUP_TOKEN = before;
    }
  });
});

describe('Chọn tin để xoá', () => {
  it('xoá tin đã đoàn tụ quá hạn giữ lại', async () => {
    await makePet({ resolved: true, resolvedAt: daysAgo(40) });
    const res = await callCleanup();
    expect(res.body.deleted).toBe(1);
    expect(await Pet.countDocuments()).toBe(0);
  });

  it('giữ lại tin đoàn tụ còn trong hạn', async () => {
    await makePet({ resolved: true, resolvedAt: daysAgo(5) });
    const res = await callCleanup();
    expect(res.body.deleted).toBe(0);
    expect(await Pet.countDocuments()).toBe(1);
  });

  it('không đụng tới tin chưa đoàn tụ dù đăng đã rất lâu', async () => {
    await makePet({ resolved: false, date: daysAgo(400) });
    const res = await callCleanup();
    expect(res.body.deleted).toBe(0);
    expect(await Pet.countDocuments()).toBe(1);
  });

  it('tin đoàn tụ cũ chưa có mốc thời gian thì được đóng dấu, không xoá ngay', async () => {
    const pet = await makePet({ resolved: true, date: daysAgo(400) });
    await Pet.updateOne({ _id: pet._id }, { $unset: { resolvedAt: '' } });

    const res = await callCleanup();
    expect(res.body.stamped).toBe(1);
    expect(res.body.deleted).toBe(0);

    const after = await Pet.findById(pet._id);
    expect(after.resolvedAt).toBeInstanceOf(Date);
    expect(after.resolvedAt.getTime()).toBeGreaterThan(daysAgo(1).getTime());
  });

  it('đổi CLEANUP_AFTER_DAYS thì đổi theo hạn giữ lại', async () => {
    await makePet({ resolved: true, resolvedAt: daysAgo(3) });
    process.env.CLEANUP_AFTER_DAYS = '1';
    const res = await callCleanup();
    expect(res.body.days).toBe(1);
    expect(res.body.deleted).toBe(1);
  });

  it('giá trị CLEANUP_AFTER_DAYS vô nghĩa thì quay về mặc định 30 ngày', async () => {
    process.env.CLEANUP_AFTER_DAYS = 'ba mươi';
    const res = await callCleanup();
    expect(res.body.days).toBe(30);
  });

  it('xoá nhiều tin trong một lượt và bỏ qua tin không đủ điều kiện', async () => {
    await makePet({ resolved: true, resolvedAt: daysAgo(40) });
    await makePet({ resolved: true, resolvedAt: daysAgo(90) });
    await makePet({ resolved: true, resolvedAt: daysAgo(2) });
    await makePet({ resolved: false });

    const res = await callCleanup();
    expect(res.body.deleted).toBe(2);
    expect(await Pet.countDocuments()).toBe(2);
  });
});

describe('Dọn ảnh kèm theo', () => {
  it('xoá tin thì xoá luôn ảnh trên Cloudinary theo imageId', async () => {
    await makePet({
      resolved: true,
      resolvedAt: daysAgo(40),
      image: 'https://res.cloudinary.com/demo/image/upload/v1/lost-pets/abc.jpg',
      imageId: 'lost-pets/abc',
    });
    await callCleanup();
    expect(mockDestroy).toHaveBeenCalledWith('lost-pets/abc');
  });

  it('tin cũ chỉ có URL vẫn moi được public_id để xoá ảnh', async () => {
    await makePet({
      resolved: true,
      resolvedAt: daysAgo(40),
      image: 'https://res.cloudinary.com/demo/image/upload/v1700000000/lost-pets/cu.png',
    });
    await callCleanup();
    expect(mockDestroy).toHaveBeenCalledWith('lost-pets/cu');
  });

  it('tin không có ảnh thì không gọi Cloudinary', async () => {
    await makePet({ resolved: true, resolvedAt: daysAgo(40) });
    await callCleanup();
    expect(mockDestroy).not.toHaveBeenCalled();
  });

  it('Cloudinary lỗi thì tin vẫn xoá xong, đợt dọn không thất bại', async () => {
    mockDestroy.mockRejectedValueOnce(new Error('Cloudinary sập'));
    await makePet({
      resolved: true,
      resolvedAt: daysAgo(40),
      image: 'https://res.cloudinary.com/demo/image/upload/v1/lost-pets/loi.jpg',
      imageId: 'lost-pets/loi',
    });
    const res = await callCleanup();
    expect(res.status).toBe(200);
    expect(await Pet.countDocuments()).toBe(0);
  });
});

describe('Đồng hồ đếm ngược resolvedAt', () => {
  it('bấm "đã tìm thấy" thì đóng dấu thời điểm', async () => {
    const pet = await makePet();
    await giveClaimCode(pet, 'MA-A');

    await request(app)
      .put(`/pets/${pet._id}`)
      .set('x-claim-code', 'MA-A')
      .send({ resolved: true })
      .expect(200);

    const after = await Pet.findById(pet._id);
    expect(after.resolved).toBe(true);
    expect(after.resolvedAt).toBeInstanceOf(Date);
  });

  it('bỏ đánh dấu đoàn tụ thì đồng hồ dừng lại', async () => {
    const pet = await makePet({ resolved: true, resolvedAt: daysAgo(10) });
    await giveClaimCode(pet, 'MA-B');

    await request(app)
      .put(`/pets/${pet._id}`)
      .set('x-claim-code', 'MA-B')
      .send({ resolved: false })
      .expect(200);

    const after = await Pet.findById(pet._id);
    expect(after.resolved).toBe(false);
    expect(after.resolvedAt).toBeNull();
  });

  it('gửi chuỗi "false" qua form vẫn hiểu là bỏ đoàn tụ', async () => {
    const pet = await makePet({ resolved: true, resolvedAt: daysAgo(10) });
    await giveClaimCode(pet, 'MA-C');

    await request(app)
      .put(`/pets/${pet._id}`)
      .set('x-claim-code', 'MA-C')
      .send({ resolved: 'false' })
      .expect(200);

    const after = await Pet.findById(pet._id);
    expect(after.resolved).toBe(false);
    expect(after.resolvedAt).toBeNull();
  });

  it('sửa nội dung tin đã đoàn tụ không đẩy lùi hạn xoá', async () => {
    const pet = await makePet({ resolved: true, resolvedAt: daysAgo(40) });
    await giveClaimCode(pet, 'MA-D');

    await request(app)
      .put(`/pets/${pet._id}`)
      .set('x-claim-code', 'MA-D')
      .send({ resolved: true, description: 'Sửa lại mô tả' })
      .expect(200);

    const after = await Pet.findById(pet._id);
    expect(after.resolvedAt.getTime()).toBeLessThan(daysAgo(39).getTime());
  });

  it('client không tự đặt được resolvedAt để né đợt dọn', async () => {
    const pet = await makePet({ resolved: true, resolvedAt: daysAgo(40) });
    await giveClaimCode(pet, 'MA-E');

    await request(app)
      .put(`/pets/${pet._id}`)
      .set('x-claim-code', 'MA-E')
      .send({ resolvedAt: new Date().toISOString() })
      .expect(200);

    const after = await Pet.findById(pet._id);
    expect(after.resolvedAt.getTime()).toBeLessThan(daysAgo(39).getTime());

    const res = await callCleanup();
    expect(res.body.deleted).toBe(1);
  });
});

describe('Thống kê báo trước số tin sắp bị xoá', () => {
  it('đếm đúng số tin đã quá hạn', async () => {
    await makePet({ resolved: true, resolvedAt: daysAgo(40) });
    await makePet({ resolved: true, resolvedAt: daysAgo(2) });
    await makePet({ resolved: false });

    const token = await adminToken();
    const res = await request(app).get('/admin/stats').set('Authorization', `Bearer ${token}`);

    expect(res.body.pendingCleanup).toBe(1);
    expect(res.body.cleanupDays).toBe(30);
  });
});
