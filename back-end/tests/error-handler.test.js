const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const ALLOWED = 'https://lostpets-1.onrender.com';
process.env.FRONTEND_URL = ALLOWED;
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

const postPet = (attach) => {
  const req = request(app)
    .post('/pets')
    .field('type', 'lost').field('species', 'Chó').field('breed', 'Corgi')
    .field('color', 'Nâu').field('area', 'Quận 1').field('contact', '0900 000 001');
  return attach ? attach(req) : req;
};

describe('Ảnh vượt giới hạn dung lượng', () => {
  const big = () => Buffer.alloc(6 * 1024 * 1024, 1);

  it('trả 413 thay vì 500', async () => {
    const res = await postPet((r) =>
      r.attach('image', big(), { filename: 'big.jpg', contentType: 'image/jpeg' })
    );
    expect(res.status).toBe(413);
  });

  it('trả JSON chứ không phải trang HTML', async () => {
    const res = await postPet((r) =>
      r.attach('image', big(), { filename: 'big.jpg', contentType: 'image/jpeg' })
    );
    expect(res.headers['content-type']).toMatch(/json/);
    expect(res.body.message).toMatch(/5MB/);
  });

  it('không lộ dấu vết ngăn xếp hay đường dẫn máy chủ', async () => {
    const res = await postPet((r) =>
      r.attach('image', big(), { filename: 'big.jpg', contentType: 'image/jpeg' })
    );
    const text = JSON.stringify(res.body) + String(res.text);
    expect(text).not.toMatch(/node_modules/);
    expect(text).not.toMatch(/MulterError/);
  });
});

describe('Tệp không phải ảnh', () => {
  it('trả 400 kèm JSON', async () => {
    const res = await postPet((r) =>
      r.attach('image', Buffer.from('khong phai anh'), {
        filename: 'virus.exe',
        contentType: 'application/octet-stream',
      })
    );
    expect(res.status).toBe(400);
    expect(res.headers['content-type']).toMatch(/json/);
  });
});

describe('Domain không được phép', () => {
  it('trả 403 kèm JSON chứ không phải 500', async () => {
    const res = await request(app).get('/pets').set('Origin', 'https://ke-xau.example.com');
    expect(res.status).toBe(403);
    expect(res.body.message).toBeTruthy();
  });

  it('domain hợp lệ vẫn đi qua bình thường', async () => {
    const res = await request(app).get('/pets').set('Origin', ALLOWED);
    expect(res.status).toBe(200);
  });
});
