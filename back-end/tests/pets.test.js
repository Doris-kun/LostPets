const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
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

describe('GET /pets', () => {
  it('trả về { pets, total }', async () => {
    const res = await request(app).get('/pets');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('pets');
    expect(res.body).toHaveProperty('total');
    expect(Array.isArray(res.body.pets)).toBe(true);
  });

  it('total = 0 khi chưa có data', async () => {
    const res = await request(app).get('/pets');
    expect(res.body.total).toBe(0);
    expect(res.body.pets).toHaveLength(0);
  });
});

describe('POST /pets', () => {
  it('trả về 400 nếu thiếu field bắt buộc', async () => {
    const res = await request(app).post('/pets').send({ type: 'lost' });
    expect(res.status).toBe(400);
  });

  it('tạo pet thành công', async () => {
    const res = await request(app)
      .post('/pets')
      .field('type', 'lost')
      .field('species', 'Chó')
      .field('breed', 'Poodle')
      .field('color', 'Trắng')
      .field('area', 'Quận 1')
      .field('contact', '0123456789');
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('_id');
    expect(res.body.type).toBe('lost');
    expect(res.body.breed).toBe('Poodle');
  });
});

describe('GET /pets/:petId', () => {
  it('trả về 404 nếu không tồn tại', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app).get(`/pets/${fakeId}`);
    expect(res.status).toBe(404);
  });

  it('trả về pet đúng nếu tồn tại', async () => {
    const created = await request(app)
      .post('/pets')
      .field('type', 'found')
      .field('species', 'Mèo')
      .field('breed', 'Anh lông ngắn')
      .field('color', 'Xám')
      .field('area', 'Quận 3')
      .field('contact', 'test@email.com');

    const res = await request(app).get(`/pets/${created.body._id}`);
    expect(res.status).toBe(200);
    expect(res.body._id).toBe(created.body._id);
  });
});

describe('PUT /pets/:petId', () => {
  it('cập nhật resolved thành công', async () => {
    const created = await request(app)
      .post('/pets')
      .field('type', 'lost')
      .field('species', 'Chó')
      .field('breed', 'Husky')
      .field('color', 'Đen trắng')
      .field('area', 'Bình Thạnh')
      .field('contact', '0987654321');

    const res = await request(app)
      .put(`/pets/${created.body._id}`)
      .send({ resolved: true });
    expect(res.status).toBe(200);
    expect(res.body.resolved).toBe(true);
  });
});

describe('DELETE /pets/:petId', () => {
  it('xóa pet thành công', async () => {
    const created = await request(app)
      .post('/pets')
      .field('type', 'lost')
      .field('species', 'Chó')
      .field('breed', 'Corgi')
      .field('color', 'Vàng')
      .field('area', 'Gò Vấp')
      .field('contact', '0111222333');

    const del = await request(app).delete(`/pets/${created.body._id}`);
    expect(del.status).toBe(200);

    const get = await request(app).get(`/pets/${created.body._id}`);
    expect(get.status).toBe(404);
  });
});
