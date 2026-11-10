const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Chặn hẳn đường ra Gemini. Trên máy phát triển, GEMINI_API_KEY nằm trong biến
// môi trường của Windows chứ không chỉ trong .env, nên không chặn là test gọi
// API thật và đốt quota thật — gói miễn phí chỉ cho 100 lượt nhúng mỗi phút
// cho cả dự án. Đã bị một lần lúc chạy script đo tải.
let mockEmbedCalls = 0;
jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn().mockImplementation(() => ({
    models: {
      embedContent: async () => {
        mockEmbedCalls += 1;
        if (global.__embedFails) throw new Error('hết quota');
        return { embeddings: [{ values: Array.from({ length: 768 }, () => 0.1) }] };
      },
    },
  })),
}));

process.env.GEMINI_API_KEY = 'khoa-gia-cho-test';

const app = require('../app');
const Pet = require('../api/models/petModel');
const { embedQuery } = require('../api/lib/embedding');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  await Pet.init(); // dựng index khai báo trong schema trước khi kiểm kế hoạch truy vấn
}, 30000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(() => {
  mockEmbedCalls = 0;
  global.__embedFails = false;
  embedQuery.reset();
});

afterEach(async () => {
  await Pet.deleteMany({});
});

const seed = (n) => {
  const docs = [];
  for (let i = 0; i < n; i++) {
    docs.push({
      type: i % 2 ? 'lost' : 'found',
      species: ['Mèo', 'Chó', 'Chim', 'Khác'][Math.floor(i / 2) % 4],
      breed: 'Corgi', color: 'Nâu', area: 'Quận 1', contact: '0900000000',
      resolved: false, date: new Date(Date.now() - i * 60000), embedding: [],
    });
  }
  return Pet.collection.insertMany(docs);
};

// Đi xuống dọc cây kế hoạch, trả về tên các stage.
const stagesOf = (plan) => {
  const out = [];
  let node = plan.queryPlanner.winningPlan.queryPlan || plan.queryPlanner.winningPlan;
  while (node) {
    out.push(node.stage);
    node = node.inputStage || (node.inputStages || [])[0];
  }
  return out;
};

describe('index phục vụ đúng truy vấn thật', () => {
  it('danh sách tin KHÔNG được quét toàn bộ collection', async () => {
    await seed(300);
    const plan = await Pet.find({}).sort({ date: -1 }).limit(9).explain('queryPlanner');
    const stages = stagesOf(plan);

    // Đo trên 20.000 tin: COLLSCAN + SORT là 251 req/s, IXSCAN là 675 req/s.
    // Test này tồn tại để index {date: -1} không bị ai xoá mà không ai biết.
    expect(stages).toContain('IXSCAN');
    expect(stages).not.toContain('COLLSCAN');
    expect(stages).not.toContain('SORT');
  });

  it('truy vấn lấy ứng viên so khớp chỉ lấy đúng số bản ghi cần', async () => {
    await seed(300);
    const since = new Date();
    since.setDate(since.getDate() - 120);

    const plan = await Pet.find({
      type: 'found', species: 'Mèo', resolved: false, date: { $gte: since },
    }).sort({ date: -1 }).limit(10).explain('executionStats');

    expect(stagesOf(plan)).toContain('IXSCAN');
    // Không có index ghép thì nó phải lấy lên rồi loại bớt. Có thì lấy đúng số.
    expect(plan.executionStats.totalDocsExamined)
      .toBe(plan.executionStats.nReturned);
  });
});

describe('nhớ tạm vector câu tìm kiếm', () => {
  it('cùng một câu chỉ gọi Gemini một lần', async () => {
    await embedQuery('mèo tam thể');
    await embedQuery('mèo tam thể');
    await embedQuery('mèo tam thể');
    // Không nhớ thì ba lượt tìm giống nhau ăn ba suất trong trần 100/phút.
    expect(mockEmbedCalls).toBe(1);
  });

  it('câu khác nhau vẫn gọi riêng', async () => {
    await embedQuery('mèo tam thể');
    await embedQuery('chó corgi');
    expect(mockEmbedCalls).toBe(2);
  });

  it('trả về đúng vector ở lần đọc lại', async () => {
    const first = await embedQuery('mèo tam thể');
    const second = await embedQuery('mèo tam thể');
    expect(second).toEqual(first);
    expect(second).toHaveLength(768);
  });

  it('KHÔNG nhớ lần hỏng, để phút sau quota hồi thì thử lại được', async () => {
    global.__embedFails = true;
    expect(await embedQuery('mèo tam thể')).toBeNull();

    global.__embedFails = false;
    expect(await embedQuery('mèo tam thể')).toHaveLength(768);
    expect(mockEmbedCalls).toBe(2);
  });

  it('không phình quá trần, và bỏ câu lâu nhất không ai dùng', async () => {
    // Trần thật là 500; đẩy quá một chút để kiểm cơ chế bỏ bớt.
    for (let i = 0; i < 505; i++) await embedQuery(`câu số ${i}`);
    expect(embedQuery.size()).toBeLessThanOrEqual(500);

    // Năm câu đầu đã bị bỏ, nên hỏi lại là phải gọi Gemini lần nữa.
    const before = mockEmbedCalls;
    await embedQuery('câu số 0');
    expect(mockEmbedCalls).toBe(before + 1);
  });
});

describe('nén phản hồi', () => {
  it('nén khi trình duyệt khai là đỡ được', async () => {
    await seed(50);
    const res = await request(app).get('/pets?limit=50').set('Accept-Encoding', 'gzip');
    // Đo được: 22.613 byte xuống 1.329 byte, nhỏ hơn 17 lần.
    expect(res.headers['content-encoding']).toBe('gzip');
  });

  it('KHÔNG nén khi trình duyệt không khai', async () => {
    await seed(50);
    const res = await request(app).get('/pets?limit=50').set('Accept-Encoding', 'identity');
    expect(res.headers['content-encoding']).toBeUndefined();
  });
});
