const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { GoogleGenAI } = require('@google/genai');

process.env.GEMINI_API_KEY = 'AIza-test-key';
const app = require('../app');
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

afterEach(async () => {
  jest.restoreAllMocks();
  await Pet.deleteMany({});
});

const reply = (matches) => ({ output_text: JSON.stringify({ matches }) });

// Tạo một cặp tin ngược loại để endpoint có ứng viên mà chấm.
async function seedPair() {
  const lost = await Pet.create({
    postId: 'L-T1', type: 'lost', species: 'Chó', breed: 'Corgi',
    color: 'Nâu trắng', area: 'Quận 1', contact: '0900 000 001',
    image: 'https://example.com/a.jpg',
  });
  await Pet.create({
    postId: 'F-T1', type: 'found', species: 'Chó', breed: 'Corgi',
    color: 'Nâu trắng', area: 'Quận 3', contact: '0900 000 002',
    image: 'https://example.com/b.jpg',
  });
  return lost;
}

describe('GET /ai/match/:petId — các tình huống hỏng', () => {
  it('id sai định dạng trả 404 chứ không phải 500', async () => {
    const res = await request(app).get('/ai/match/khong-phai-objectid');
    expect(res.status).toBe(404);
  });

  it('id đúng định dạng nhưng không tồn tại trả 404', async () => {
    const res = await request(app).get('/ai/match/507f1f77bcf86cd799439011');
    expect(res.status).toBe(404);
  });

  it('không có ứng viên nào thì trả mảng rỗng chứ không lỗi', async () => {
    const lost = await Pet.create({
      postId: 'L-T2', type: 'lost', species: 'Mèo', breed: 'Mèo mướp',
      color: 'Vện', area: 'Quận 1', contact: '0900 000 003',
    });
    const res = await request(app).get(`/ai/match/${lost._id}`);
    expect(res.status).toBe(200);
    expect(res.body.matches).toEqual([]);
  });

  it('ảnh tải không được thì vẫn đối chiếu bằng mô tả', async () => {
    const lost = await seedPair();
    // Mọi lượt tải ảnh đều hỏng.
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('ENOTFOUND'));
    const create = jest
      .spyOn(GoogleGenAI.prototype.interactions, 'create')
      .mockResolvedValue(reply([{ index: 0, score: 80, reason: 'Khớp giống và màu.' }]));

    const res = await request(app).get(`/ai/match/${lost._id}`);

    expect(res.status).toBe(200);
    expect(res.body.matches).toHaveLength(1);
    // Không có ảnh nào được gửi đi, nhưng vẫn gọi Gemini bình thường.
    const sent = create.mock.calls[0][0].input;
    expect(sent.some((part) => part.type === 'image')).toBe(false);
  });

  it('Gemini từ chối vì ảnh thì thử lại bằng chữ và vẫn trả kết quả', async () => {
    const lost = await seedPair();
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      headers: { get: () => 'image/jpeg' },
      arrayBuffer: async () => new ArrayBuffer(16),
    });
    const create = jest
      .spyOn(GoogleGenAI.prototype.interactions, 'create')
      .mockRejectedValueOnce(new Error('400 Cannot fetch content from the provided URL'))
      .mockResolvedValueOnce(reply([{ index: 0, score: 75, reason: 'Khớp theo mô tả.' }]));

    const res = await request(app).get(`/ai/match/${lost._id}`);

    expect(res.status).toBe(200);
    expect(res.body.matches[0].score).toBe(75);
    expect(create).toHaveBeenCalledTimes(2);
    // Lần đầu có ảnh, lần thử lại thì không.
    expect(create.mock.calls[0][0].input.some((p) => p.type === 'image')).toBe(true);
    expect(create.mock.calls[1][0].input.some((p) => p.type === 'image')).toBe(false);
  });

  it('bỏ qua ứng viên AI chấm dưới ngưỡng', async () => {
    const lost = await seedPair();
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('offline'));
    jest
      .spyOn(GoogleGenAI.prototype.interactions, 'create')
      .mockResolvedValue(reply([{ index: 0, score: 12, reason: 'Khác giống.' }]));

    const res = await request(app).get(`/ai/match/${lost._id}`);
    expect(res.status).toBe(200);
    expect(res.body.matches).toEqual([]);
  });

  it('bỏ qua index AI bịa ra ngoài danh sách ứng viên', async () => {
    const lost = await seedPair();
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('offline'));
    jest
      .spyOn(GoogleGenAI.prototype.interactions, 'create')
      .mockResolvedValue(reply([{ index: 99, score: 95, reason: 'Ứng viên không tồn tại.' }]));

    const res = await request(app).get(`/ai/match/${lost._id}`);
    expect(res.status).toBe(200);
    expect(res.body.matches).toEqual([]);
  });

  it('AI trả về chuỗi không phải JSON thì báo 502 chứ không sập', async () => {
    const lost = await seedPair();
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('offline'));
    jest
      .spyOn(GoogleGenAI.prototype.interactions, 'create')
      .mockResolvedValue({ output_text: 'xin chào, đây không phải JSON' });

    const res = await request(app).get(`/ai/match/${lost._id}`);
    expect(res.status).toBe(502);
  });

  it('cả hai lần gọi đều hỏng thì trả 500 có thông báo', async () => {
    const lost = await seedPair();
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('offline'));
    jest
      .spyOn(GoogleGenAI.prototype.interactions, 'create')
      .mockRejectedValue(new Error('dịch vụ chết hẳn'));

    const res = await request(app).get(`/ai/match/${lost._id}`);
    expect(res.status).toBe(500);
    expect(res.body.message).toBeTruthy();
  });

  it('AI quá chậm thì trả 504', async () => {
    const lost = await seedPair();
    process.env.AI_TIMEOUT_MS = '200';
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('offline'));
    jest
      .spyOn(GoogleGenAI.prototype.interactions, 'create')
      .mockImplementation(() => new Promise(() => {}));

    const res = await request(app).get(`/ai/match/${lost._id}`);
    delete process.env.AI_TIMEOUT_MS;

    expect(res.status).toBe(504);
    expect(res.body.message).toMatch(/quá tải/);
  });
});
