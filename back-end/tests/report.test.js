const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Xoá tin bị báo cáo có gọi Cloudinary, chặn lại để test không ra mạng.
const mockDestroy = jest.fn().mockResolvedValue({ result: 'ok' });
jest.mock('cloudinary', () => ({
  v2: {
    config: jest.fn(),
    uploader: { destroy: (...args) => mockDestroy(...args) },
  },
}));

process.env.JWT_SECRET = 'test-secret-chi-dung-trong-test';
process.env.ADMIN_EMAILS = 'sep@example.com';

const app = require('../app');
const rateLimit = require('../api/middleware/rateLimit');
const Pet = require('../api/models/petModel');
const Report = require('../api/models/reportModel');

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
  mockDestroy.mockClear();
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) await collections[key].deleteMany({});
});

const makePet = (over = {}) =>
  Pet.create({
    postId: over.postId || `P-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    type: 'lost', species: 'Chó', breed: 'Corgi', color: 'Nâu trắng',
    area: 'Quận 1, TP.HCM', contact: '0900 000 001', ...over,
  });

async function adminToken() {
  await request(app).post('/auth/register')
    .send({ name: 'Sếp', email: 'sep@example.com', password: 'matkhau123' });
  const res = await request(app).post('/auth/login')
    .send({ email: 'sep@example.com', password: 'matkhau123' });
  return res.body.token;
}

const asAdmin = (req, token) => req.set('Authorization', `Bearer ${token}`);

describe('POST /pets/:petId/report', () => {
  it('ai cũng gửi được, không cần đăng nhập', async () => {
    const pet = await makePet();

    const res = await request(app).post(`/pets/${pet._id}/report`)
      .send({ reason: 'scam' });

    expect(res.status).toBe(201);
    expect(await Report.countDocuments()).toBe(1);
  });

  it('lưu được cả ghi chú kèm theo', async () => {
    const pet = await makePet();

    await request(app).post(`/pets/${pet._id}/report`)
      .send({ reason: 'wrong_contact', note: '  Số này là của tôi  ' });

    const saved = await Report.findOne();
    expect(saved.reason).toBe('wrong_contact');
    expect(saved.note).toBe('Số này là của tôi');
  });

  it('từ chối lý do không có trong danh sách', async () => {
    const pet = await makePet();

    const res = await request(app).post(`/pets/${pet._id}/report`)
      .send({ reason: 'toi-tu-nghi-ra' });

    expect(res.status).toBe(400);
    expect(await Report.countDocuments()).toBe(0);
  });

  it('từ chối báo cáo thiếu lý do', async () => {
    const pet = await makePet();

    expect((await request(app).post(`/pets/${pet._id}/report`).send({})).status).toBe(400);
  });

  it('trả 404 cho tin không tồn tại, không tạo báo cáo mồ côi', async () => {
    const goneId = new mongoose.Types.ObjectId();

    const res = await request(app).post(`/pets/${goneId}/report`).send({ reason: 'scam' });

    expect(res.status).toBe(404);
    expect(await Report.countDocuments()).toBe(0);
  });

  it('trả 404 khi id sai định dạng thay vì ném lỗi ép kiểu', async () => {
    expect((await request(app).post('/pets/khong-phai-id/report').send({ reason: 'scam' })).status).toBe(404);
  });

  it('cắt ghi chú quá dài thay vì từ chối cả báo cáo', async () => {
    const pet = await makePet();

    await request(app).post(`/pets/${pet._id}/report`)
      .send({ reason: 'other', note: 'a'.repeat(900) });

    expect((await Report.findOne()).note).toHaveLength(500);
  });

  it('không nói cho người gửi biết tin đã bị báo cáo bao nhiêu lần', async () => {
    const pet = await makePet();

    const res = await request(app).post(`/pets/${pet._id}/report`).send({ reason: 'scam' });

    // Lộ con số này thì kẻ xấu biết mình đã dồn đủ chưa, người thường thì đoán
    // ra tin nào sắp bị gỡ.
    expect(JSON.stringify(res.body)).not.toMatch(/\d/);
  });

  it('một người báo cáo được nhiều tin khác nhau', async () => {
    const a = await makePet();
    const b = await makePet();

    await request(app).post(`/pets/${a._id}/report`).send({ reason: 'scam' });
    await request(app).post(`/pets/${b._id}/report`).send({ reason: 'duplicate' });

    expect(await Report.countDocuments()).toBe(2);
  });

  it('chặn tần suất tính chung mọi tin, không phải mỗi tin một hạn mức', async () => {
    process.env.REPORT_RATE_LIMIT = '2';
    const a = await makePet();
    const b = await makePet();
    const c = await makePet();

    await request(app).post(`/pets/${a._id}/report`).send({ reason: 'scam' });
    await request(app).post(`/pets/${b._id}/report`).send({ reason: 'scam' });
    // Tin thứ ba là tin mới tinh — nếu bộ đếm theo đường dẫn thì lượt này lọt.
    const third = await request(app).post(`/pets/${c._id}/report`).send({ reason: 'scam' });

    expect(third.status).toBe(429);
    delete process.env.REPORT_RATE_LIMIT;
  });
});

describe('hàng chờ báo cáo ở trang quản trị', () => {
  it('khách vãng lai không xem được', async () => {
    expect((await request(app).get('/admin/reports')).status).toBe(401);
  });

  it('quản trị viên xem được, kèm thông tin tin bị báo cáo', async () => {
    const token = await adminToken();
    const pet = await makePet({ postId: 'L-BIBAOCAO', breed: 'Husky' });
    await request(app).post(`/pets/${pet._id}/report`).send({ reason: 'scam', note: 'đòi tiền' });

    const res = await asAdmin(request(app).get('/admin/reports'), token);

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.reports[0].reason).toBe('scam');
    expect(res.body.reports[0].pet.postId).toBe('L-BIBAOCAO');
    expect(res.body.reports[0].pet.breed).toBe('Husky');
  });

  it('bỏ qua một báo cáo thì tin vẫn còn nguyên', async () => {
    const token = await adminToken();
    const pet = await makePet();
    await request(app).post(`/pets/${pet._id}/report`).send({ reason: 'other' });
    const { _id } = await Report.findOne();

    const res = await asAdmin(request(app).delete(`/admin/reports/${_id}`), token);

    expect(res.status).toBe(200);
    expect(await Report.countDocuments()).toBe(0);
    expect(await Pet.countDocuments()).toBe(1);
  });

  it('xoá tin thì mọi báo cáo về tin đó biến mất theo', async () => {
    const token = await adminToken();
    const pet = await makePet();
    await request(app).post(`/pets/${pet._id}/report`).send({ reason: 'scam' });
    await request(app).post(`/pets/${pet._id}/report`).send({ reason: 'offensive' });
    expect(await Report.countDocuments()).toBe(2);

    await asAdmin(request(app).delete(`/admin/pets/${pet._id}`), token);

    expect(await Report.countDocuments()).toBe(0);
  });

  it('xoá tin cũng dọn luôn ảnh trên Cloudinary', async () => {
    const token = await adminToken();
    const pet = await makePet({ image: 'https://res.cloudinary.com/x/y.jpg', imageId: 'lostpets/abc123' });

    await asAdmin(request(app).delete(`/admin/pets/${pet._id}`), token);

    // Trước đây đường xoá của quản trị viên bỏ qua bước này, ảnh nằm lại
    // Cloudinary vĩnh viễn vì không còn chỗ nào trỏ tới public_id đó.
    expect(mockDestroy).toHaveBeenCalledWith('lostpets/abc123');
  });

  it('báo cáo của tin đã bị chủ tin tự xoá vẫn hiện, không làm sập hàng chờ', async () => {
    const token = await adminToken();
    const pet = await makePet();
    await request(app).post(`/pets/${pet._id}/report`).send({ reason: 'scam' });
    await Pet.findByIdAndDelete(pet._id);

    const res = await asAdmin(request(app).get('/admin/reports'), token);

    expect(res.status).toBe(200);
    expect(res.body.reports[0].pet).toBeNull();
  });

  it('số báo cáo chờ xử lý hiện trong thống kê', async () => {
    const token = await adminToken();
    const pet = await makePet();
    await request(app).post(`/pets/${pet._id}/report`).send({ reason: 'scam' });

    const res = await asAdmin(request(app).get('/admin/stats'), token);

    expect(res.body.openReports).toBe(1);
  });

  it('bỏ qua báo cáo không tồn tại trả 404', async () => {
    const token = await adminToken();
    const goneId = new mongoose.Types.ObjectId();

    expect((await asAdmin(request(app).delete(`/admin/reports/${goneId}`), token)).status).toBe(404);
  });

  it('không có quy tắc nào tự ẩn tin theo số lượt báo cáo', async () => {
    const pet = await makePet();

    for (let i = 0; i < 10; i++) {
      await request(app).post(`/pets/${pet._id}/report`).send({ reason: 'scam' });
    }

    // Mười lượt báo cáo mà tin vẫn hiện bình thường ngoài trang chủ. Để số
    // lượt tự ẩn tin thì ba tab trình duyệt là chôn được tin thật của người
    // đang đi tìm chó — hiện nhầm tin rác rẻ hơn ẩn nhầm tin thật rất nhiều.
    const list = await request(app).get('/pets');
    expect(list.body.pets.map((p) => p._id)).toContain(String(pet._id));
    expect((await request(app).get(`/pets/${pet._id}`)).status).toBe(200);
  });
});
