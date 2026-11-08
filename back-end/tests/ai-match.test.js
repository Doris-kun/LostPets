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

// Câu giải thích phải ghép TỪ DỮ LIỆU, không từ chữ model sinh ra.
//
// Lý do có khối test này: trên web thật, với một tin mèo MÀU ĐEN ở Cần Thơ,
// model viết ra "cùng loài mèo và có màu lông xám" để biện minh cho việc khớp
// với một con mèo xám ở Quận 3. Chữ "xám" không tồn tại ở bất kỳ đâu trong tin
// đó. Mục 6.3 của đề cương ghi rõ phần sinh văn bản không được bịa chi tiết
// vắng mặt trong dữ liệu, nên đây là lỗi vi phạm đúng cam kết của dự án.
describe('GET /ai/match/:petId — câu giải thích', () => {
  async function seedMismatch() {
    const lost = await Pet.create({
      postId: 'L-X1', type: 'lost', species: 'Mèo', breed: 'Mèo Anh lông ngắn',
      color: 'Xám', area: 'Quận 3, TP.HCM', contact: '0900 000 001',
      date: new Date('2026-10-01'),
    });
    await Pet.create({
      postId: 'F-X1', type: 'found', species: 'Mèo', breed: 'Mèo mun',
      color: 'Đen', area: 'Ninh Kiều, Cần Thơ', contact: '0900 000 002',
      date: new Date('2026-10-04'),
    });
    return lost;
  }

  const stub = (matches) => {
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('offline'));
    jest.spyOn(GoogleGenAI.prototype.interactions, 'create').mockResolvedValue(reply(matches));
  };

  it('nêu đủ cả hai vế của trường khác nhau', async () => {
    const lost = await seedMismatch();
    stub([{ index: 0, score: 60, photo: 'khong_ro' }]);

    const { body } = await request(app).get(`/ai/match/${lost._id}`);
    const reason = body.matches[0].reason;

    expect(reason).toContain('Xám');
    expect(reason).toContain('Đen');
    expect(reason).toContain('Quận 3, TP.HCM');
    expect(reason).toContain('Ninh Kiều, Cần Thơ');
  });

  it('KHÔNG nói hai màu khác nhau là giống nhau', async () => {
    const lost = await seedMismatch();
    stub([{ index: 0, score: 60, photo: 'khong_ro' }]);

    const { body } = await request(app).get(`/ai/match/${lost._id}`);
    const reason = body.matches[0].reason;

    expect(reason).toMatch(/Khác[^.]*màu/);
    expect(reason).not.toMatch(/Cùng[^.]*màu/);
  });

  it('bỏ qua hoàn toàn chữ model cố tình nhét vào', async () => {
    const lost = await seedMismatch();
    // Đúng câu model đã bịa trên web thật.
    stub([{ index: 0, score: 60, photo: 'khong_ro', reason: 'Cùng loài mèo và có màu lông xám.' }]);

    const { body } = await request(app).get(`/ai/match/${lost._id}`);
    expect(body.matches[0].reason).not.toContain('có màu lông xám');
  });

  it('gộp các trường thật sự giống nhau', async () => {
    const lost = await seedPair(); // hai tin cùng loài, cùng giống, cùng màu
    stub([{ index: 0, score: 88, photo: 'giong' }]);

    const { body } = await request(app).get(`/ai/match/${lost._id}`);
    const reason = body.matches[0].reason;

    expect(reason).toMatch(/Cùng[^.]*loài \(Chó\)/);
    expect(reason).toMatch(/Cùng[^.]*giống \(Corgi\)/);
    expect(reason).toContain('Ảnh trông giống nhau.');
  });

  it('nói rõ khoảng cách ngày giữa hai tin', async () => {
    const lost = await seedMismatch(); // mất 1/10, nhặt được 4/10
    stub([{ index: 0, score: 60, photo: 'khong_ro' }]);

    const { body } = await request(app).get(`/ai/match/${lost._id}`);
    expect(body.matches[0].reason).toContain('3 ngày sau khi mất');
  });

  it('không nhắc tới ảnh khi model trả khong_ro', async () => {
    const lost = await seedMismatch();
    stub([{ index: 0, score: 60, photo: 'khong_ro' }]);

    const { body } = await request(app).get(`/ai/match/${lost._id}`);
    expect(body.matches[0].reason).not.toMatch(/Ảnh/);
  });

  it('không sập khi model trả giá trị ảnh lạ', async () => {
    const lost = await seedMismatch();
    stub([{ index: 0, score: 60, photo: 'mot-gia-tri-la' }]);

    const { body } = await request(app).get(`/ai/match/${lost._id}`);
    expect(body.matches[0].reason).toBeTruthy();
    expect(body.matches[0].reason).not.toContain('mot-gia-tri-la');
  });
});
