const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Cloudinary thật cần API key và đi ra internet, nên thay bằng bản giả.
// upload_stream trả về public_id khác nhau từng lượt để kiểm tra được rằng ảnh
// bị xoá đúng là ảnh cũ, không phải ảnh vừa tải lên.
let uploadCount = 0;
const mockDestroy = jest.fn().mockResolvedValue({ result: 'ok' });
const mockUploadStream = jest.fn((_opts, cb) => ({
  end: () => {
    uploadCount += 1;
    cb(null, {
      secure_url: `https://res.cloudinary.com/demo/image/upload/v1/lost-pets/anh${uploadCount}.jpg`,
      public_id: `lost-pets/anh${uploadCount}`,
    });
  },
}));

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

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) await collections[key].deleteMany({});
});

beforeEach(() => {
  mockDestroy.mockClear();
  mockUploadStream.mockClear();
});

const jpeg = (name = 'a.jpg') => [
  'image',
  Buffer.from('gia-lam-anh'),
  { filename: name, contentType: 'image/jpeg' },
];

// Đăng một tin kèm ảnh, trả về body phản hồi.
const createWithPhoto = async () => {
  const res = await request(app)
    .post('/pets')
    .field('type', 'lost').field('species', 'Chó').field('breed', 'Corgi')
    .field('color', 'Nâu').field('area', 'Quận 1').field('contact', '0900 000 001')
    .attach(...jpeg());
  expect(res.status).toBe(201);
  return res.body;
};

const putPhoto = (id, code) =>
  request(app).put(`/pets/${id}`).set('x-claim-code', code);

describe('Đăng tin kèm ảnh', () => {
  it('lưu cả URL và public_id của ảnh', async () => {
    const pet = await createWithPhoto();
    const raw = await Pet.findById(pet._id).select('+imageId').lean();
    expect(raw.image).toMatch(/lost-pets\/anh\d+\.jpg$/);
    expect(raw.imageId).toMatch(/^lost-pets\/anh\d+$/);
  });

  it('không trả public_id ra ngoài, đó là chi tiết nội bộ', async () => {
    const pet = await createWithPhoto();
    expect(pet.imageId).toBeUndefined();

    const res = await request(app).get(`/pets/${pet._id}`);
    expect(res.body.imageId).toBeUndefined();
  });
});

describe('Đổi ảnh khi sửa tin', () => {
  it('thay URL ảnh bằng ảnh mới vừa tải lên', async () => {
    const pet = await createWithPhoto();
    const cu = pet.image;

    const res = await putPhoto(pet._id, pet.claimCode).attach(...jpeg('moi.jpg'));
    expect(res.status).toBe(200);
    expect(res.body.image).not.toBe(cu);
    expect(res.body.image).toMatch(/^https:\/\/res\.cloudinary\.com\//);
  });

  it('xoá ảnh cũ trên Cloudinary để không bỏ lại file rác', async () => {
    const pet = await createWithPhoto();
    const raw = await Pet.findById(pet._id).select('+imageId').lean();

    await putPhoto(pet._id, pet.claimCode).attach(...jpeg('moi.jpg'));

    expect(mockDestroy).toHaveBeenCalledWith(raw.imageId);
  });

  it('vẫn sửa được các trường khác trong cùng lượt đổi ảnh', async () => {
    const pet = await createWithPhoto();
    const res = await putPhoto(pet._id, pet.claimCode)
      .field('color', 'Đen').field('area', 'Quận 7')
      .attach(...jpeg('moi.jpg'));

    expect(res.body.color).toBe('Đen');
    expect(res.body.area).toBe('Quận 7');
    expect(res.body.image).not.toBe(pet.image);
  });

  it('sửa tin mà không đụng tới ảnh thì giữ nguyên ảnh cũ', async () => {
    const pet = await createWithPhoto();

    const res = await putPhoto(pet._id, pet.claimCode).send({ color: 'Đen' });

    expect(res.body.image).toBe(pet.image);
    expect(mockDestroy).not.toHaveBeenCalled();
  });

  it('ảnh vượt 5MB nhận 413 kèm JSON chứ không phải 500', async () => {
    const pet = await createWithPhoto();
    const res = await putPhoto(pet._id, pet.claimCode).attach('image', Buffer.alloc(6 * 1024 * 1024, 1), {
      filename: 'to.jpg',
      contentType: 'image/jpeg',
    });

    expect(res.status).toBe(413);
    expect(res.headers['content-type']).toMatch(/json/);
  });

  it('tệp không phải ảnh bị từ chối', async () => {
    const pet = await createWithPhoto();
    const res = await putPhoto(pet._id, pet.claimCode).attach('image', Buffer.from('x'), {
      filename: 'virus.exe',
      contentType: 'application/octet-stream',
    });

    expect(res.status).toBe(400);
  });

  it('sai mã xác nhận thì không đổi được ảnh', async () => {
    const pet = await createWithPhoto();
    const res = await request(app)
      .put(`/pets/${pet._id}`)
      .set('x-claim-code', 'MA-SAI')
      .attach(...jpeg('moi.jpg'));

    expect(res.status).toBe(403);
    const raw = await Pet.findById(pet._id).lean();
    expect(raw.image).toBe(pet.image);
  });
});

describe('Xoá ảnh khỏi tin', () => {
  it('removeImage làm trống ảnh và dọn file trên Cloudinary', async () => {
    const pet = await createWithPhoto();
    const raw = await Pet.findById(pet._id).select('+imageId').lean();

    const res = await putPhoto(pet._id, pet.claimCode).field('removeImage', 'true');

    expect(res.status).toBe(200);
    expect(res.body.image).toBe('');
    expect(mockDestroy).toHaveBeenCalledWith(raw.imageId);
  });

  it('nhận cả boolean khi gửi JSON', async () => {
    const pet = await createWithPhoto();
    const res = await putPhoto(pet._id, pet.claimCode).send({ removeImage: true });
    expect(res.body.image).toBe('');
  });

  it('tin vốn không có ảnh thì không gọi xoá vô ích', async () => {
    const created = await request(app)
      .post('/pets')
      .field('type', 'lost').field('species', 'Mèo').field('breed', 'Ta')
      .field('color', 'Trắng').field('area', 'Quận 3').field('contact', '0900 000 002');

    await putPhoto(created.body._id, created.body.claimCode).field('removeImage', 'true');

    expect(mockDestroy).not.toHaveBeenCalled();
  });

  it('có ảnh mới thì ưu tiên ảnh mới, bỏ qua removeImage', async () => {
    const pet = await createWithPhoto();
    const res = await putPhoto(pet._id, pet.claimCode)
      .field('removeImage', 'true')
      .attach(...jpeg('moi.jpg'));

    expect(res.body.image).toMatch(/^https:\/\/res\.cloudinary\.com\//);
    expect(res.body.image).not.toBe(pet.image);
  });
});

describe('Ảnh không đổi được bằng cách gửi URL', () => {
  it('bỏ qua trường image dạng chuỗi trong body', async () => {
    const pet = await createWithPhoto();

    const res = await putPhoto(pet._id, pet.claimCode)
      .send({ image: 'https://ke-xau.example.com/theo-doi.jpg' });

    expect(res.body.image).toBe(pet.image);
  });

  it('bỏ qua cả imageId gửi kèm, tránh dọn mất ảnh của tin khác', async () => {
    const pet = await createWithPhoto();

    await putPhoto(pet._id, pet.claimCode).send({ imageId: 'lost-pets/anh-cua-nguoi-khac' });

    const raw = await Pet.findById(pet._id).select('+imageId').lean();
    expect(raw.imageId).not.toBe('lost-pets/anh-cua-nguoi-khac');
  });
});

describe('Tin cũ chỉ có URL, chưa có public_id', () => {
  it('moi public_id từ URL ra để vẫn dọn được ảnh cũ', async () => {
    const legacy = await Pet.create({
      type: 'found', species: 'Chó', breed: 'Phốc', color: 'Đen',
      area: 'Quận 5', contact: '0900 000 003',
      image: 'https://res.cloudinary.com/demo/image/upload/v1700000000/lost-pets/cu123.jpg',
    });

    await request(app).put(`/pets/${legacy._id}`).attach(...jpeg('moi.jpg'));

    expect(mockDestroy).toHaveBeenCalledWith('lost-pets/cu123');
  });

  it('URL lạ không phải của Cloudinary thì bỏ qua, không gọi xoá bừa', async () => {
    const legacy = await Pet.create({
      type: 'found', species: 'Mèo', breed: 'Ta', color: 'Vàng',
      area: 'Quận 5', contact: '0900 000 004',
      image: 'https://example.com/anh.jpg',
    });

    await request(app).put(`/pets/${legacy._id}`).attach(...jpeg('moi.jpg'));

    expect(mockDestroy).not.toHaveBeenCalled();
  });
});

describe('Xoá tin', () => {
  it('dọn luôn ảnh của tin đó', async () => {
    const pet = await createWithPhoto();
    const raw = await Pet.findById(pet._id).select('+imageId').lean();

    await request(app).delete(`/pets/${pet._id}`).set('x-claim-code', pet.claimCode);

    expect(mockDestroy).toHaveBeenCalledWith(raw.imageId);
  });
});

describe('Cloudinary lỗi', () => {
  it('trả 502 với lời nhắn rõ ràng, không phải Server error chung chung', async () => {
    const pet = await createWithPhoto();
    mockUploadStream.mockImplementationOnce((_opts, cb) => ({
      end: () => cb(new Error('Cloudinary sap'), null),
    }));

    const res = await putPhoto(pet._id, pet.claimCode).attach(...jpeg('moi.jpg'));

    expect(res.status).toBe(502);
    expect(res.body.message).not.toBe('Server error');
  });

  it('ảnh cũ không bị xoá khi ảnh mới chưa lên được', async () => {
    const pet = await createWithPhoto();
    mockUploadStream.mockImplementationOnce((_opts, cb) => ({
      end: () => cb(new Error('Cloudinary sap'), null),
    }));

    await putPhoto(pet._id, pet.claimCode).attach(...jpeg('moi.jpg'));

    expect(mockDestroy).not.toHaveBeenCalled();
  });
});
