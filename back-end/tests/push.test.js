const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Chặn hẳn đường ra exp.host và giữ lại thứ đã gửi để đọc.
const mockPost = jest.fn();
jest.mock('axios', () => ({ post: (...args) => mockPost(...args) }));

process.env.JWT_SECRET = 'test-secret-chi-dung-trong-test';

const app = require('../app');
const User = require('../api/models/userModel');
const Pet = require('../api/models/petModel');
const PushReceipt = require('../api/models/pushReceiptModel');
const { notifyNearby, MAX_RECIPIENTS } = require('../api/lib/notify');
const { checkReceipts } = require('../api/lib/push');

let mongoServer;

const TOKEN_A = 'ExponentPushToken[aaaaaaaaaaaaaaaaaaaaaa]';
const TOKEN_B = 'ExponentPushToken[bbbbbbbbbbbbbbbbbbbbbb]';

// Quận 1 và một điểm cách đó khoảng 2km, với một điểm ở Cần Thơ cách 170km.
const Q1 = { lat: 10.78, lng: 106.70 };
const GAN = { lat: 10.79, lng: 106.71 };
const XA = { lat: 10.03, lng: 105.78 };

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
}, 30000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(() => {
  mockPost.mockReset();
  mockPost.mockResolvedValue({ data: { data: [] } });
});

afterEach(async () => {
  await User.deleteMany({});
  await Pet.deleteMany({});
  await PushReceipt.deleteMany({});
});

const makeUser = (email, tokens = []) => User.create({
  name: 'Người Dùng', email, passwordHash: 'bam-gia', pushTokens: tokens,
});

const authHeader = (user) => `Bearer ${jwt.sign({ sub: String(user._id) }, process.env.JWT_SECRET)}`;

const makePet = (over = {}) => Pet.create({
  type: 'lost', species: 'Chó', breed: 'Corgi', color: 'Nâu trắng',
  area: 'Quận 1', contact: '0900 000 001', ...Q1, ...over,
});

const tokensOf = async (user) =>
  (await User.findById(user._id).select('+pushTokens')).pushTokens;

// Danh sách thông báo đã gửi đi, moi từ lần gọi axios gần nhất.
const sentMessages = () => {
  const call = mockPost.mock.calls.find((c) => String(c[0]).includes('/push/send'));
  return call ? call[1] : [];
};

describe('lưu mã thiết bị', () => {
  it('bắt buộc đăng nhập', async () => {
    const res = await request(app).post('/auth/push-token').send({ token: TOKEN_A });
    expect(res.status).toBe(401);
  });

  it('từ chối mã sai định dạng', async () => {
    const user = await makeUser('a@example.com');
    const res = await request(app).post('/auth/push-token')
      .set('Authorization', authHeader(user))
      .send({ token: 'khong-phai-ma-expo' });
    expect(res.status).toBe(400);
  });

  it('lưu mã hợp lệ', async () => {
    const user = await makeUser('a@example.com');
    await request(app).post('/auth/push-token')
      .set('Authorization', authHeader(user)).send({ token: TOKEN_A });
    expect(await tokensOf(user)).toEqual([TOKEN_A]);
  });

  it('gửi cùng một mã nhiều lần vẫn chỉ lưu một dòng', async () => {
    const user = await makeUser('a@example.com');
    for (let i = 0; i < 3; i++) {
      await request(app).post('/auth/push-token')
        .set('Authorization', authHeader(user)).send({ token: TOKEN_A });
    }
    // Không dùng $addToSet thì người dùng nhận ba thông báo giống hệt nhau
    // cho mỗi tin mới.
    expect(await tokensOf(user)).toEqual([TOKEN_A]);
  });

  it('một người giữ được nhiều máy', async () => {
    const user = await makeUser('a@example.com');
    for (const t of [TOKEN_A, TOKEN_B]) {
      await request(app).post('/auth/push-token')
        .set('Authorization', authHeader(user)).send({ token: t });
    }
    expect(await tokensOf(user)).toHaveLength(2);
  });

  it('xoá được mã lúc đăng xuất', async () => {
    const user = await makeUser('a@example.com', [TOKEN_A, TOKEN_B]);
    await request(app).delete('/auth/push-token')
      .set('Authorization', authHeader(user)).send({ token: TOKEN_A });
    expect(await tokensOf(user)).toEqual([TOKEN_B]);
  });

  it('mã thiết bị không lọt ra API nào', async () => {
    const user = await makeUser('a@example.com', [TOKEN_A]);
    const res = await request(app).get('/auth/me').set('Authorization', authHeader(user));
    expect(JSON.stringify(res.body)).not.toContain('ExponentPushToken');
  });
});

describe('ai được nhận thông báo', () => {
  it('báo cho chủ tin NGƯỢC LOẠI ở gần', async () => {
    const owner = await makeUser('chu@example.com', [TOKEN_A]);
    await makePet({ type: 'found', owner: owner._id, ...GAN });

    const moi = await makePet({ type: 'lost' });
    await notifyNearby(moi);

    const msgs = sentMessages();
    expect(msgs).toHaveLength(1);
    expect(msgs[0].to).toBe(TOKEN_A);
    expect(msgs[0].data).toEqual({ screen: 'Detail', id: String(moi._id) });
  });

  it('KHÔNG báo cho tin cùng loại', async () => {
    const owner = await makeUser('chu@example.com', [TOKEN_A]);
    await makePet({ type: 'lost', owner: owner._id, ...GAN });

    await notifyNearby(await makePet({ type: 'lost' }));
    expect(sentMessages()).toHaveLength(0);
  });

  it('KHÔNG báo cho tin khác loài', async () => {
    const owner = await makeUser('chu@example.com', [TOKEN_A]);
    await makePet({ type: 'found', species: 'Mèo', owner: owner._id, ...GAN });

    await notifyNearby(await makePet({ type: 'lost', species: 'Chó' }));
    expect(sentMessages()).toHaveLength(0);
  });

  it('KHÔNG báo cho tin ở quá xa', async () => {
    const owner = await makeUser('chu@example.com', [TOKEN_A]);
    await makePet({ type: 'found', owner: owner._id, ...XA });

    await notifyNearby(await makePet({ type: 'lost', ...Q1 }));
    expect(sentMessages()).toHaveLength(0);
  });

  it('KHÔNG tự báo cho chính người vừa đăng', async () => {
    const owner = await makeUser('chu@example.com', [TOKEN_A]);
    await makePet({ type: 'found', owner: owner._id, ...GAN });

    await notifyNearby(await makePet({ type: 'lost', owner: owner._id }));
    expect(sentMessages()).toHaveLength(0);
  });

  it('một tin của khách vãng lai ở gần không làm mất thông báo của người khác', async () => {
    // Tin của khách không gắn tài khoản nào nên không ai nhận được gì từ nó.
    // Nhưng nếu nó lọt qua bộ lọc, cả lượt gửi vỡ vì owner null — và người
    // thật ở ngay bên cạnh cũng mất thông báo. Đó mới là thiệt hại.
    await makePet({ type: 'found', owner: null, ...GAN });
    const owner = await makeUser('chu@example.com', [TOKEN_A]);
    await makePet({ type: 'found', owner: owner._id, ...GAN });

    await notifyNearby(await makePet({ type: 'lost' }));

    const msgs = sentMessages();
    expect(msgs).toHaveLength(1);
    expect(msgs[0].to).toBe(TOKEN_A);
  });

  it('KHÔNG báo cho tin đã tìm được chủ', async () => {
    const owner = await makeUser('chu@example.com', [TOKEN_A]);
    await makePet({ type: 'found', resolved: true, owner: owner._id, ...GAN });

    await notifyNearby(await makePet({ type: 'lost' }));
    expect(sentMessages()).toHaveLength(0);
  });

  it('KHÔNG báo cho tin đã quá cũ', async () => {
    const owner = await makeUser('chu@example.com', [TOKEN_A]);
    const cu = new Date();
    cu.setDate(cu.getDate() - 200); // ngoài cửa sổ 120 ngày
    await makePet({ type: 'found', date: cu, owner: owner._id, ...GAN });

    await notifyNearby(await makePet({ type: 'lost' }));
    expect(sentMessages()).toHaveLength(0);
  });

  it('chặn trần số người nhận cho mỗi tin', async () => {
    // Một quận đông người có thể khớp hàng trăm chủ tin. Gửi hết là vừa đốt
    // hạn mức của Expo vừa biến thông báo thành rác.
    for (let i = 0; i < MAX_RECIPIENTS + 10; i++) {
      const u = await makeUser(`chu${i}@example.com`, [`ExponentPushToken[nguoi-${i}]`]);
      await makePet({ type: 'found', owner: u._id, ...GAN });
    }

    await notifyNearby(await makePet({ type: 'lost' }));
    expect(sentMessages()).toHaveLength(MAX_RECIPIENTS);
  });

  it('tin mới không có toạ độ thì không báo cho ai', async () => {
    const owner = await makeUser('chu@example.com', [TOKEN_A]);
    await makePet({ type: 'found', owner: owner._id, ...GAN });

    await notifyNearby(await makePet({ type: 'lost', lat: null, lng: null }));
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('dịch vụ của Expo hỏng thì không làm hỏng luồng đăng tin', async () => {
    mockPost.mockRejectedValue(new Error('exp.host sap'));
    const owner = await makeUser('chu@example.com', [TOKEN_A]);
    await makePet({ type: 'found', owner: owner._id, ...GAN });

    await expect(notifyNearby(await makePet({ type: 'lost' }))).resolves.toBeDefined();
  });
});

describe('dọn mã thiết bị đã chết', () => {
  it('tầng một: Expo báo DeviceNotRegistered ngay lúc gửi', async () => {
    const owner = await makeUser('chu@example.com', [TOKEN_A]);
    await makePet({ type: 'found', owner: owner._id, ...GAN });
    mockPost.mockResolvedValue({
      data: { data: [{ status: 'error', details: { error: 'DeviceNotRegistered' } }] },
    });

    await notifyNearby(await makePet({ type: 'lost' }));
    expect(await tokensOf(owner)).toEqual([]);
  });

  it('tầng hai: lỗi chỉ lộ ra trong biên nhận đọc sau', async () => {
    const owner = await makeUser('chu@example.com', [TOKEN_A]);
    await makePet({ type: 'found', owner: owner._id, ...GAN });

    // Lúc gửi Expo trả "ok" — đây là điều nó làm với gần như mọi thông báo.
    mockPost.mockResolvedValue({ data: { data: [{ status: 'ok', id: 'receipt-1' }] } });
    await notifyNearby(await makePet({ type: 'lost' }));

    expect(await tokensOf(owner)).toEqual([TOKEN_A]);
    expect(await PushReceipt.countDocuments({})).toBe(1);

    // Tới lúc đọc biên nhận mới lộ ra là máy đã gỡ app.
    mockPost.mockResolvedValue({
      data: { data: { 'receipt-1': { status: 'error', details: { error: 'DeviceNotRegistered' } } } },
    });
    const result = await checkReceipts();

    expect(result.dead).toBe(1);
    expect(await tokensOf(owner)).toEqual([]);
    expect(await PushReceipt.countDocuments({})).toBe(0);
  });

  it('biên nhận chưa có thì giữ lại, lần dọn sau đọc tiếp', async () => {
    await PushReceipt.create({ receiptId: 'chua-co', token: TOKEN_A });
    mockPost.mockResolvedValue({ data: { data: {} } });

    await checkReceipts();
    expect(await PushReceipt.countDocuments({})).toBe(1);
  });

  it('biên nhận báo ok thì xoá khỏi hàng chờ, giữ nguyên mã', async () => {
    const owner = await makeUser('chu@example.com', [TOKEN_A]);
    await PushReceipt.create({ receiptId: 'xong', token: TOKEN_A });
    mockPost.mockResolvedValue({ data: { data: { xong: { status: 'ok' } } } });

    await checkReceipts();
    expect(await PushReceipt.countDocuments({})).toBe(0);
    expect(await tokensOf(owner)).toEqual([TOKEN_A]);
  });
});
