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
  for (const key in collections) await collections[key].deleteMany({});
});

async function signUp(email) {
  const { body } = await request(app)
    .post('/auth/register')
    .send({ name: 'Người dùng', email, password: 'matkhau123' });
  return body.token;
}

function postPet(token) {
  const req = request(app)
    .post('/pets')
    .field('type', 'lost')
    .field('species', 'Chó')
    .field('breed', 'Corgi')
    .field('color', 'Nâu trắng')
    .field('area', 'Quận 1')
    .field('contact', '0900 000 001');
  return token ? req.set('Authorization', `Bearer ${token}`) : req;
}

describe('Tin gắn với tài khoản', () => {
  it('đăng tin khi đã đăng nhập thì tin thuộc về mình', async () => {
    const token = await signUp('a@example.com');
    const created = await postPet(token);
    expect(created.status).toBe(201);

    const mine = await request(app).get('/pets/mine').set('Authorization', `Bearer ${token}`);
    expect(mine.status).toBe(200);
    expect(mine.body.pets).toHaveLength(1);
    expect(mine.body.pets[0]._id).toBe(created.body._id);
  });

  it('chủ tin sửa được mà không cần mã xác nhận', async () => {
    const token = await signUp('b@example.com');
    const created = await postPet(token);

    const res = await request(app)
      .put(`/pets/${created.body._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ resolved: true });

    expect(res.status).toBe(200);
    expect(res.body.resolved).toBe(true);
  });

  it('chủ tin xoá được mà không cần mã xác nhận', async () => {
    const token = await signUp('c@example.com');
    const created = await postPet(token);

    const res = await request(app)
      .delete(`/pets/${created.body._id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
  });

  it('người khác không sửa được tin của mình', async () => {
    const owner = await signUp('d@example.com');
    const other = await signUp('e@example.com');
    const created = await postPet(owner);

    const res = await request(app)
      .put(`/pets/${created.body._id}`)
      .set('Authorization', `Bearer ${other}`)
      .send({ resolved: true });

    expect(res.status).toBe(403);
  });

  it('khách vãng lai không sửa được tin đã có chủ', async () => {
    const token = await signUp('f@example.com');
    const created = await postPet(token);

    const res = await request(app).put(`/pets/${created.body._id}`).send({ resolved: true });
    expect(res.status).toBe(403);
  });

  it('chỉ thấy tin của mình, không thấy tin người khác', async () => {
    const me = await signUp('g@example.com');
    const other = await signUp('h@example.com');
    await postPet(me);
    await postPet(other);
    await postPet(null); // khách vãng lai

    const mine = await request(app).get('/pets/mine').set('Authorization', `Bearer ${me}`);
    expect(mine.body.pets).toHaveLength(1);
  });

  it('chưa đăng nhập thì /pets/mine trả 401', async () => {
    const res = await request(app).get('/pets/mine');
    expect(res.status).toBe(401);
  });

  it('khách vãng lai đăng tin thì vẫn dùng mã xác nhận như cũ', async () => {
    const created = await postPet(null);
    expect(created.body.claimCode).toBeTruthy();

    const denied = await request(app).put(`/pets/${created.body._id}`).send({ resolved: true });
    expect(denied.status).toBe(403);

    const ok = await request(app)
      .put(`/pets/${created.body._id}`)
      .set('x-claim-code', created.body.claimCode)
      .send({ resolved: true });
    expect(ok.status).toBe(200);
  });

  it('danh sách chung vẫn hiện tin của mọi người', async () => {
    const token = await signUp('i@example.com');
    await postPet(token);
    await postPet(null);

    const res = await request(app).get('/pets');
    expect(res.body.total).toBe(2);
  });
});
