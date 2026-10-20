const request = require('supertest');
const app = require('../app');

// Các test này không gọi Gemini thật: chúng chỉ kiểm tra phần xác thực đầu vào
// và nhánh xử lý khi chưa cấu hình API key, nên CI chạy được mà không tốn tiền.
describe('POST /ai/analyze-image', () => {
  const originalKey = process.env.GEMINI_API_KEY;

  afterEach(() => {
    if (originalKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalKey;
  });

  it('trả về 503 khi chưa cấu hình GEMINI_API_KEY', async () => {
    delete process.env.GEMINI_API_KEY;
    const res = await request(app)
      .post('/ai/analyze-image')
      .attach('image', Buffer.from('fake'), { filename: 'a.jpg', contentType: 'image/jpeg' });
    expect(res.status).toBe(503);
    expect(res.body.message).toMatch(/GEMINI_API_KEY/);
  });

  it('trả về 400 khi không gửi ảnh', async () => {
    process.env.GEMINI_API_KEY = 'AIza-test-key';
    const res = await request(app).post('/ai/analyze-image');
    expect(res.status).toBe(400);
  });

  it('trả về 400 khi file không phải ảnh', async () => {
    process.env.GEMINI_API_KEY = 'AIza-test-key';
    const res = await request(app)
      .post('/ai/analyze-image')
      .attach('image', Buffer.from('not an image'), {
        filename: 'a.txt',
        contentType: 'text/plain',
      });
    expect(res.status).toBe(400);
  });
});

describe('GET /ai/match/:petId', () => {
  const originalKey = process.env.GEMINI_API_KEY;

  afterEach(() => {
    if (originalKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalKey;
  });

  it('trả về 503 khi chưa cấu hình GEMINI_API_KEY', async () => {
    delete process.env.GEMINI_API_KEY;
    const res = await request(app).get('/ai/match/507f1f77bcf86cd799439011');
    expect(res.status).toBe(503);
  });
});

describe('Timeout khi AI quá chậm', () => {
  const originalKey = process.env.GEMINI_API_KEY;
  afterEach(() => {
    jest.restoreAllMocks();
    delete process.env.AI_TIMEOUT_MS;
    if (originalKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalKey;
  });

  it('trả 504 thay vì treo tới khi proxy cắt', async () => {
    process.env.GEMINI_API_KEY = 'AIza-test-key';
    process.env.AI_TIMEOUT_MS = '200';
    const { GoogleGenAI } = require('@google/genai');
    // Giả lập Gemini không bao giờ trả lời.
    jest
      .spyOn(GoogleGenAI.prototype.interactions, 'create')
      .mockImplementation(() => new Promise(() => {}));

    const res = await request(app)
      .post('/ai/analyze-image')
      .attach('image', Buffer.from('fake'), { filename: 'a.jpg', contentType: 'image/jpeg' });

    expect(res.status).toBe(504);
    expect(res.body.message).toMatch(/quá tải/);
  });
});
