/**
 * Kiểm thiết lập gửi thư, nói rõ hỏng ở đâu.
 *
 * Cách dùng:
 *   node scripts/check-mail.js                    chỉ kiểm đăng nhập
 *   node scripts/check-mail.js you@example.com    kiểm rồi gửi thử một thư
 *
 * Đọc biến từ back-end/.env, hoặc từ biến môi trường nếu bạn đặt sẵn.
 * KHÔNG in mật khẩu ra màn hình, chỉ in độ dài và cảnh báo nếu có dấu cách.
 */
require('dotenv').config();
const nodemailer = require('nodemailer');

const H = (s) => `\n=== ${s} ===`;

function kiemBien() {
  const can = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'MAIL_FROM', 'APP_URL'];
  let hong = false;

  console.log(H('Biến môi trường'));
  for (const k of can) {
    const v = process.env[k];
    if (!v) {
      console.log(`  ${k.padEnd(12)} THIẾU`);
      if (k !== 'MAIL_FROM' && k !== 'APP_URL') hong = true;
      continue;
    }
    if (k === 'SMTP_PASS') {
      const space = /\s/.test(v);
      console.log(`  ${k.padEnd(12)} có, dài ${v.length} ký tự${space ? '  <-- CÓ DẤU CÁCH, phải bỏ' : ''}`);
      // Mật khẩu ứng dụng của Google luôn đúng 16 ký tự sau khi bỏ dấu cách.
      const sach = v.replace(/\s/g, '');
      if (sach.length !== 16) {
        console.log(`               (dài ${sach.length} sau khi bỏ dấu cách — mật khẩu ứng dụng Google phải đúng 16)`);
      }
      if (space) hong = true;
      continue;
    }
    console.log(`  ${k.padEnd(12)} ${v}`);
  }

  const port = Number(process.env.SMTP_PORT) || 587;
  const host = process.env.SMTP_HOST || '';
  if (/gmail/i.test(host) && port !== 587 && port !== 465) {
    console.log(`  CẢNH BÁO: Gmail dùng cổng 587 hoặc 465, đang để ${port}`);
  }
  // MAIL_FROM phải chứa đúng tài khoản đã đăng nhập, vì Gmail luôn ghi đè
  // người gửi về tài khoản đó — khai lệch thì thư hiện sai tên người gửi.
  if (process.env.MAIL_FROM && process.env.SMTP_USER
      && !process.env.MAIL_FROM.includes(process.env.SMTP_USER)) {
    console.log('  CẢNH BÁO: MAIL_FROM không chứa địa chỉ của SMTP_USER');
  }
  return !hong;
}

async function main() {
  if (!kiemBien()) {
    console.log('\nCó biến sai ở trên, sửa trước rồi chạy lại.');
    process.exit(1);
  }

  const port = Number(process.env.SMTP_PORT) || 587;
  const tx = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: {
      user: process.env.SMTP_USER,
      // Bỏ dấu cách giống cách Google hiển thị mật khẩu ứng dụng.
      pass: String(process.env.SMTP_PASS).replace(/\s/g, ''),
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
  });

  console.log(H('Thử đăng nhập vào máy chủ thư'));
  try {
    await tx.verify();
    console.log('  ĐĂNG NHẬP ĐƯỢC. Host, cổng, tài khoản và mật khẩu đều đúng.');
  } catch (err) {
    console.log('  HỎNG:', err && err.message);
    const m = String((err && err.message) || '');
    if (/Username and Password not accepted|BadCredentials|535/i.test(m)) {
      console.log('\n  Nghĩa là tài khoản hoặc mật khẩu sai. Hay gặp nhất:');
      console.log('   - Mật khẩu ứng dụng đã bị thu hồi mà chưa cập nhật lại trên Render');
      console.log('   - Dán nhầm mật khẩu Gmail thường thay vì mật khẩu ứng dụng 16 ký tự');
      console.log('   - Chưa bật xác minh 2 bước nên mật khẩu ứng dụng không còn hiệu lực');
    } else if (/timeout|ETIMEDOUT|ECONNREFUSED/i.test(m)) {
      console.log('\n  Nghĩa là không nối được tới máy chủ. Thường do sai cổng,');
      console.log('  hoặc mạng/nhà cung cấp chặn cổng đó.');
    }
    process.exit(1);
  }

  const to = process.argv[2];
  if (!to) {
    console.log('\nMuốn gửi thử một thư: node scripts/check-mail.js dia-chi@cua-ban.com');
    return;
  }

  console.log(H(`Gửi thử tới ${to}`));
  try {
    const info = await tx.sendMail({
      from: process.env.MAIL_FROM,
      to,
      subject: 'LostPets — thư kiểm tra thiết lập',
      text: 'Nhận được thư này nghĩa là thiết lập gửi thư đã chạy đúng.',
    });
    console.log('  GỬI ĐƯỢC. Mã thư:', info.messageId);
    console.log('  Kiểm hộp thư, nhớ xem cả mục Spam.');
  } catch (err) {
    console.log('  HỎNG:', err && err.message);
    process.exit(1);
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
