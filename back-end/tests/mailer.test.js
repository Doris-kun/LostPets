// Chặn hẳn hai đường ra mạng và giữ lại thứ đã gửi để đọc.
const mockPost = jest.fn();
jest.mock('axios', () => ({ post: (...a) => mockPost(...a) }));

const mockSmtpSend = jest.fn();
jest.mock('nodemailer', () => ({
  createTransport: () => ({ sendMail: (...a) => mockSmtpSend(...a) }),
}));

const { mailerConfigured, sendMail, parseFrom } = require('../api/lib/mailer');

const SMTP = {
  SMTP_HOST: 'smtp.gmail.com',
  SMTP_PORT: '587',
  SMTP_USER: 'support@example.com',
  SMTP_PASS: 'abcd efgh ijkl mnop',
};

const xoaBien = () => {
  for (const k of ['BREVO_API_KEY', 'MAIL_FROM', ...Object.keys(SMTP)]) delete process.env[k];
};

beforeEach(() => {
  mockPost.mockReset();
  mockPost.mockResolvedValue({ data: { messageId: 'abc' } });
  mockSmtpSend.mockReset();
  mockSmtpSend.mockResolvedValue({ messageId: 'xyz' });
  xoaBien();
});

afterAll(xoaBien);

const thu = { to: 'ai-do@example.com', subject: 'Chào', text: 'Nội dung' };

describe('tách tên người gửi', () => {
  it('tách được dạng "Tên <địa chỉ>"', () => {
    expect(parseFrom('LostPets <no-reply@abc.com>'))
      .toEqual({ name: 'LostPets', email: 'no-reply@abc.com' });
  });

  it('tách được khi tên có dấu nháy', () => {
    expect(parseFrom('"LostPets" <no-reply@abc.com>'))
      .toEqual({ name: 'LostPets', email: 'no-reply@abc.com' });
  });

  it('chỉ có địa chỉ trần thì vẫn dùng được', () => {
    expect(parseFrom('no-reply@abc.com'))
      .toEqual({ name: 'LostPets', email: 'no-reply@abc.com' });
  });

  it('không khai gì thì lui về địa chỉ mặc định', () => {
    expect(parseFrom(undefined).email).toContain('@');
  });
});

describe('biết mình đã được cấu hình hay chưa', () => {
  it('chưa khai gì thì chưa cấu hình', () => {
    expect(mailerConfigured()).toBe(false);
  });

  it('chỉ có khoá API cũng là đã cấu hình', () => {
    process.env.BREVO_API_KEY = 'khoa-gia';
    expect(mailerConfigured()).toBe(true);
  });

  it('chỉ có SMTP cũng là đã cấu hình', () => {
    Object.assign(process.env, SMTP);
    expect(mailerConfigured()).toBe(true);
  });
});

describe('chọn đường gửi', () => {
  it('có khoá API thì đi đường HTTP, KHÔNG đụng SMTP', async () => {
    // Đây là cả lý do tồn tại của thay đổi này: Render chặn cổng SMTP, nên
    // trên đó bắt buộc phải đi HTTP.
    process.env.BREVO_API_KEY = 'khoa-gia';
    Object.assign(process.env, SMTP);

    expect(await sendMail(thu)).toBe(true);
    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(mockSmtpSend).not.toHaveBeenCalled();
  });

  it('không có khoá API thì lui về SMTP', async () => {
    Object.assign(process.env, SMTP);

    expect(await sendMail(thu)).toBe(true);
    expect(mockSmtpSend).toHaveBeenCalledTimes(1);
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('chưa cấu hình gì thì không gọi đường nào', async () => {
    expect(await sendMail(thu)).toBe(false);
    expect(mockPost).not.toHaveBeenCalled();
    expect(mockSmtpSend).not.toHaveBeenCalled();
  });
});

describe('nội dung gửi qua HTTP', () => {
  beforeEach(() => {
    process.env.BREVO_API_KEY = 'khoa-gia';
    process.env.MAIL_FROM = 'LostPets <support@example.com>';
  });

  it('gửi đúng người nhận, tiêu đề và nội dung', async () => {
    await sendMail(thu);
    const [, body] = mockPost.mock.calls[0];
    expect(body.to).toEqual([{ email: 'ai-do@example.com' }]);
    expect(body.subject).toBe('Chào');
    expect(body.textContent).toBe('Nội dung');
  });

  it('tách người gửi thành tên và địa chỉ rời, vì API đòi vậy', async () => {
    await sendMail(thu);
    const [, body] = mockPost.mock.calls[0];
    expect(body.sender).toEqual({ name: 'LostPets', email: 'support@example.com' });
  });

  it('gửi khoá trong header, không nhét vào thân thư', async () => {
    await sendMail(thu);
    const [, body, opts] = mockPost.mock.calls[0];
    expect(opts.headers['api-key']).toBe('khoa-gia');
    expect(JSON.stringify(body)).not.toContain('khoa-gia');
  });

  it('đặt mốc hết giờ, không để treo vô hạn', async () => {
    await sendMail(thu);
    const [, , opts] = mockPost.mock.calls[0];
    expect(opts.timeout).toBeGreaterThan(0);
  });
});

describe('hỏng thì không làm sập luồng gọi', () => {
  it('API trả lỗi thì trả về false chứ không ném', async () => {
    process.env.BREVO_API_KEY = 'khoa-gia';
    mockPost.mockRejectedValue(Object.assign(new Error('401'), {
      response: { data: { message: 'Key not found' } },
    }));

    // Chỗ gọi là luồng quên mật khẩu. Ném lỗi ra là lộ ngay email nào có
    // tài khoản, vì nhánh không có tài khoản thì không bao giờ ném.
    expect(await sendMail(thu)).toBe(false);
  });

  it('SMTP trả lỗi thì cũng chỉ trả về false', async () => {
    Object.assign(process.env, SMTP);
    mockSmtpSend.mockRejectedValue(new Error('timeout'));

    expect(await sendMail(thu)).toBe(false);
  });
});
