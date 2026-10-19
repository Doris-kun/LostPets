const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

// app.js đọc FRONTEND_URL ngay lúc nạp module, nên phải đặt trước khi require.
const ALLOWED = 'https://lostpets-1.onrender.com';
process.env.FRONTEND_URL = ALLOWED;
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

describe('CORS', () => {
  it('cho qua domain nằm trong FRONTEND_URL', async () => {
    const res = await request(app).get('/pets').set('Origin', ALLOWED);
    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBe(ALLOWED);
  });

  it('chặn domain lạ', async () => {
    const res = await request(app).get('/pets').set('Origin', 'https://ke-xau.example.com');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('request không có Origin vẫn chạy bình thường', async () => {
    const res = await request(app).get('/pets');
    expect(res.status).toBe(200);
  });

  it('không lộ header x-powered-by', async () => {
    const res = await request(app).get('/pets');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});
