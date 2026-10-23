const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

process.env.JWT_SECRET = 'test-secret-chi-dung-trong-test';
process.env.ADMIN_EMAILS = 'sep@example.com, thuky@example.com';
const app = require('../app');
const rateLimit = require('../api/middleware/rateLimit');
const Pet = require('../api/models/petModel');

let mongoServer;

beforeEach(() => rateLimit.reset());

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

async function signUp(email) {
  const { body } = await request(app)
    .post('/auth/register')
    .send({ name: 'Ai đó', email, password: 'matkhau123' });
  return body;
}

const makePet = (over = {}) =>
  Pet.create({
    postId: `P-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    type: 'lost', species: 'Chó', breed: 'Corgi', color: 'Nâu trắng',
    area: 'Quận 1, TP.HCM', contact: '0900 000 001', ...over,
  });

describe('Phân quyền quản trị', () => {
  it('chưa đăng nhập thì trả 401', async () => {
    const res = await request(app).get('/admin/stats');
    expect(res.status).toBe(401);
  });

  it('người dùng thường trả 403', async () => {
    const { token } = await signUp('thuong@example.com');
    const res = await request(app).get('/admin/stats').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('email trong ADMIN_EMAILS được cấp quyền admin', async () => {
    const { token, user } = await signUp('sep@example.com');
    expect(user.role).toBe('admin');
    const res = await request(app).get('/admin/stats').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it('không phân biệt hoa thường và khoảng trắng trong ADMIN_EMAILS', async () => {
    const { user } = await signUp('ThuKy@Example.COM');
    expect(user.role).toBe('admin');
  });

  it('nâng quyền ngay ở lần đăng nhập kế tiếp khi email được thêm vào danh sách', async () => {
    const before = process.env.ADMIN_EMAILS;
    process.env.ADMIN_EMAILS = '';
    const { user: plain } = await signUp('moi@example.com');
    expect(plain.role).toBe('user');

    process.env.ADMIN_EMAILS = 'moi@example.com';
    const { body } = await request(app)
      .post('/auth/login')
      .send({ email: 'moi@example.com', password: 'matkhau123' });
    expect(body.user.role).toBe('admin');

    process.env.ADMIN_EMAILS = before;
  });
});

describe('GET /admin/stats', () => {
  it('đếm đúng theo loại và trạng thái', async () => {
    const { token } = await signUp('sep@example.com');
    await makePet();
    await makePet({ type: 'found' });
    await makePet({ resolved: true });

    const res = await request(app).get('/admin/stats').set('Authorization', `Bearer ${token}`);

    expect(res.body.total).toBe(3);
    expect(res.body.lost).toBe(2);
    expect(res.body.found).toBe(1);
    expect(res.body.resolved).toBe(1);
    expect(res.body.open).toBe(2);
    expect(res.body.resolvedRate).toBe(33);
  });

  it('không chia cho 0 khi chưa có tin nào', async () => {
    const { token } = await signUp('sep@example.com');
    const res = await request(app).get('/admin/stats').set('Authorization', `Bearer ${token}`);
    expect(res.body.total).toBe(0);
    expect(res.body.resolvedRate).toBe(0);
  });

  it('xếp hạng khu vực nhiều tin nhất', async () => {
    const { token } = await signUp('sep@example.com');
    await makePet({ area: 'Quận 7, TP.HCM' });
    await makePet({ area: 'Quận 7, TP.HCM' });
    await makePet({ area: 'Cầu Giấy, Hà Nội' });

    const res = await request(app).get('/admin/stats').set('Authorization', `Bearer ${token}`);
    expect(res.body.topAreas[0]).toEqual({ label: 'Quận 7, TP.HCM', count: 2 });
  });
});

describe('GET /admin/pets', () => {
  it('trả về mọi tin, mới nhất trước', async () => {
    const { token } = await signUp('sep@example.com');
    await makePet({ date: new Date('2026-01-01') });
    await makePet({ date: new Date('2026-06-01'), breed: 'Husky' });

    const res = await request(app).get('/admin/pets').set('Authorization', `Bearer ${token}`);
    expect(res.body.total).toBe(2);
    expect(res.body.pets[0].breed).toBe('Husky');
  });

  it('lọc theo loại và trạng thái', async () => {
    const { token } = await signUp('sep@example.com');
    await makePet();
    await makePet({ type: 'found', resolved: true });

    const byType = await request(app).get('/admin/pets?type=found').set('Authorization', `Bearer ${token}`);
    expect(byType.body.total).toBe(1);

    const byStatus = await request(app).get('/admin/pets?resolved=false').set('Authorization', `Bearer ${token}`);
    expect(byStatus.body.total).toBe(1);
  });

  it('tìm theo từ khoá, ký tự đặc biệt không làm vỡ truy vấn', async () => {
    const { token } = await signUp('sep@example.com');
    await makePet({ breed: 'Corgi' });

    const ok = await request(app).get('/admin/pets?q=corg').set('Authorization', `Bearer ${token}`);
    expect(ok.body.total).toBe(1);

    const weird = await request(app).get('/admin/pets?q=%28%5B').set('Authorization', `Bearer ${token}`);
    expect(weird.status).toBe(200);
  });
});

describe('DELETE /admin/pets/:petId', () => {
  it('quản trị viên xoá được tin của người khác mà không cần mã', async () => {
    const { token } = await signUp('sep@example.com');
    const pet = await makePet({ claimHash: 'bam-gi-do' });

    const res = await request(app).delete(`/admin/pets/${pet._id}`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(await Pet.countDocuments()).toBe(0);
  });

  it('người dùng thường không xoá được qua đường admin', async () => {
    const { token } = await signUp('thuong@example.com');
    const pet = await makePet();
    const res = await request(app).delete(`/admin/pets/${pet._id}`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
    expect(await Pet.countDocuments()).toBe(1);
  });

  it('id sai định dạng trả 404 chứ không phải 500', async () => {
    const { token } = await signUp('sep@example.com');
    const res = await request(app).delete('/admin/pets/khong-phai-id').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });
});
