const nodemailer = require('nodemailer');
const axios = require('axios');

// Gửi thư bằng một trong hai đường, tuỳ môi trường cho phép đường nào.
//
// 1. HTTP API — dùng trên Render.
//    Render CHẶN mọi kết nối ra cổng SMTP (25, 465, 587) trên web service gói
//    miễn phí, áp dụng toàn bộ khu vực từ 26/9/2025. Đo được: cùng một cấu
//    hình Gmail, gửi từ máy ở nhà thì thư tới hộp thư đến, gửi từ Render thì
//    treo tới hết giờ rồi thất bại. Không phải lỗi mã, là tường lửa.
//    Cổng 443 thì không bị chặn, nên gọi API của nhà cung cấp qua HTTPS là
//    thoát. Nâng Render lên gói trả phí cũng mở lại cổng SMTP, nhưng đường
//    này miễn phí và không phụ thuộc vào chính sách của họ.
//
// 2. SMTP — dùng khi chạy ở máy, và làm đường lui.
//    Không gắn chết vào nhà cung cấp nào: Resend, Brevo, Mailgun, SendGrid và
//    cả Gmail đều cấp thông tin SMTP.
//
// Có BREVO_API_KEY thì đi đường HTTP, không thì lui về SMTP. Nhờ vậy
// `npm run check:mail` và test ở máy vẫn chạy như cũ.
//
// Chưa khai đường nào thì mailerConfigured() trả false và endpoint quên mật
// khẩu trả 503 kèm thông báo rõ ràng, thay vì im lặng nuốt thư.

const FROM_FALLBACK = 'LostPets <no-reply@lostpets.local>';
const BREVO_URL = 'https://api.brevo.com/v3/smtp/email';
const HTTP_TIMEOUT_MS = 15000;

const apiConfigured = () => Boolean(process.env.BREVO_API_KEY);

const smtpConfigured = () =>
  Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

const mailerConfigured = () => apiConfigured() || smtpConfigured();

// Tách "LostPets <no-reply@abc.com>" thành hai phần. API đòi tên và địa chỉ
// rời nhau, trong khi SMTP nhận cả chuỗi — nên giữ một biến môi trường duy
// nhất rồi tách ở đây, thay vì bắt người cấu hình khai hai lần.
function parseFrom(raw) {
  const value = String(raw || FROM_FALLBACK).trim();
  const m = /^(.*?)\s*<([^>]+)>$/.exec(value);
  if (m) return { name: m[1].replace(/^"|"$/g, '').trim() || 'LostPets', email: m[2].trim() };
  return { name: 'LostPets', email: value };
}

let transport = null;
function getTransport() {
  if (!smtpConfigured()) return null;
  if (!transport) {
    const port = Number(process.env.SMTP_PORT) || 587;
    transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      // Cổng 465 là SSL ngay từ đầu; 587 bắt đầu ở dạng thường rồi nâng cấp
      // lên TLS. Đặt sai cờ này thì kết nối treo tới lúc hết giờ, mà thông
      // báo lỗi lại không nói gì về nguyên nhân.
      secure: port === 465,
      auth: {
        user: process.env.SMTP_USER,
        // Google hiện mật khẩu ứng dụng thành bốn cụm cho dễ đọc, người ta
        // hay dán cả dấu cách. Bỏ ở đây để khỏi phải nhớ.
        pass: String(process.env.SMTP_PASS).replace(/\s/g, ''),
      },
      // Ba mốc hết giờ. Mặc định của nodemailer là 2 phút để nối và 10 phút
      // cho socket — quá dài. Một máy chủ thư không trả lời sẽ giữ kết nối
      // treo suốt ngần ấy, mà instance miễn phí của Render chỉ có 512MB.
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 20000,
    });
  }
  return transport;
}

async function sendViaApi({ to, subject, text, html }) {
  const sender = parseFrom(process.env.MAIL_FROM);
  await axios.post(
    BREVO_URL,
    {
      sender,
      to: [{ email: to }],
      subject,
      textContent: text,
      ...(html ? { htmlContent: html } : {}),
    },
    {
      timeout: HTTP_TIMEOUT_MS,
      headers: {
        'api-key': process.env.BREVO_API_KEY,
        'content-type': 'application/json',
        accept: 'application/json',
      },
    }
  );
  return true;
}

async function sendViaSmtp({ to, subject, text, html }) {
  const tx = getTransport();
  if (!tx) return false;
  await tx.sendMail({
    from: process.env.MAIL_FROM || FROM_FALLBACK,
    to,
    subject,
    text,
    html,
  });
  return true;
}

/**
 * Gửi một thư. Trả về true nếu gửi được.
 *
 * KHÔNG ném lỗi ra ngoài. Chỗ gọi là luồng quên mật khẩu, mà luồng đó phải
 * trả về cùng một câu dù email có tồn tại hay không — ném lỗi ra là lộ ngay
 * địa chỉ nào có tài khoản.
 */
async function sendMail({ to, subject, text, html }) {
  if (!mailerConfigured()) return false;
  try {
    if (apiConfigured()) return await sendViaApi({ to, subject, text, html });
    return await sendViaSmtp({ to, subject, text, html });
  } catch (err) {
    // Lỗi từ API nằm trong response.data, lỗi SMTP nằm ở message. Gộp cả hai
    // để log nói đúng nguyên nhân dù đi đường nào.
    const chiTiet = err && err.response && err.response.data;
    console.error(
      'Không gửi được thư:',
      (err && err.message) || '',
      chiTiet ? JSON.stringify(chiTiet) : ''
    );
    return false;
  }
}

module.exports = { mailerConfigured, sendMail, parseFrom };
