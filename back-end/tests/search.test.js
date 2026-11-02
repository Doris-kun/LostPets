const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Vector giả, 3 chiều cho dễ đọc. Mỗi "chủ đề" là một trục: chó, mèo, khu vực.
// Nhờ vậy khẳng định được thứ tự xếp hạng mà không cần gọi Gemini thật.
const VECTORS = {
  'chó corgi nâu': [1, 0, 0],
  'mèo tam thể': [0, 1, 0],
  'quận 1': [0, 0, 1],
  'chó': [0.9, 0.1, 0],
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

// Ba tin nằm trên ba trục khác nhau của vector giả ở trên.
async function seedThree() {
  const corgi = await makePet({
    postId: 'L-CORGI1', breed: 'Corgi', color: 'Nâu trắng', embedding: [1, 0, 0],
  });
  const meo = await makePet({
    postId: 'L-MEO001', species: 'Mèo', breed: 'Mèo ta', color: 'Tam thể', embedding: [0, 1, 0],
  });
  const quan1 = await makePet({
    postId: 'L-Q1X001', breed: 'Husky', color: 'Đen trắng', area: 'Quận 1', embedding: [0, 0, 1],
  });
  return { corgi, meo, quan1 };
}

const search = (q, params = {}) =>
  request(app).get('/pets').query({ q, ...params });

describe('Xếp hạng theo nghĩa', () => {
  it('tin gần câu hỏi nhất đứng đầu', async () => {
    await seedThree();
    const res = await search('chó corgi nâu');
    expect(res.status).toBe(200);
    expect(res.body.pets[0].postId).toBe('L-CORGI1');
  });

  it('đổi câu hỏi thì đổi thứ tự', async () => {
    await seedThree();
    const res = await search('mèo tam thể');
    expect(res.body.pets[0].postId).toBe('L-MEO001');
  });

  it('trả về mọi tin chứ không cắt theo ngưỡng điểm', async () => {
    await seedThree();
    const res = await search('mèo tam thể');
    // Hai tin kia điểm 0 nhưng vẫn phải có mặt: vector chỉ xếp thứ tự,
    // không được quyền giấu tin của người ta.
    expect(res.body.pets).toHaveLength(3);
    expect(res.body.total).toBe(3);
  });

  it('không có câu hỏi thì vẫn sắp theo ngày như cũ', async () => {
    await makePet({ postId: 'L-CU0001', date: new Date('2020-01-01') });
    await makePet({ postId: 'L-MOI001', date: new Date() });
    const res = await request(app).get('/pets');
    expect(res.body.pets[0].postId).toBe('L-MOI001');
    expect(mockEmbedQuery).not.toHaveBeenCalled();
  });
});

describe('Khớp nguyên văn luôn đứng trên', () => {
  it('gõ mã tin thì ra đúng tin đó dù điểm ngữ nghĩa bằng 0', async () => {
    await seedThree();
    // 'L-MEO001' không có trong bảng vector giả nên embedQuery trả null...
    mockEmbedQuery.mockResolvedValue([1, 0, 0]); // ...giả như nó nghiêng hẳn về Corgi
    const res = await search('L-MEO001');
    expect(res.body.pets[0].postId).toBe('L-MEO001');
  });

  it('khớp chữ trong mô tả cũng được ưu tiên', async () => {
    await makePet({ postId: 'L-AAA001', description: 'Có đốm lông hình trái tim', embedding: [0, 0, 1] });
    await makePet({ postId: 'L-BBB001', embedding: [1, 0, 0] });
    mockEmbedQuery.mockResolvedValue([1, 0, 0]);
    const res = await search('đốm lông hình trái tim');
    expect(res.body.pets[0].postId).toBe('L-AAA001');
  });

  it('không phân biệt hoa thường', async () => {
    await seedThree();
    mockEmbedQuery.mockResolvedValue([1, 0, 0]);
    const res = await search('l-meo001');
    expect(res.body.pets[0].postId).toBe('L-MEO001');
  });
});

describe('Bộ lọc cứng vẫn chặn trước', () => {
  it('lọc loài thì câu hỏi không kéo tin loài khác vào', async () => {
    await seedThree();
    const res = await search('chó corgi nâu', { species: 'Mèo' });
    expect(res.body.pets).toHaveLength(1);
    expect(res.body.pets[0].postId).toBe('L-MEO001');
  });

  it('lọc loại tin vẫn áp dụng', async () => {
    await makePet({ postId: 'L-AAA002', type: 'lost', embedding: [1, 0, 0] });
    await makePet({ postId: 'F-BBB002', type: 'found', embedding: [1, 0, 0] });
    const res = await search('chó corgi nâu', { type: 'found' });
    expect(res.body.pets).toHaveLength(1);
    expect(res.body.pets[0].postId).toBe('F-BBB002');
  });

  it('phân trang chạy trên kết quả đã xếp hạng', async () => {
    await seedThree();
    const res = await search('chó corgi nâu', { limit: 1, skip: 1 });
    expect(res.body.pets).toHaveLength(1);
    expect(res.body.total).toBe(3);
    expect(res.body.pets[0].postId).not.toBe('L-CORGI1');
  });
});

describe('Khi nhúng hỏng', () => {
  it('nhúng câu hỏi thất bại thì lui về lọc theo chữ', async () => {
    await seedThree();
    mockEmbedQuery.mockResolvedValue(null);
    const res = await search('corgi');
    expect(res.status).toBe(200);
    expect(res.body.pets).toHaveLength(1);
    expect(res.body.pets[0].postId).toBe('L-CORGI1');
  });

  it('nhúng hỏng và không khớp chữ nào thì trả danh sách rỗng, không xếp bừa', async () => {
    await seedThree();
    mockEmbedQuery.mockResolvedValue(null);
    const res = await search('không có gì khớp cả');
    expect(res.body.pets).toHaveLength(0);
    expect(res.body.total).toBe(0);
  });

  it('tin chưa kịp nhúng vẫn hiện, chỉ là xếp sau', async () => {
    await makePet({ postId: 'L-CHUA01' }); // không có embedding
    await makePet({ postId: 'L-COVEC1', embedding: [1, 0, 0] });
    const res = await search('chó corgi nâu');
    expect(res.body.pets).toHaveLength(2);
    expect(res.body.pets[0].postId).toBe('L-COVEC1');
  });
});

describe('Vector không lọt ra ngoài API', () => {
  it('danh sách không kèm embedding', async () => {
    await seedThree();
    const res = await search('chó corgi nâu');
    res.body.pets.forEach((pet) => expect(pet.embedding).toBeUndefined());
  });

  it('danh sách không có câu hỏi cũng không kèm embedding', async () => {
    await seedThree();
    const res = await request(app).get('/pets');
    res.body.pets.forEach((pet) => expect(pet.embedding).toBeUndefined());
  });

  it('xem chi tiết tin không kèm embedding', async () => {
    const { corgi } = await seedThree();
    const res = await request(app).get(`/pets/${corgi._id}`);
    expect(res.body.embedding).toBeUndefined();
  });
});

describe('Nhúng ngầm lúc đăng và sửa tin', () => {
  it('đăng tin xong thì nhúng chạy ngầm', async () => {
    await request(app).post('/pets').send({
      type: 'lost', species: 'Chó', breed: 'Corgi', color: 'Nâu',
      area: 'Quận 1', contact: '0900 000 009',
    }).expect(201);

    expect(mockEmbedDocument).toHaveBeenCalledTimes(1);
    // Văn bản nhúng phải có nội dung mô tả, không được có số điện thoại.
    const text = mockEmbedDocument.mock.calls[0][0];
    expect(text).toContain('Corgi');
    expect(text).not.toContain('0900 000 009');
  });

  it('nhúng hỏng thì tin vẫn đăng được bình thường', async () => {
    mockEmbedDocument.mockRejectedValue(new Error('Gemini sập'));
    const res = await request(app).post('/pets').send({
      type: 'lost', species: 'Chó', breed: 'Corgi', color: 'Nâu',
      area: 'Quận 1', contact: '0900 000 010',
    });
    expect(res.status).toBe(201);
    expect(await Pet.countDocuments()).toBe(1);
  });

  it('sửa mô tả thì nhúng lại', async () => {
    const { corgi } = await seedThree();
    const crypto = require('crypto');
    await Pet.updateOne({ _id: corgi._id },
      { $set: { claimHash: crypto.createHash('sha256').update('MA-X').digest('hex') } });
    mockEmbedDocument.mockClear();

    await request(app).put(`/pets/${corgi._id}`)
      .set('x-claim-code', 'MA-X')
      .send({ description: 'Mô tả mới' })
      .expect(200);

    expect(mockEmbedDocument).toHaveBeenCalledTimes(1);
  });

  it('bấm "đã tìm thấy" thì KHÔNG nhúng lại, khỏi đốt quota', async () => {
    const { corgi } = await seedThree();
    const crypto = require('crypto');
    await Pet.updateOne({ _id: corgi._id },
      { $set: { claimHash: crypto.createHash('sha256').update('MA-Y').digest('hex') } });
    mockEmbedDocument.mockClear();

    await request(app).put(`/pets/${corgi._id}`)
      .set('x-claim-code', 'MA-Y')
      .send({ resolved: true })
      .expect(200);

    expect(mockEmbedDocument).not.toHaveBeenCalled();
  });
});

describe('Câu hỏi bất thường', () => {
  it('câu hỏi toàn khoảng trắng thì coi như không tìm', async () => {
    await seedThree();
    const res = await search('   ');
    expect(res.body.pets).toHaveLength(3);
    expect(mockEmbedQuery).not.toHaveBeenCalled();
  });

  it('câu hỏi dài quá bị cắt chứ không làm sập server', async () => {
    await seedThree();
    const res = await search('a'.repeat(5000));
    expect(res.status).toBe(200);
    expect(mockEmbedQuery.mock.calls[0][0].length).toBeLessThanOrEqual(200);
  });
});
