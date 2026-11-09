const nodemailer = require('nodemailer');

// Gửi thư qua SMTP, không gắn chết vào một nhà cung cấp nào.
//
// Resend, Brevo, Mailgun, SendGrid và cả Gmail đều cấp thông tin SMTP, nên
// đổi nhà cung cấp chỉ là đổi bốn biến môi trường — không sửa dòng code nào.
// Hạn mức miễn phí của các bên thay đổi liên tục, khoá cứng vào một SDK riêng
// là tự trói mình.
//
// Chưa khai biến thì mailerConfigured() trả false và endpoint quên mật khẩu
// trả 503 kèm thông báo rõ ràng, thay vì im lặng nuốt thư.

const FROM_FALLBACK = 'LostPets <no-reply@lostpets.local>';

const mailerConfigured = () =>
  Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

let transport = null;
function getTransport() {
  if (!mailerConfigured()) return null;
  if (!transport) {
    const port = Number(process.env.SMTP_PORT) || 587;
    transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      // Cổng 465 là SSL ngay từ đầu; 587 bắt đầu ở dạng thường rồi nâng cấp
      // lên TLS. Đặt sai cờ này thì kết nối treo tới lúc hết giờ, mà thông
      // báo lỗi lại không nói gì về nguyên nhân.
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return transport;
}

/**
 * Gửi một thư. Trả về true nếu gửi được.
 *
 * KHÔNG ném lỗi ra ngoài. Chỗ gọi là luồng quên mật khẩu, mà luồng đó phải
 * trả về cùng một câu dù email có tồn tại hay không — ném lỗi ra là lộ ngay
 * địa chỉ nào có tài khoản.
 */
async function sendMail({ to, subject, text, html }) {
  const tx = getTransport();
  if (!tx) return false;
  try {
    await tx.sendMail({
      from: process.env.MAIL_FROM || FROM_FALLBACK,
      to,
      subject,
      text,
      html,
    });
    return true;
  } catch (err) {
    console.error('Không gửi được thư:', err && err.message);
    return false;
  }
}

module.exports = { mailerConfigured, sendMail };
