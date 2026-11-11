/**
 * Kiểm thiết lập gửi thư, nói rõ hỏng ở đâu.
 *
 * Cách dùng:
 *   node scripts/check-mail.js                    chỉ kiểm cấu hình
 *   node scripts/check-mail.js you@example.com    kiểm rồi gửi thử một thư
 *
 * Đọc biến từ back-end/.env, hoặc từ biến môi trường nếu bạn đặt sẵn.
 * KHÔNG in khoá hay mật khẩu ra màn hình.
 */
require('dotenv').config();
const nodemailer = require('nodemailer');
const axios = require('axios');
const { parseFrom } = require('../api/lib/mailer');

const H = (s) => `\n=== ${s} ===`;
const che = (v) => `có, dài ${v.length} ký tự`;

const duongDi = () => (process.env.BREVO_API_KEY ? 'HTTP API (Brevo)' : 'SMTP');

function kiemBien() {
  console.log(H('Đường gửi đang dùng'));
  console.log('  ' + duongDi());
  if (!process.env.BREVO_API_KEY) {
    console.log('  (Render chặn cổng SMTP trên gói miễn phí. Ở máy thì chạy được,');
    console.log('   nhưng muốn chạy trên Render thì phải đặt BREVO_API_KEY.)');
  }

  console.log(H('Biến môi trường'));
  let hong = false;

  if (process.env.BREVO_API_KEY) {
    console.log('  BREVO_API_KEY   ' + che(process.env.BREVO_API_KEY));
  } else {
    for (const k of ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER']) {
      const v = process.env[k];
      console.log(`  ${k.padEnd(15)} ${v || 'THIẾU'}`);
      if (!v && k !== 'SMTP_PORT') hong = true;
    }
    const pass = process.env.SMTP_PASS;
    if (!pass) {
      console.log('  SMTP_PASS       THIẾU');
      hong = true;
    } else {
      const space = /\s/.test(pass);
      const sach = pass.replace(/\s/g, '');
      console.log(`  SMTP_PASS       ${che(pass)}${space ? '  (có dấu cách — mã tự bỏ, nhưng nên sửa cho sạch)' : ''}`);
      if (sach.length !== 16 && /gmail/i.test(process.env.SMTP_HOST || '')) {
        console.log(`                  dài ${sach.length} sau khi bỏ dấu cách — mật khẩu ứng dụng Google phải đúng 16`);
      }
    }
  }

  for (const k of ['MAIL_FROM', 'APP_URL']) {
    console.log(`  ${k.padEnd(15)} ${process.env[k] || 'THIẾU'}`);
  }

  const from = parseFrom(process.env.MAIL_FROM);
  console.log(`  -> người gửi    tên "${from.name}", địa chỉ ${from.email}`);
  if (process.env.SMTP_USER && from.email !== process.env.SMTP_USER) {
    console.log('  CẢNH BÁO: địa chỉ người gửi khác SMTP_USER. Gmail luôn ghi đè về tài khoản đã đăng nhập.');
  }
  return !hong;
}

async function kiemApi(to) {
  console.log(H('Thử gọi API'));
  const from = parseFrom(process.env.MAIL_FROM);
  // Không có đường "chỉ kiểm đăng nhập" như SMTP, nên muốn biết khoá đúng hay
  // không thì phải gọi một đường đọc vô hại.
  try {
    const res = await axios.get('https://api.brevo.com/v3/account', {
      timeout: 15000,
      headers: { 'api-key': process.env.BREVO_API_KEY, accept: 'application/json' },
    });
    console.log('  KHOÁ ĐÚNG. Tài khoản:', (res.data && res.data.email) || '(không rõ)');
    const hanMuc = res.data && res.data.plan;
    if (Array.isArray(hanMuc)) {
      for (const p of hanMuc) console.log(`  hạn mức: ${p.type} — còn ${p.credits}`);
    }
  } catch (err) {
    const d = err && err.response && err.response.data;
    const code = err && err.response && err.response.status;
    // Khoá giới hạn quyền (chỉ có Transactional email) KHÔNG đọc được
    // /v3/account. Đó là cấu hình ĐÚNG, nên không được coi là hỏng — báo
    // "khoá sai" ở đây là đuổi người đi tạo lại một khoá vốn đã tốt.
    if (code === 401 || code === 403) {
      console.log('  Không đọc được thông tin tài khoản — bình thường nếu khoá');
      console.log('  bị giới hạn quyền. Kiểm bằng cách gửi thử luôn.');
      return;
    }
    console.log('  HỎNG:', (err && err.message) || '', d ? JSON.stringify(d) : '');
    console.log('\n  Khoá sai hoặc đã bị thu hồi. Tạo lại ở Brevo > SMTP & API > API Keys.');
    process.exit(1);
  }

  if (!to) return;
  console.log(H(`Gửi thử tới ${to}`));
  try {
    const res = await axios.post('https://api.brevo.com/v3/smtp/email', {
      sender: from,
      to: [{ email: to }],
      subject: 'LostPets — thư kiểm tra thiết lập',
      textContent: 'Nhận được thư này nghĩa là thiết lập gửi thư đã chạy đúng.',
    }, {
      timeout: 15000,
      headers: {
        'api-key': process.env.BREVO_API_KEY,
        'content-type': 'application/json',
        accept: 'application/json',
      },
    });
    console.log('  GỬI ĐƯỢC. Mã thư:', (res.data && res.data.messageId) || '(không rõ)');
    console.log('  Kiểm hộp thư, nhớ xem cả mục Spam.');
  } catch (err) {
    const d = err && err.response && err.response.data;
    console.log('  HỎNG:', (err && err.message) || '', d ? JSON.stringify(d) : '');
    const code = err && err.response && err.response.status;
    if (/sender/i.test(JSON.stringify(d || {}))) {
      console.log('\n  Địa chỉ người gửi chưa được xác minh ở Brevo.');
      console.log('  Vào Brevo > Senders & IP > Senders, thêm và xác minh đúng địa chỉ trong MAIL_FROM.');
    } else if (code === 401 || code === 403) {
      console.log('');
      console.log('  Khoá không có quyền gửi thư. Lúc tạo khoá phải đặt');
      console.log('  "Transactional email" = All. Để Read là đọc được nhưng không gửi được.');
    }
    process.exit(1);
  }
}

async function kiemSmtp(to) {
  const port = Number(process.env.SMTP_PORT) || 587;
  const tx = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: {
      user: process.env.SMTP_USER,
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
    const m = String((err && err.message) || '');
    console.log('  HỎNG:', m);
    if (/Username and Password not accepted|BadCredentials|535/i.test(m)) {
      console.log('\n  Tài khoản hoặc mật khẩu sai. Hay gặp nhất:');
      console.log('   - Mật khẩu ứng dụng đã bị thu hồi mà chưa cập nhật lại');
      console.log('   - Dán nhầm mật khẩu Gmail thường thay vì mật khẩu ứng dụng 16 ký tự');
    } else if (/timeout|ETIMEDOUT|ECONNREFUSED/i.test(m)) {
      console.log('\n  Không nối được tới máy chủ. Nếu đang chạy trên Render gói miễn phí');
      console.log('  thì đây là tường lửa của họ chặn cổng SMTP — đặt BREVO_API_KEY để đi đường HTTP.');
    }
    process.exit(1);
  }

  if (!to) return;
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

async function main() {
  if (!kiemBien()) {
    console.log('\nCó biến thiếu ở trên, điền rồi chạy lại.');
    process.exit(1);
  }
  const to = process.argv[2];
  if (process.env.BREVO_API_KEY) await kiemApi(to);
  else await kiemSmtp(to);
  if (!to) console.log('\nMuốn gửi thử một thư: npm run check:mail -- dia-chi@cua-ban.com');
}

main().catch((err) => { console.error(err); process.exit(1); });
