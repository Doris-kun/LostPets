const request = require('supertest');
const { GoogleGenAI } = require('@google/genai');

const app = require('../app');

const send = (messages) => request(app).post('/ai/chat').send({ messages });
const ask = (text) => send([{ role: 'user', content: text }]);

describe('POST /ai/chat', () => {
  const originalKey = process.env.GEMINI_API_KEY;

  beforeEach(() => {
    process.env.GEMINI_API_KEY = 'AIza-test-key';
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete process.env.AI_TIMEOUT_MS;
    if (originalKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalKey;
  });

  it('trả 503 khi chưa cấu hình GEMINI_API_KEY', async () => {
    delete process.env.GEMINI_API_KEY;
    const res = await ask('xin chào');
    expect(res.status).toBe(503);
  });

  it('trả lời khi hỏi bình thường', async () => {
    const create = jest
      .spyOn(GoogleGenAI.prototype.interactions, 'create')
      .mockResolvedValue({ output_text: 'Bạn bấm nút Đăng Báo Cáo nhé.' });

    const res = await ask('làm sao đăng tin');

    expect(res.status).toBe(200);
    expect(res.body.reply).toMatch(/Đăng Báo Cáo/);
    // Luôn kèm hướng dẫn hệ thống để trợ lý không bịa tính năng.
    expect(create.mock.calls[0][0].system_instruction).toMatch(/Lost Pets/);
  });

  it('gửi cả hội thoại trước đó để trợ lý hiểu ngữ cảnh', async () => {
    const create = jest
      .spyOn(GoogleGenAI.prototype.interactions, 'create')
      .mockResolvedValue({ output_text: 'ok' });

    await send([
      { role: 'user', content: 'tôi mất mèo' },
      { role: 'assistant', content: 'bạn bấm Đăng Báo Cáo' },
      { role: 'user', content: 'không biết giống thì sao' },
    ]);

    const text = create.mock.calls[0][0].input[0].content[0].text;
    expect(text).toMatch(/tôi mất mèo/);
    expect(text).toMatch(/không biết giống thì sao/);
  });

  it('từ chối khi không có nội dung', async () => {
    const res = await send([]);
    expect(res.status).toBe(400);
  });

  it('từ chối khi messages không phải mảng', async () => {
    const res = await request(app).post('/ai/chat').send({ messages: 'xin chào' });
    expect(res.status).toBe(400);
  });

  it('từ chối hội thoại quá dài', async () => {
    const many = Array.from({ length: 21 }, () => ({ role: 'user', content: 'a' }));
    const res = await send(many);
    expect(res.status).toBe(400);
  });

  it('từ chối tin nhắn quá dài', async () => {
    const res = await ask('a'.repeat(1001));
    expect(res.status).toBe(400);
  });

  it('bỏ qua tin nhắn rỗng, chỉ toàn rỗng thì báo lỗi', async () => {
    const res = await send([{ role: 'user', content: '   ' }]);
    expect(res.status).toBe(400);
  });

  it('trả 502 khi trợ lý trả về chuỗi rỗng', async () => {
    jest
      .spyOn(GoogleGenAI.prototype.interactions, 'create')
      .mockResolvedValue({ output_text: '   ' });
    const res = await ask('xin chào');
    expect(res.status).toBe(502);
  });

  it('trả 504 khi trợ lý quá chậm', async () => {
    process.env.AI_TIMEOUT_MS = '200';
    jest
      .spyOn(GoogleGenAI.prototype.interactions, 'create')
      .mockImplementation(() => new Promise(() => {}));
    const res = await ask('xin chào');
    expect(res.status).toBe(504);
    expect(res.body.message).toMatch(/bận/);
  });

  it('trả 500 kèm thông báo khi dịch vụ hỏng', async () => {
    jest
      .spyOn(GoogleGenAI.prototype.interactions, 'create')
      .mockRejectedValue(new Error('dịch vụ chết'));
    const res = await ask('xin chào');
    expect(res.status).toBe(500);
    expect(res.body.message).toBeTruthy();
  });
});
