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
