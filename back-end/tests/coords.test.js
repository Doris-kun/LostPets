const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const app = require('../app');
const rateLimit = require('../api/middleware/rateLimit');

let mongoServer;

beforeEach(() => rateLimit.reset());

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
}, 30000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) await collections[key].deleteMany({});
});

// Toạ độ chợ Bến Thành, dùng làm điểm mẫu.
const LAT = 10.772;
const LNG = 106.698;

const createPet = (extra = {}) => {
  const req = request(app)
    .post('/pets')
    .field('type', 'lost')
    .field('species', 'Chó')
    .field('breed', 'Corgi')
    .field('color', 'Nâu trắng')
    .field('area', 'Quận 1')
    .field('contact', '0900 000 001');
  Object.entries(extra).forEach(([k, v]) => req.field(k, String(v)));
  return req;
};

describe('Toạ độ trên bản đồ', () => {
  it('lưu được toạ độ khi đăng tin', async () => {
    const res = await createPet({ lat: LAT, lng: LNG });
    expect(res.status).toBe(201);
    expect(res.body.lat).toBeCloseTo(LAT);
    expect(res.body.lng).toBeCloseTo(LNG);
  });

  it('không có toạ độ thì để null, tin vẫn đăng được', async () => {
    const res = await createPet();
    expect(res.status).toBe(201);
    expect(res.body.lat).toBeNull();
    expect(res.body.lng).toBeNull();
  });

  it('bỏ qua toạ độ không phải số thay vì làm hỏng bản ghi', async () => {
    const res = await createPet({ lat: 'không phải số', lng: 'abc' });
    expect(res.status).toBe(201);
    expect(res.body.lat).toBeNull();
  });

  it('bỏ qua toạ độ ngoài khoảng hợp lệ', async () => {
    const res = await createPet({ lat: 999, lng: 999 });
    expect(res.status).toBe(201);
    expect(res.body.lat).toBeNull();
  });

  it('chỉ có một trong hai thì bỏ cả hai', async () => {
    const res = await createPet({ lat: LAT });
    expect(res.status).toBe(201);
    expect(res.body.lat).toBeNull();
    expect(res.body.lng).toBeNull();
  });

  it('sửa được toạ độ của tin đã đăng', async () => {
    const created = await createPet();
    const res = await request(app)
      .put(`/pets/${created.body._id}`)
      .set('x-claim-code', created.body.claimCode)
      .send({ lat: LAT, lng: LNG });

    expect(res.status).toBe(200);
    expect(res.body.lat).toBeCloseTo(LAT);
  });

  it('toạ độ rác khi sửa thì bị bỏ qua, các trường khác vẫn lưu', async () => {
    const created = await createPet({ lat: LAT, lng: LNG });
    const res = await request(app)
      .put(`/pets/${created.body._id}`)
      .set('x-claim-code', created.body.claimCode)
      .send({ lat: 'hỏng', lng: 'hỏng', color: 'Đen' });

    expect(res.status).toBe(200);
    expect(res.body.color).toBe('Đen');
    // Toạ độ cũ giữ nguyên chứ không bị ghi đè thành null.
    expect(res.body.lat).toBeCloseTo(LAT);
  });

  it('toạ độ hiện trong danh sách chung để vẽ lên bản đồ', async () => {
    await createPet({ lat: LAT, lng: LNG });
    const res = await request(app).get('/pets');
    expect(res.body.pets[0].lat).toBeCloseTo(LAT);
  });
});

describe('Xoá vị trí', () => {
  const create = () =>
    request(app)
      .post('/pets')
      .field('type', 'lost').field('species', 'Chó').field('breed', 'Corgi')
      .field('color', 'Nâu').field('area', 'Quận 1').field('contact', '0900 000 002')
      .field('lat', String(LAT)).field('lng', String(LNG));

  it('gửi null thì xoá hẳn chứ không thành toạ độ 0,0', async () => {
    const created = await create();
    const res = await request(app)
      .put(`/pets/${created.body._id}`)
      .set('x-claim-code', created.body.claimCode)
      .send({ lat: null, lng: null });

    expect(res.body.lat).toBeNull();
    expect(res.body.lng).toBeNull();
  });

  it('đăng tin không chọn vị trí, form gửi chuỗi "null" cũng ra null', async () => {
    const res = await request(app)
      .post('/pets')
      .field('type', 'lost').field('species', 'Chó').field('breed', 'Corgi')
      .field('color', 'Nâu').field('area', 'Quận 1').field('contact', '0900 000 003')
      .field('lat', 'null').field('lng', 'null');

    expect(res.status).toBe(201);
    expect(res.body.lat).toBeNull();
  });
});

describe('Làm mờ toạ độ', () => {
  const createAt = (lat, lng) =>
    request(app)
      .post('/pets')
      .field('type', 'lost').field('species', 'Chó').field('breed', 'Corgi')
      .field('color', 'Nâu').field('area', 'Quận 1').field('contact', '0900 000 004')
      .field('lat', String(lat)).field('lng', String(lng));

  it('không lưu toạ độ chính xác, làm tròn về lưới 0,005 độ', async () => {
    const res = await createAt(10.772345, 106.698765);
    expect(res.body.lat).not.toBe(10.772345);
    // Lưới 0,005 độ = 1/200, nên nhân 200 phải ra số nguyên.
    // Dùng phép nhân thay vì chia lấy dư, vì số thực dấu phẩy động
    // cho 10.77 % 0.005 ra 0.004999... chứ không phải 0.
    const onGrid = (v) => Math.abs(Math.round(v * 200) - v * 200) < 1e-6;
    expect(onGrid(res.body.lat)).toBe(true);
    expect(onGrid(res.body.lng)).toBe(true);
  });

  it('điểm sau khi làm mờ vẫn nằm trong khoảng 600m so với điểm gốc', async () => {
    const lat = 10.772345;
    const res = await createAt(lat, 106.698765);
    // 1 độ vĩ ~ 111km, nên lệch tối đa phải dưới 0,0055 độ.
    expect(Math.abs(res.body.lat - lat)).toBeLessThan(0.0055);
  });

  it('hai tin đăng ở hai điểm cách nhau vài chục mét thì trùng vị trí', async () => {
    const a = await createAt(10.77201, 106.69801);
    const b = await createAt(10.77233, 106.69842);
    expect(a.body.lat).toBe(b.body.lat);
    expect(a.body.lng).toBe(b.body.lng);
  });
});
