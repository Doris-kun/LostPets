/**
 * Dọn giá trị null còn sót ở hai trường google và facebook của users.
 *
 *   npm run fix-providers            chỉ xem trước, KHÔNG ghi gì
 *   npm run fix-providers -- --apply ghi thật
 *
 * Vì sao cần chạy một lần:
 *
 * Chỉ mục trên hai trường này là unique + sparse. Nhiều người tưởng sparse
 * nghĩa là "bỏ qua giá trị rỗng" — không phải. Nó chỉ bỏ qua tài liệu KHÔNG
 * CÓ trường đó. Trường có mặt mà mang null thì vẫn được đánh chỉ mục như mọi
 * giá trị khác, nên unique chỉ cho phép đúng MỘT tài liệu mang null.
 *
 * Schema trước đây khai `default: null`, tức mọi user mới đều mang null. Ai
 * tạo tài khoản trước thì chiếm mất chỗ đó, và từ người thứ hai trở đi:
 *
 *   - đăng ký bằng mật khẩu  -> lỗi 11000, front-end hiện "Không thực hiện được"
 *   - đăng nhập Google/Facebook bằng email mới -> y hệt
 *
 * Tức là KHÔNG AI đăng ký mới được nữa. Schema đã bỏ `default: null`, nhưng
 * những bản ghi đã mang null từ trước thì phải dọn tay — và chỉ cần một bản
 * ghi sót lại là cửa vẫn đóng.
 *
 * Script dùng $unset chứ không gán giá trị khác: mục tiêu là làm trường VẮNG
 * MẶT, vì đó mới là thứ sparse thật sự bỏ qua.
 */
require('dotenv').config();
// DNS của một số nhà mạng không trả về bản ghi SRV mà mongodb+srv:// cần.
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
const mongoose = require('mongoose');

const FIELDS = ['google', 'facebook'];

const mask = (email) => String(email || '').replace(/^(.{3}).*@/, '$1***@');

async function run() {
  if (!process.env.MONGODB_URI) {
    console.error('Thiếu MONGODB_URI trong .env.');
    process.exit(1);
  }
  const apply = process.argv.includes('--apply');

  await mongoose.connect(process.env.MONGODB_URI);
  const users = mongoose.connection.collection('users');

  // Chỉ bắt tài liệu CÓ trường và trường mang null. Dùng $type: 'null' chứ
  // không dùng { field: null }, vì { field: null } trong MongoDB khớp cả tài
  // liệu thiếu hẳn trường đó — và những tài liệu ấy vốn đã đúng, đụng vào là
  // sửa nhầm người lành.
  const query = { $or: FIELDS.map((f) => ({ [f]: { $type: 'null' } })) };
  const dirty = await users
    .find(query, { projection: { email: 1, google: 1, facebook: 1 } })
    .toArray();

  console.log(`Tổng số user: ${await users.countDocuments({})}`);
  console.log(`Số bản ghi còn mang null: ${dirty.length}\n`);

  if (dirty.length === 0) {
    console.log('Không có gì để dọn. Cửa đăng ký đang thông.');
    await mongoose.disconnect();
    return;
  }

  for (const u of dirty) {
    const bad = FIELDS.filter((f) => u[f] === null);
    console.log(`  ${mask(u.email).padEnd(24)} sẽ bỏ trường: ${bad.join(', ')}`);
  }

  if (!apply) {
    console.log('\nMới chỉ xem trước, chưa ghi gì. Chạy lại kèm --apply để dọn thật.');
    await mongoose.disconnect();
    return;
  }

  let changed = 0;
  for (const u of dirty) {
    const unset = {};
    for (const f of FIELDS) if (u[f] === null) unset[f] = '';
    const res = await users.updateOne({ _id: u._id }, { $unset: unset });
    changed += res.modifiedCount;
  }

  const left = await users.countDocuments(query);
  console.log(`\nĐã dọn ${changed} bản ghi. Còn sót: ${left}.`);
  console.log(left === 0
    ? 'Cửa đăng ký đã thông, người mới tạo tài khoản được.'
    : 'VẪN CÒN SÓT — chạy lại hoặc xem log lỗi.');

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Hỏng:', err && err.message);
  process.exit(1);
});
