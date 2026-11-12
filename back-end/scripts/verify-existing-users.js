/**
 * Đánh dấu đã xác minh cho những tài khoản tạo TRƯỚC khi bật bắt buộc xác minh.
 *
 *   npm run verify-existing            chỉ xem trước, KHÔNG ghi gì
 *   npm run verify-existing -- --apply ghi thật
 *
 * PHẢI chạy một lần ngay sau khi deploy bản bắt buộc xác minh email.
 *
 * Vì sao: trường emailVerified mặc định là false, nên MỌI tài khoản tạo từ
 * trước đều mang false — kể cả tài khoản quản trị. Mà từ bản này trở đi, chưa
 * xác minh thì không đăng nhập được. Không chạy script là khoá sạch toàn bộ
 * người đang dùng ra ngoài, và họ không hiểu vì sao mật khẩu đúng mà vẫn vào
 * không được.
 *
 * Việc này KHÔNG mở thêm lỗ hổng nào. Chỗ mà xác minh bịt lại là "đăng ký
 * bằng một địa chỉ mình không mở được hộp thư" — chuyện chỉ xảy ra với tài
 * khoản MỚI. Tài khoản cũ đã tồn tại dưới luật cũ và đã có sẵn vai trò của
 * nó; đánh dấu xác minh chỉ là trả lại đúng trạng thái trước khi đổi luật.
 *
 * Mốc thời gian lấy từ --before, mặc định là thời điểm chạy. Để mốc sớm hơn
 * nếu muốn chừa lại những tài khoản đăng ký sau lúc deploy.
 */
require('dotenv').config();
// DNS của một số nhà mạng không trả về bản ghi SRV mà mongodb+srv:// cần.
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
const mongoose = require('mongoose');
// Khai rõ như server.js, để log không dính cảnh báo của Mongoose.
mongoose.set('strictQuery', true);

const args = process.argv.slice(2);
const apply = args.includes('--apply');

const mocThoiGian = () => {
  const i = args.indexOf('--before');
  if (i === -1) return new Date();
  const d = new Date(args[i + 1]);
  if (Number.isNaN(d.getTime())) {
    console.error(`Mốc thời gian không đọc được: ${args[i + 1]}`);
    process.exit(1);
  }
  return d;
};

const che = (email) => String(email || '').replace(/^(.{3}).*@/, '$1***@');

async function run() {
  if (!process.env.MONGODB_URI) {
    console.error('Thiếu MONGODB_URI trong .env.');
    process.exit(1);
  }

  const truoc = mocThoiGian();
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
  const User = require('../api/models/userModel');

  const loc = {
    createdAt: { $lt: truoc },
    $or: [{ emailVerified: false }, { emailVerified: { $exists: false } }],
  };

  const canSua = await User.find(loc).select('email role createdAt').sort({ createdAt: 1 }).lean();
  const tong = await User.countDocuments();

  console.log(`Tổng số tài khoản      : ${tong}`);
  console.log(`Tạo trước ${truoc.toISOString()} mà chưa xác minh: ${canSua.length}`);
  console.log();

  for (const u of canSua) {
    console.log(`  ${che(u.email).padEnd(28)} ${String(u.role || 'user').padEnd(6)} ${new Date(u.createdAt).toISOString().slice(0, 10)}`);
  }

  if (canSua.length === 0) {
    console.log('Không có gì để làm.');
  } else if (!apply) {
    console.log();
    console.log('Mới chỉ xem trước. Thêm --apply để ghi thật.');
  } else {
    const kq = await User.updateMany(loc, { $set: { emailVerified: true } });
    console.log();
    console.log(`Đã đánh dấu xác minh cho ${kq.modifiedCount} tài khoản.`);
    console.log('Vai trò quản trị được tính lại ở lần đăng nhập kế tiếp của họ.');
  }

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Lỗi:', err && err.message);
  process.exit(1);
});
