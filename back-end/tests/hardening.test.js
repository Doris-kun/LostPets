const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { anhGia } = require('./anh-gia');

// Chặn hẳn đường ra Cloudinary và giữ lại thứ đã gọi để đọc.
const mockDestroy = jest.fn().mockResolvedValue({ result: 'ok' });
let uploadCount = 0;
const mockUploadStream = jest.fn((_opts, cb) => {
  uploadCount += 1;
  const id = uploadCount;
  return {
    end: () => setImmediate(() => cb(null, {
      secure_url: `https://res.cloudinary.com/demo/image/upload/v1/lost-pets/anh${id}.jpg`,
      public_id: `lost-pets/anh${id}`,
    })),
  };
});
jest.mock('cloudinary', () => ({
  v2: { config: jest.fn(), uploader: { upload_stream: mockUploadStream, destroy: mockDestroy } },
}));

const app = require('../app');
const Pet = require('../api/models/petModel');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
}, 30000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(() => {
  mockDestroy.mockClear();
  mockUploadStream.mockClear();
  jest.restoreAllMocks();
});

afterEach(async () => {
  await Pet.deleteMany({});
});

const dangTin = (over = {}) => {
  const req = request(app).post('/pets')
    .field('type', over.type || 'lost')
    .field('species', 'Chó').field('breed', 'Corgi')
    .field('color', 'Nâu').field('area', 'Quận 1').field('contact', '0900 000 001');
  return over.anh === false ? req : req.attach('image', over.anh || anhGia(), {
    filename: 'a.jpg', contentType: 'image/jpeg',
  });
};

const loiTrungMa = () => {
  const err = new Error('E11000 duplicate key');
  err.code = 11000;
  err.keyPattern = { postId: 1 };
  return err;
};

describe('kiểm nội dung tệp, không tin lời khai của trình duyệt', () => {
  it('từ chối tệp không phải ảnh dù khai là image/jpeg', async () => {
    // fileFilter của multer chỉ xem được nhãn do trình duyệt gửi. Ai cũng
    // đính một tệp bất kỳ kèm nhãn 'image/jpeg' được.
    const res = await dangTin({ anh: Buffer.from('day khong phai anh, chi la chu') });

    expect(res.status).toBe(400);
    expect(mockUploadStream).not.toHaveBeenCalled();
  });

  it('nhận ảnh thật', async () => {
    expect((await dangTin()).status).toBe(201);
  });

  it('báo 400 chứ không phải 502, vì đây là lỗi của người gửi', async () => {
    const res = await dangTin({ anh: Buffer.from('khong phai anh') });

    // 502 nói "thử lại sau", mà thử lại bao nhiêu lần cũng vậy.
    expect(res.status).not.toBe(502);
    expect(res.body.message).toMatch(/JPEG|PNG|GIF|WEBP/i);
  });
});

describe('mã tin trùng thì thử lại, không làm mất tin của người dùng', () => {
  it('trùng một lần vẫn đăng được', async () => {
    const goc = Pet.create.bind(Pet);
    const spy = jest.spyOn(Pet, 'create')
      .mockImplementationOnce(() => Promise.reject(loiTrungMa()))
      .mockImplementation(goc);

    const res = await dangTin();

    // Trước đây trùng một cái là người dùng mất luôn tin vừa gõ.
    expect(res.status).toBe(201);
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('lỗi KHÁC thì không thử lại, vì thử lại cũng hỏng y vậy', async () => {
    const spy = jest.spyOn(Pet, 'create')
      .mockImplementation(() => Promise.reject(new Error('database sập')));

    await dangTin();

    expect(spy).toHaveBeenCalledTimes(1);
  });
});

describe('không bỏ lại ảnh mồ côi trên Cloudinary', () => {
  it('lưu tin hỏng thì dọn luôn ảnh vừa tải lên', async () => {
    jest.spyOn(Pet, 'create').mockImplementation(() => Promise.reject(new Error('database sập')));

    await dangTin();

    // Ảnh lên Cloudinary TRƯỚC khi lưu tin. Không dọn thì nó ở lại vĩnh viễn,
    // không bản ghi nào trỏ tới, mà đợt dọn tự động chỉ xoá ảnh gắn với tin.
    expect(mockDestroy).toHaveBeenCalledTimes(1);
    expect(mockDestroy.mock.calls[0][0]).toMatch(/^lost-pets\//);
  });

  it('lưu tin xong thì KHÔNG dọn gì cả', async () => {
    expect((await dangTin()).status).toBe(201);
    expect(mockDestroy).not.toHaveBeenCalled();
  });

  it('không có ảnh thì không gọi dọn dù lưu tin hỏng', async () => {
    jest.spyOn(Pet, 'create').mockImplementation(() => Promise.reject(new Error('database sập')));

    await dangTin({ anh: false });

    expect(mockDestroy).not.toHaveBeenCalled();
  });
});

describe('header bảo mật', () => {
  it('khai rõ không được đoán kiểu nội dung', async () => {
    const res = await request(app).get('/pets?limit=1');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  it('không quảng cáo đang chạy Express', async () => {
    const res = await request(app).get('/pets?limit=1');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('cho phép ảnh và front-end khác gốc gọi tới', async () => {
    const res = await request(app).get('/pets?limit=1');
    // Mặc định của helmet là 'same-origin', chặn nhầm chính front-end của
    // mình vì nó nằm khác gốc với API.
    expect(res.headers['cross-origin-resource-policy']).toBe('cross-origin');
  });
});
