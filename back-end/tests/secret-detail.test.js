const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

process.env.JWT_SECRET = 'test-secret-chi-dung-trong-test';
const app = require('../app');
const rateLimit = require('../api/middleware/rateLimit');

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

const SECRET = 'Có vết sẹo nhỏ ở chân sau bên trái';

function createPet(token) {
  const req = request(app)
    .post('/pets')
    .field('type', 'lost')
    .field('species', 'Chó')
    .field('breed', 'Corgi')
    .field('color', 'Nâu trắng')
    .field('area', 'Quận 1')
    .field('contact', '0900 000 001')
    .field('secretDetail', SECRET);
  return token ? req.set('Authorization', `Bearer ${token}`) : req;
}

async function signUp(email) {
  const { body } = await request(app)
    .post('/auth/register')
    .send({ name: 'Chủ nuôi', email, password: 'matkhau123' });
  return body.token;
}

describe('Đặc điểm bí mật', () => {
  it('người xem tin không thấy đặc điểm bí mật', async () => {
    const created = await createPet(null);
    const res = await request(app).get(`/pets/${created.body._id}`);
    expect(res.status).toBe(200);
    expect(res.body.secretDetail).toBeUndefined();
  });

  it('không lọt ra ở danh sách chung', async () => {
    await createPet(null);
    const res = await request(app).get('/pets');
    expect(JSON.stringify(res.body)).not.toContain('vết sẹo');
  });

  it('không lọt ra ngay khi vừa tạo tin', async () => {
    const created = await createPet(null);
    expect(created.body.secretDetail).toBeUndefined();
  });

  it('chủ tin đăng nhập thì đọc được', async () => {
    const token = await signUp('chu@example.com');
    const created = await createPet(token);

    const res = await request(app)
      .get(`/pets/${created.body._id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.body.secretDetail).toBe(SECRET);
  });

  it('người cầm mã xác nhận thì đọc được', async () => {
    const created = await createPet(null);
    const res = await request(app)
      .get(`/pets/${created.body._id}`)
      .set('x-claim-code', created.body.claimCode);
    expect(res.body.secretDetail).toBe(SECRET);
  });

  it('mã sai thì không đọc được', async () => {
    const created = await createPet(null);
    const res = await request(app)
      .get(`/pets/${created.body._id}`)
      .set('x-claim-code', 'MASAI123');
    expect(res.body.secretDetail).toBeUndefined();
  });

  it('tài khoản khác không đọc được', async () => {
    const owner = await signUp('a@example.com');
    const other = await signUp('b@example.com');
    const created = await createPet(owner);

    const res = await request(app)
      .get(`/pets/${created.body._id}`)
      .set('Authorization', `Bearer ${other}`);

    expect(res.body.secretDetail).toBeUndefined();
  });

  it('chủ tin sửa được đặc điểm bí mật', async () => {
    const token = await signUp('c@example.com');
    const created = await createPet(token);

    await request(app)
      .put(`/pets/${created.body._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ secretDetail: 'Tai trái bị khuyết một góc' });

    const res = await request(app)
      .get(`/pets/${created.body._id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.body.secretDetail).toBe('Tai trái bị khuyết một góc');
  });

  it('bản băm mã xác nhận vẫn không bao giờ lọt ra', async () => {
    const created = await createPet(null);
    const res = await request(app)
      .get(`/pets/${created.body._id}`)
      .set('x-claim-code', created.body.claimCode);
    expect(res.body.claimHash).toBeUndefined();
  });
});
