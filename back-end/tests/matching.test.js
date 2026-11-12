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
describe('lọc theo khoảng cách', () => {
  // Quận 3 TP.HCM, một điểm cách đó vài km, và Cần Thơ cách 129km đường
  // chim bay — haversine đo đường thẳng, không phải đường bộ 170km.
  const Q3 = { lat: 10.78, lng: 106.68 };
  const GAN = { lat: 10.82, lng: 106.72 };
  const CAN_THO = { lat: 10.03, lng: 105.78 };
  // Nằm TRONG khung vuông 50km nhưng NGOÀI hình tròn 50km — thật ra cách
  // 62,3km. Điểm này tồn tại để phân biệt hai lớp lọc: khung vuông ở tầng
  // truy vấn cho nó lọt, haversine mới cắt được.
  const GOC_KHUNG = { lat: 11.18, lng: 107.08 };

  const nguon = (over = {}) => ({
    _id: new mongoose.Types.ObjectId(),
    type: 'lost', species: 'Chó', embedding: [],
    ...Q3, ...over,
  });

  it('giữ tin ở gần', async () => {
    await Pet.create(make({ breed: 'Gần', ...GAN }));
    const out = await findCandidates(nguon());
    expect(out.map((p) => p.breed)).toEqual(['Gần']);
  });

  it('LOẠI tin ở tỉnh khác', async () => {
    await Pet.create(make({ breed: 'Cần Thơ', ...CAN_THO }));
    // Đây là trường hợp đã gặp thật: mèo mất ở Quận 3 được gợi ý khớp
    // với tin nhặt được cách 129km.
    const out = await findCandidates(nguon());
    expect(out).toHaveLength(0);
  });

  it('GIỮ tin không có toạ độ, vì không có cơ sở để loại', async () => {
    await Pet.create(make({ breed: 'Không toạ độ', lat: null, lng: null }));
    // Tin cũ đăng trước khi có bản đồ đều rơi vào diện này. Loại hết là
    // xóa sổ một phần lớn kho tin.
    const out = await findCandidates(nguon());
    expect(out.map((p) => p.breed)).toEqual(['Không toạ độ']);
  });

  it('tin NGUỒN không có toạ độ thì không lọc theo khoảng cách', async () => {
    await Pet.create(make({ breed: 'Cần Thơ', ...CAN_THO }));
    const out = await findCandidates(nguon({ lat: null, lng: null }));
    expect(out.map((p) => p.breed)).toEqual(['Cần Thơ']);
  });

  it('lọc cả khi tin nguồn CHƯA có vector', async () => {
    await Pet.create(make({ breed: 'Cần Thơ', ...CAN_THO }));
    await Pet.create(make({ breed: 'Gần', ...GAN }));
    // Hai nhánh đi đường khác nhau. Lọc khác nhau thì cùng một tin lúc hiện
    // lúc không, tuỳ nó đã được nhúng hay chưa.
    const out = await findCandidates(nguon({ embedding: [] }));
    expect(out.map((p) => p.breed)).toEqual(['Gần']);
  });

  it('lọc cả khi tin nguồn ĐÃ có vector', async () => {
    await Pet.create(make({ breed: 'Cần Thơ', embedding: V.same, ...CAN_THO }));
    await Pet.create(make({ breed: 'Gần', embedding: V.far, ...GAN }));

    // Cần Thơ khớp vector HOÀN HẢO còn tin gần thì vuông góc. Nếu khoảng
    // cách không được lọc TRƯỚC khi xếp hạng thì điểm cao sẽ kéo nó lên đầu.
    const out = await findCandidates(nguon({ embedding: V.same }));
    expect(out.map((p) => p.breed)).toEqual(['Gần']);
  });

  it('LOẠI tin nằm ở góc khung vuông, ngoài bán kính thật', async () => {
    await Pet.create(make({ breed: 'Góc khung', ...GOC_KHUNG }));
    // Khung vuông ở tầng truy vấn KHÔNG loại được tin này. Chỉ có haversine
    // mới thấy nó cách 62,3km.
    expect(await findCandidates(nguon())).toHaveLength(0);
  });

  it('khung vuông có mặt trong bộ lọc truy vấn, để không kéo cả kho tin về', () => {
    // Haversine một mình đã đúng, nhưng nó chạy SAU khi database trả dữ liệu
    // về. Thiếu khung vuông thì mỗi lượt so khớp kéo 50 tin kèm vector từ khắp
    // nơi rồi mới loại — đúng, mà đắt.
    const box = candidateFilter(nguon()).$or;
    expect(box).toBeDefined();
    expect(box.some((v) => v.lat && v.lat.$gte !== undefined)).toBe(true);
  });

  it('bộ lọc truy vấn không đụng tới khoảng cách khi nguồn thiếu toạ độ', () => {
    expect(candidateFilter(nguon({ lat: null, lng: null })).$or).toBeUndefined();
    expect(candidateFilter(nguon()).$or).toBeDefined();
  });
});
