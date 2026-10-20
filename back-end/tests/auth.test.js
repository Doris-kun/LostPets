const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

process.env.JWT_SECRET = 'test-secret-chi-dung-trong-test';
const app = require('../app');

let mongoServer;

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
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

const account = { name: 'Nam', email: 'nam@example.com', password: 'matkhau123' };
const register = (overrides = {}) =>
  request(app).post('/auth/register').send({ ...account, ...overrides });

describe('POST /auth/register', () => {
  it('tạo tài khoản và trả về token', async () => {
    const res = await register();
    expect(res.status).toBe(201);
    expect(typeof res.body.token).toBe('string');
    expect(res.body.user.email).toBe('nam@example.com');
  });

  it('không trả về mật khẩu đã băm', async () => {
    const res = await register();
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  it('từ chối email trùng', async () => {
    await register();
    const res = await register({ name: 'Người khác' });
    expect(res.status).toBe(409);
  });

  it('từ chối mật khẩu quá ngắn', async () => {
    const res = await register({ password: '123' });
    expect(res.status).toBe(400);
  });

  it('từ chối thiếu trường', async () => {
    const res = await request(app).post('/auth/register').send({ email: 'a@b.com' });
    expect(res.status).toBe(400);
  });
});

describe('POST /auth/login', () => {
  it('đăng nhập đúng thì có token', async () => {
    await register();
    const res = await request(app)
      .post('/auth/login')
      .send({ email: account.email, password: account.password });
    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe('string');
  });

  it('sai mật khẩu trả 401', async () => {
    await register();
    const res = await request(app)
      .post('/auth/login')
      .send({ email: account.email, password: 'sai-roi' });
    expect(res.status).toBe(401);
  });

  it('email chưa đăng ký cũng trả 401 với cùng thông báo', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'chuacoai@example.com', password: 'matkhau123' });
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Email hoặc mật khẩu không đúng');
  });
});

describe('GET /auth/me', () => {
  it('trả về thông tin khi có token hợp lệ', async () => {
    const { body } = await register();
    const res = await request(app).get('/auth/me').set('Authorization', `Bearer ${body.token}`);
    expect(res.status).toBe(200);
    expect(res.body.email).toBe(account.email);
  });

  it('không có token thì 401', async () => {
    const res = await request(app).get('/auth/me');
    expect(res.status).toBe(401);
  });

  it('token rác thì 401', async () => {
    const res = await request(app).get('/auth/me').set('Authorization', 'Bearer khong-phai-token');
    expect(res.status).toBe(401);
  });
});
