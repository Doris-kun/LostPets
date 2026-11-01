const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Pet = require('../api/models/petModel');
const { findCandidates, candidateFilter, oppositeType } = require('../api/lib/matching');

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
  await Pet.deleteMany({});
});

const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

const make = (over = {}) => ({
  type: 'found',
  species: 'Chó',
  breed: 'Không rõ',
  color: 'Trắng',
  area: 'Quận 1',
  contact: '0900000000',
  date: daysAgo(1),
  ...over,
});

// Vector hai chiều cho dễ tính nhẩm: [1,0] và [0,1] vuông góc nhau (cosine 0),
// [1,0] trùng chính nó (cosine 1). Không cần gọi API để kiểm tra thứ tự.
const V = {
  same: [1, 0],
  near: [0.9, 0.44],
  far: [0, 1],
};

describe('oppositeType', () => {
  it('đổi lost thành found và ngược lại', () => {
    expect(oppositeType('lost')).toBe('found');
    expect(oppositeType('found')).toBe('lost');
  });
});

describe('candidateFilter', () => {
  it('chỉ nhận tin ngược loại, cùng loài, chưa giải quyết', () => {
    const f = candidateFilter({ _id: 'x', type: 'lost', species: 'Mèo' });
    expect(f.type).toBe('found');
    expect(f.species).toBe('Mèo');
    expect(f.resolved).toBe(false);
    expect(f._id).toEqual({ $ne: 'x' });
  });
});

describe('findCandidates', () => {
  it('loại tin cùng loại, khác loài, đã giải quyết và quá cũ', async () => {
    const source = await Pet.create(make({ type: 'lost', embedding: V.same }));
    await Pet.create(make({ type: 'lost', color: 'cùng loại tin' }));
    await Pet.create(make({ species: 'Mèo', color: 'khác loài' }));
    await Pet.create(make({ resolved: true, color: 'đã giải quyết' }));
    await Pet.create(make({ date: daysAgo(400), color: 'quá cũ' }));
    const hop_le = await Pet.create(make({ color: 'hợp lệ' }));

    const found = await findCandidates(source);
    expect(found).toHaveLength(1);
    expect(String(found[0]._id)).toBe(String(hop_le._id));
  });

  it('xếp theo độ giống chứ không theo ngày khi tin gốc có vector', async () => {
    const source = await Pet.create(make({ type: 'lost', embedding: V.same }));
    // Tin giống nhất lại là tin CŨ NHẤT. Nếu xếp theo ngày thì nó đứng chót.
    const giong_nhat = await Pet.create(make({ color: 'giống nhất', date: daysAgo(90), embedding: V.same }));
    await Pet.create(make({ color: 'giống vừa', date: daysAgo(30), embedding: V.near }));
    await Pet.create(make({ color: 'khác hẳn', date: daysAgo(1), embedding: V.far }));

    const found = await findCandidates(source);
    expect(String(found[0]._id)).toBe(String(giong_nhat._id));
    expect(found.map((p) => p.color)).toEqual(['giống nhất', 'giống vừa', 'khác hẳn']);
  });

  it('rơi về xếp theo ngày khi tin gốc chưa có vector', async () => {
    const source = await Pet.create(make({ type: 'lost' }));
    await Pet.create(make({ color: 'cũ', date: daysAgo(90), embedding: V.same }));
    const moi = await Pet.create(make({ color: 'mới', date: daysAgo(1), embedding: V.far }));

    const found = await findCandidates(source);
    // Dù 'cũ' giống hơn hẳn, không có vector bên tin gốc thì không so được.
    expect(String(found[0]._id)).toBe(String(moi._id));
  });

  it('đẩy tin chưa nhúng xuống cuối thay vì bỏ hẳn', async () => {
    const source = await Pet.create(make({ type: 'lost', embedding: V.same }));
    await Pet.create(make({ color: 'chưa nhúng', date: daysAgo(1) }));
    const co_vector = await Pet.create(make({ color: 'có vector', date: daysAgo(50), embedding: V.near }));

    const found = await findCandidates(source);
    expect(String(found[0]._id)).toBe(String(co_vector._id));
    // Tin cũ vẫn phải còn trong danh sách — thà xếp kém còn hơn không trả gì.
    expect(found.map((p) => p.color)).toContain('chưa nhúng');
  });

  it('cắt đúng số lượng yêu cầu', async () => {
    const source = await Pet.create(make({ type: 'lost', embedding: V.same }));
    for (let i = 0; i < 6; i++) {
      await Pet.create(make({ color: `tin ${i}`, embedding: V.near }));
    }
    expect(await findCandidates(source)).toHaveLength(3);
    expect(await findCandidates(source, { limit: 2 })).toHaveLength(2);
  });
});
