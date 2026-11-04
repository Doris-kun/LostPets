const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../app');
const Pet = require('../api/models/petModel');

// Hai lỗi cùng một gốc: coi chữ người dùng gõ là biểu thức chính quy.
//
// 1. Ký tự đặc biệt làm sập. Trên web thật, /pets?area=( trả về 500 vì '('
//    là biểu thức chính quy thiếu vế đóng. Gõ "Quận 1 (gần chợ)" là đủ.
//
// 2. Dấu tiếng Việt viết hai kiểu thì không khớp nhau. Unicode cho phép viết
//    "è" bằng một ký tự có sẵn dấu (NFC) hoặc "e" rồi dấu huyền rời (NFD).
//    Nhìn giống hệt nhau, khác nhau từng byte. Đo trên Render trước khi sửa:
//    species=Mèo kiểu NFC ra 9 kết quả, kiểu NFD ra 0.
//
// Bàn phím iOS hay gửi NFD, nên lỗi thứ hai không phải tình huống hiếm.

let mongoServer;

const NFC = 'Mèo'.normalize('NFC');
const NFD = 'Mèo'.normalize('NFD');

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

const seed = (over = {}) => Pet.create({
  type: 'lost',
  species: NFC,
  breed: 'Mèo ta',
  color: 'Xám',
  area: 'Quận 3, TP.HCM',
  contact: '0900 000 001',
  ...over,
});

const find = (query) => request(app).get('/pets').query(query);

describe('dấu tiếng Việt viết kiểu nào cũng tìm ra', () => {
  it('hai chuỗi này KHÁC nhau về byte dù nhìn giống hệt', () => {
    expect(NFC).not.toBe(NFD);
    expect(NFC.length).toBe(3);
    expect(NFD.length).toBe(4);
  });

  it('gõ kiểu NFD vẫn tìm ra tin lưu kiểu NFC', async () => {
    await seed();
    const res = await find({ species: NFD });
    expect(res.status).toBe(200);
    expect(res.body.pets).toHaveLength(1);
  });

  it('gõ kiểu NFC vẫn ra như cũ', async () => {
    await seed();
    expect((await find({ species: NFC })).body.pets).toHaveLength(1);
  });

  it('tin đăng bằng chữ NFD được lưu thành NFC', async () => {
    // Đây là chiều nguy hiểm hơn: tin đăng từ bàn phím iOS mà lưu nguyên NFD
    // thì nằm chết trong database, không ai tìm ra bằng chuỗi NFC.
    await seed({ species: NFD, area: 'Quận 1'.normalize('NFD') });
    const raw = await mongoose.connection.collection('pets').findOne({});
    expect(raw.species).toBe(NFC);
    expect(raw.area).toBe('Quận 1'.normalize('NFC'));
  });

  it('câu tìm kiếm tự do cũng được quy về một kiểu', async () => {
    await seed({ description: 'mèo xám đi lạc' });
    const res = await find({ q: 'mèo xám'.normalize('NFD') });
    expect(res.status).toBe(200);
  });
});

describe('ký tự đặc biệt không làm sập máy chủ', () => {
  // Trước khi sửa, ba trường hợp đầu đều trả 500.
  it.each(['(', '[', '*', '+', '?', '\\', '(((', 'Quận 1 (gần chợ)'])(
    'lọc theo khu vực %p vẫn trả 200',
    async (area) => {
      await seed();
      const res = await find({ area });
      expect(res.status).toBe(200);
    },
  );

  it('ký tự đặc biệt được hiểu là CHỮ, không phải cú pháp', async () => {
    await seed({ area: 'Quận 1 (gần chợ)' });
    await seed({ area: 'Quận 2' });

    // '(' là chữ thật trong tin thứ nhất, nên phải ra đúng một tin.
    const res = await find({ area: '(' });
    expect(res.body.pets).toHaveLength(1);
    expect(res.body.pets[0].area).toBe('Quận 1 (gần chợ)');
  });

  it('dấu chấm không còn khớp mọi ký tự', async () => {
    await seed({ area: 'TP.HCM' });
    await seed({ area: 'TPxHCM' });

    // Nếu còn coi '.' là cú pháp thì nó khớp cả hai.
    const res = await find({ area: 'TP.HCM' });
    expect(res.body.pets).toHaveLength(1);
  });
});
