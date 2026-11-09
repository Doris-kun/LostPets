const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../app');
const Pet = require('../api/models/petModel');

// Mã tin sai định dạng phải trả 404, không được làm sập.
//
// Đo trên web thật trước khi sửa: GET, PUT và DELETE /pets/:petId đều trả 500
// khi nhận một chuỗi không phải ObjectId. findById ném CastError, rơi xuống
// nhánh 500 và báo "Server error" — nghe như máy chủ hỏng, trong khi thật ra
// chỉ là người dùng gõ sai đường dẫn.
//
// Bất kỳ ai cũng chạm tới được: gõ /pet/abc lên thanh địa chỉ là đủ.

let mongoServer;

const BAD = ['khong-phai-id', '123', 'abc def', '%20', 'null', '../../etc/passwd'];
const VALID_BUT_MISSING = '000000000000000000000000';

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

describe('mã tin sai định dạng', () => {
  it.each(BAD)('GET /pets/%s trả 404 chứ không phải 500', async (id) => {
    const res = await request(app).get(`/pets/${encodeURIComponent(id)}`);
    expect(res.status).toBe(404);
  });

  it.each(BAD)('PUT /pets/%s trả 404 chứ không phải 500', async (id) => {
    const res = await request(app).put(`/pets/${encodeURIComponent(id)}`).send({ color: 'Xám' });
    expect(res.status).toBe(404);
  });

  it.each(BAD)('DELETE /pets/%s trả 404 chứ không phải 500', async (id) => {
    const res = await request(app).delete(`/pets/${encodeURIComponent(id)}`);
    expect(res.status).toBe(404);
  });
});

describe('mã đúng định dạng nhưng không có tin', () => {
  it('vẫn là 404, không nhầm thành 500', async () => {
    expect((await request(app).get(`/pets/${VALID_BUT_MISSING}`)).status).toBe(404);
  });
});

describe('tin có thật vẫn đọc được bình thường', () => {
  it('chốt chặn không chặn nhầm người ngay tình', async () => {
    const pet = await Pet.create({
      type: 'lost', species: 'Chó', breed: 'Corgi', color: 'Nâu trắng',
      area: 'Quận 1', contact: '0900 000 001',
    });

    const res = await request(app).get(`/pets/${pet._id}`);
    expect(res.status).toBe(200);
    expect(res.body.breed).toBe('Corgi');
  });
});
