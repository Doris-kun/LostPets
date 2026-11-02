const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Bản đồ có dùng chung ô tìm kiếm, nên vẫn phải chặn Gemini thật lại.
// Vector giả 3 chiều, mỗi trục một chủ đề, giống tests/search.test.js.
const VECTORS = {
  'chó corgi': [1, 0, 0],
  'mèo tam thể': [0, 1, 0],
};
const mockEmbedDocument = jest.fn();
const mockEmbedQuery = jest.fn();

jest.mock('../api/lib/embedding', () => {
  const real = jest.requireActual('../api/lib/embedding');
  return {
    ...real,
    embedDocument: (...args) => mockEmbedDocument(...args),
    embedQuery: (...args) => mockEmbedQuery(...args),
  };
});

process.env.JWT_SECRET = 'test-secret-chi-dung-trong-test';
const app = require('../app');
const rateLimit = require('../api/middleware/rateLimit');
const Pet = require('../api/models/petModel');

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
  mockEmbedDocument.mockReset().mockResolvedValue(null);
  mockEmbedQuery.mockReset().mockImplementation(async (q) => VECTORS[q.toLowerCase()] || null);
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

const ids = (res) => res.body.pets.map((p) => p.postId).sort();

describe('GET /pets/map', () => {
  it('chỉ trả về tin đã ghim vị trí', async () => {
    await makePet({ postId: 'CO-TOA-DO', lat: 10.78, lng: 106.7 });
    await makePet({ postId: 'KHONG-CO' });

    const res = await request(app).get('/pets/map');

    expect(res.status).toBe(200);
    expect(ids(res)).toEqual(['CO-TOA-DO']);
  });

  it('đếm riêng số tin khớp bộ lọc nhưng thiếu toạ độ', async () => {
    await makePet({ lat: 10.78, lng: 106.7 });
    await makePet();
    await makePet();

    const res = await request(app).get('/pets/map');

    expect(res.body.total).toBe(1);
    expect(res.body.withoutCoords).toBe(2);
  });

  it('không nhầm "map" thành mã tin của GET /pets/:petId', async () => {
    const res = await request(app).get('/pets/map');

    // Trước khi có route riêng, Express hiểu 'map' là :petId rồi trả 404 hoặc
    // ném lỗi ép kiểu ObjectId. Có mảng pets nghĩa là route riêng đã thắng.
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.pets)).toBe(true);
  });

  it('bộ lọc loại tin vẫn chặn như ở danh sách', async () => {
    await makePet({ postId: 'TIN-MAT',   type: 'lost',  lat: 10.78, lng: 106.7 });
    await makePet({ postId: 'TIN-NHAT',  type: 'found', lat: 10.79, lng: 106.71 });

    const res = await request(app).get('/pets/map').query({ type: 'found' });

    expect(ids(res)).toEqual(['TIN-NHAT']);
  });

  it('bộ lọc loài và khu vực vẫn chặn như ở danh sách', async () => {
    await makePet({ postId: 'CHO-Q1', species: 'Chó', area: 'Quận 1', lat: 10.78, lng: 106.7 });
    await makePet({ postId: 'MEO-Q1', species: 'Mèo', area: 'Quận 1', lat: 10.78, lng: 106.7 });
    await makePet({ postId: 'CHO-Q7', species: 'Chó', area: 'Quận 7', lat: 10.73, lng: 106.72 });

    const res = await request(app).get('/pets/map').query({ species: 'Chó', area: 'Quận 1' });

    expect(ids(res)).toEqual(['CHO-Q1']);
  });

  it('bộ lọc số ngày vẫn chặn như ở danh sách', async () => {
    const longAgo = new Date();
    longAgo.setDate(longAgo.getDate() - 40);
    await makePet({ postId: 'MOI', lat: 10.78, lng: 106.7 });
    await makePet({ postId: 'CU',  lat: 10.78, lng: 106.7, date: longAgo });

    const res = await request(app).get('/pets/map').query({ days: 7 });

    expect(ids(res)).toEqual(['MOI']);
  });

  it('chỉ gửi những trường bản đồ vẽ ra, không gửi kèm mô tả hay liên hệ', async () => {
    await makePet({ lat: 10.78, lng: 106.7, description: 'Mô tả rất dài'.repeat(50) });

    const pet = (await request(app).get('/pets/map')).body.pets[0];

    expect(pet.lat).toBeCloseTo(10.78, 2);
    expect(pet.area).toBeTruthy();
    expect(pet.description).toBeUndefined();
    expect(pet.contact).toBeUndefined();
  });

  it('không bao giờ để lọt vector hay bí mật của tin', async () => {
    await makePet({
      lat: 10.78, lng: 106.7,
      embedding: [1, 0, 0],
      secretDetail: 'sẹo sau tai trái',
    });

    const pet = (await request(app).get('/pets/map')).body.pets[0];

    expect(pet.embedding).toBeUndefined();
    expect(pet.secretDetail).toBeUndefined();
    expect(pet.claimHash).toBeUndefined();
    expect(pet.imageId).toBeUndefined();
  });

  it('báo capped = false khi còn xa ngưỡng 500 tin', async () => {
    await makePet({ lat: 10.78, lng: 106.7 });

    expect((await request(app).get('/pets/map')).body.capped).toBe(false);
  });

  describe('khi có ô tìm kiếm', () => {
    it('lọc theo nghĩa rồi mới bỏ tin thiếu toạ độ', async () => {
      await makePet({ postId: 'CHO-CO-TOA-DO', embedding: [1, 0, 0], lat: 10.78, lng: 106.7 });
      await makePet({ postId: 'MEO-CO-TOA-DO', embedding: [0, 1, 0], lat: 10.79, lng: 106.71 });
      await makePet({ postId: 'CHO-KHONG-TOA-DO', embedding: [1, 0, 0] });

      const res = await request(app).get('/pets/map').query({ q: 'chó corgi' });

      // Cả ba tin đều được chấm điểm, nhưng chỉ tin có toạ độ mới vẽ được.
      expect(ids(res)).toEqual(['CHO-CO-TOA-DO', 'MEO-CO-TOA-DO']);
      expect(res.body.withoutCoords).toBe(1);
    });

    it('bộ lọc cứng vẫn chặn trước cả khi xếp hạng', async () => {
      await makePet({ postId: 'CHO', species: 'Chó', embedding: [1, 0, 0], lat: 10.78, lng: 106.7 });
      await makePet({ postId: 'MEO', species: 'Mèo', embedding: [0, 1, 0], lat: 10.79, lng: 106.71 });

      const res = await request(app).get('/pets/map').query({ q: 'chó corgi', species: 'Mèo' });

      expect(ids(res)).toEqual(['MEO']);
    });

    it('nhúng hỏng thì lui về khớp nguyên văn, không trả danh sách xếp bừa', async () => {
      mockEmbedQuery.mockResolvedValue(null);
      await makePet({ postId: 'KHOP', breed: 'Husky', lat: 10.78, lng: 106.7 });
      await makePet({ postId: 'KHONG-KHOP', breed: 'Corgi', lat: 10.79, lng: 106.71 });

      const res = await request(app).get('/pets/map').query({ q: 'Husky' });

      expect(ids(res)).toEqual(['KHOP']);
    });
  });
});
