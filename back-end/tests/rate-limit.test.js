const request = require('supertest');

const app = require('../app');
const rateLimit = require('../api/middleware/rateLimit');

describe('Giới hạn tần suất', () => {
  // Hạ ngưỡng để khỏi phải gọi hàng chục lần, xong trả lại ngay —
  // Jest dùng chung tiến trình nên để sót là file test khác lãnh đủ.
  beforeAll(() => {
    process.env.AI_RATE_LIMIT = '3';
    process.env.REGISTER_RATE_LIMIT = '2';
  });

  beforeEach(() => rateLimit.reset());

  afterAll(() => {
    delete process.env.AI_RATE_LIMIT;
    delete process.env.REGISTER_RATE_LIMIT;
  });

  it('chặn khi gọi AI quá nhiều lần trong thời gian ngắn', async () => {
    delete process.env.GEMINI_API_KEY; // dừng trước khi gọi Gemini thật
    const statuses = [];
    for (let i = 0; i < 5; i += 1) {
      const res = await request(app).post('/ai/chat').send({ messages: [{ role: 'user', content: 'hi' }] });
      statuses.push(res.status);
    }
    // Ba lượt đầu đi qua (trả 503 vì thiếu key), hai lượt sau bị chặn.
    expect(statuses.slice(0, 3).every((s) => s !== 429)).toBe(true);
    expect(statuses.slice(3)).toEqual([429, 429]);
  });

  it('trả kèm Retry-After để client biết chờ bao lâu', async () => {
    const send = () => request(app).post('/ai/chat').send({ messages: [{ role: 'user', content: 'hi' }] });
    let res;
    for (let i = 0; i < 5; i += 1) res = await send();
    expect(res.status).toBe(429);
    expect(Number(res.headers['retry-after'])).toBeGreaterThan(0);
  });

  it('ba đường AI dùng CHUNG một hạn mức, không lách được bằng cách gọi xen kẽ', async () => {
    const max = Number(process.env.AI_RATE_LIMIT) || 30;
    for (let i = 0; i < max; i += 1) {
      await request(app).post('/ai/chat').send({ messages: [{ role: 'user', content: 'hi' }] });
    }
    const other = await request(app).get('/ai/match/507f1f77bcf86cd799439011');

    // Cả ba đường đều tốn quota như nhau. Đếm riêng thì gọi luân phiên là
    // nhân ngưỡng lên ba lần.
    expect(other.status).toBe(429);
  });

  it('hạn mức AI đếm chung cho MỌI tin, không phải mỗi tin một suất', async () => {
    const max = Number(process.env.AI_RATE_LIMIT) || 30;
    // Mỗi lượt một mã tin khác nhau. Thiếu scope thì bộ đếm lấy khoá theo
    // đường dẫn, mà mã tin nằm ngay trong đường dẫn — mỗi tin một hạn mức
    // riêng, và lặp qua danh sách tin là gọi được bao nhiêu tuỳ thích.
    const id = (i) => `507f1f77bcf86cd7994${String(39011 + i).padStart(5, '0')}`;
    let cuoi;
    for (let i = 0; i <= max; i += 1) {
      cuoi = await request(app).get(`/ai/match/${id(i)}`);
    }
    expect(cuoi.status).toBe(429);
  });

  it('chặn tạo tài khoản hàng loạt', async () => {
    const statuses = [];
    for (let i = 0; i < 4; i += 1) {
      const res = await request(app)
        .post('/auth/register')
        .send({ name: 'x', email: `spam${i}@example.com`, password: 'matkhau123' });
      statuses.push(res.status);
    }
    expect(statuses.slice(2)).toEqual([429, 429]);
  });
});
