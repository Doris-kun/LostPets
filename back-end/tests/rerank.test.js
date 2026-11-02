const { shouldRerank, isEnabled, MIN_QUERY_WORDS } = require('../api/lib/rerank');

// Không gọi Gemini thật: thay module SDK bằng bản giả, để kiểm tra phần logic
// xung quanh — quyết định có gọi hay không, xử lý khi model trả rác, và cam
// kết không bao giờ làm mất tin.
jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn().mockImplementation(() => ({
    interactions: { create: (...args) => global.__fakeCreate(...args) },
  })),
}));

const { rerank } = require('../api/lib/rerank');

const pet = (i) => ({
  _id: `id${i}`,
  type: 'found',
  species: 'Chó',
  breed: 'Không rõ',
  color: `màu ${i}`,
  area: 'Quận 1',
  description: `tin số ${i}`,
});

const reply = (ranking) => ({ output_text: JSON.stringify({ ranking }) });

beforeEach(() => {
  process.env.GEMINI_API_KEY = 'khoa-gia-cho-test';
  process.env.SEARCH_RERANK = 'on';
  global.__fakeCreate = jest.fn();
});

afterEach(() => {
  delete process.env.SEARCH_RERANK;
});

describe('shouldRerank', () => {
  it('bỏ qua câu quá ngắn — tra từ khoá thì vector đã đủ', () => {
    expect(shouldRerank('poodle')).toBe(false);
    expect(shouldRerank('mèo tam thể')).toBe(false);
  });

  it('nhận câu đủ dài để coi là mô tả', () => {
    expect(MIN_QUERY_WORDS).toBeGreaterThan(1);
    expect(shouldRerank('chó nhỏ lông xù màu trắng ngà')).toBe(true);
  });

  it('tắt hẳn khi SEARCH_RERANK không phải on', () => {
    process.env.SEARCH_RERANK = 'off';
    expect(isEnabled()).toBe(false);
    expect(shouldRerank('chó nhỏ lông xù màu trắng ngà')).toBe(false);
  });

  it('mặc định tắt khi không khai biến', () => {
    delete process.env.SEARCH_RERANK;
    expect(isEnabled()).toBe(false);
  });
});

describe('rerank', () => {
  it('sắp lại theo điểm model chấm', async () => {
    global.__fakeCreate.mockResolvedValue(reply([
      { index: 0, score: 10 },
      { index: 1, score: 90 },
      { index: 2, score: 50 },
    ]));
    const out = await rerank('chó nhỏ lông xù màu trắng', [pet(0), pet(1), pet(2)]);
    expect(out.map((p) => p._id)).toEqual(['id1', 'id2', 'id0']);
  });

  it('không bao giờ làm mất tin, kể cả tin bị chấm 0 điểm', async () => {
    global.__fakeCreate.mockResolvedValue(reply([
      { index: 0, score: 0 },
      { index: 1, score: 100 },
    ]));
    const out = await rerank('chó nhỏ lông xù màu trắng', [pet(0), pet(1)]);
    expect(out).toHaveLength(2);
    expect(out.map((p) => p._id)).toContain('id0');
  });

  it('giữ nguyên thứ tự cũ cho tin model quên chấm', async () => {
    global.__fakeCreate.mockResolvedValue(reply([{ index: 2, score: 99 }]));
    const out = await rerank('chó nhỏ lông xù màu trắng', [pet(0), pet(1), pet(2)]);
    expect(out[0]._id).toBe('id2');
    expect(out.map((p) => p._id).slice(1)).toEqual(['id0', 'id1']);
  });

  it('trả nguyên thứ tự cũ khi model hỏng', async () => {
    global.__fakeCreate.mockRejectedValue(new Error('503 quá tải'));
    const input = [pet(0), pet(1), pet(2)];
    const out = await rerank('chó nhỏ lông xù màu trắng', input);
    expect(out.map((p) => p._id)).toEqual(['id0', 'id1', 'id2']);
  });

  it('trả nguyên thứ tự cũ khi model trả rác', async () => {
    global.__fakeCreate.mockResolvedValue({ output_text: 'không phải JSON' });
    const out = await rerank('chó nhỏ lông xù màu trắng', [pet(0), pet(1)]);
    expect(out.map((p) => p._id)).toEqual(['id0', 'id1']);
  });

  it('không gọi model khi chỉ có một tin', async () => {
    const out = await rerank('chó nhỏ lông xù màu trắng', [pet(0)]);
    expect(out).toHaveLength(1);
    expect(global.__fakeCreate).not.toHaveBeenCalled();
  });
});
