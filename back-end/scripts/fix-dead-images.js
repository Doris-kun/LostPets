/**
 * Tìm những tin có ảnh KHÔNG tải được nữa, rồi thay bằng ảnh từ host còn sống.
 *
 *   npm run fix-images            chỉ xem trước, KHÔNG ghi gì vào database
 *   npm run fix-images -- --apply ghi thật
 *
 * Vì sao cần: ảnh của dữ liệu mẫu nằm trên máy chủ của người khác, mà máy chủ
 * thì sập. cataas.com chết là cả 8 tin mèo trắng bóc cùng lúc. Giao diện đã có
 * đường lui (PetPhoto rơi về ô "chưa có ảnh"), nhưng demo mà 8/19 tin không
 * ảnh thì vẫn tiếc.
 *
 * Script này KHÔNG tin vào phỏng đoán:
 *   - gọi thử từng ảnh hiện có, chỉ đụng vào ảnh thật sự chết
 *   - gọi thử cả ảnh thay thế TRƯỚC KHI ghi, để khỏi đổi từ host chết này sang
 *     host chết khác — đúng cái bẫy đã làm hỏng dữ liệu mẫu lần đầu
 *
 * KHÔNG BAO GIỜ đụng vào ảnh trên Cloudinary. Đó là ảnh người dùng tự tải lên,
 * tức là ảnh thật của con vật thật. Nó chết thì phải báo để người ta xử lý,
 * lặng lẽ thay bằng một con mèo ngẫu nhiên trên mạng là việc khác hẳn.
 */
require('dotenv').config();
// DNS của một số nhà mạng không trả về bản ghi SRV mà mongodb+srv:// cần,
// nên dùng DNS của Google như server.js đang làm.
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
const mongoose = require('mongoose');
const Pet = require('../api/models/petModel');

const TIMEOUT_MS = 15000;
const PAUSE_MS = 300;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isCloudinary = (url) => /res\.cloudinary\.com/i.test(url || '');
const isCat = (pet) => /mèo|meo|cat/i.test(pet.species || '');

// Trả về true nếu tải được ảnh. Nhiều host chặn HEAD nên dùng GET, và huỷ
// ngay khi nhận được phần đầu — không cần tải hết vài trăm KB chỉ để biết
// ảnh còn sống.
async function imageWorks(url) {
  const stop = new AbortController();
  const timer = setTimeout(() => stop.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: stop.signal, redirect: 'follow' });
    const ok = res.ok && String(res.headers.get('content-type') || '').startsWith('image/');
    stop.abort();
    return ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

// Ảnh chó: địa chỉ đoán được nên khỏi gọi API, chỉ cần đổi số.
const dogImage = (n) => `https://placedog.net/600/400?id=${(n % 250) + 1}`;

// Ảnh mèo: phải hỏi API mới biết địa chỉ, không đoán được.
async function catImage() {
  const stop = new AbortController();
  const timer = setTimeout(() => stop.abort(), TIMEOUT_MS);
  try {
    const res = await fetch('https://api.thecatapi.com/v1/images/search', { signal: stop.signal });
    const data = await res.json();
    return (data && data[0] && data[0].url) || '';
  } catch {
    return '';
  } finally {
    clearTimeout(timer);
  }
}

async function run() {
  if (!process.env.MONGODB_URI) {
    console.error('Thiếu MONGODB_URI trong .env.');
    process.exit(1);
  }
  const apply = process.argv.includes('--apply');

  await mongoose.connect(process.env.MONGODB_URI);
  const pets = await Pet.find({ image: { $ne: '' } }).select('postId species image').lean();
  console.log(`Có ${pets.length} tin kèm ảnh. Đang gọi thử từng ảnh...\n`);

  const dead = [];
  const deadUploads = [];
  for (const pet of pets) {
    const ok = await imageWorks(pet.image);
    const host = pet.image.split('/')[2] || '?';
    console.log(`  ${ok ? 'sống ' : 'CHẾT '} ${pet.postId.padEnd(10)} ${host}`);
    if (ok) continue;
    if (isCloudinary(pet.image)) deadUploads.push(pet);
    else dead.push(pet);
  }

  if (deadUploads.length > 0) {
    console.log('\n⚠ Những tin này có ảnh người dùng TỰ TẢI LÊN nhưng tải không về.');
    console.log('  Script không đụng vào. Vào trang quản trị xem và xử lý tay:');
    deadUploads.forEach((p) => console.log(`    ${p.postId}  ${p.image}`));
  }

  if (dead.length === 0) {
    console.log('\nKhông có ảnh mẫu nào chết. Không phải làm gì.');
    await mongoose.disconnect();
    return;
  }

  console.log(`\n${dead.length} tin cần thay ảnh. Đang tìm ảnh thay thế...\n`);
  const planned = [];
  for (const [i, pet] of dead.entries()) {
    const url = isCat(pet) ? await catImage() : dogImage(i * 7 + 3);
    // Gọi thử ảnh mới. Ghi một địa chỉ chưa kiểm tra là lặp lại đúng sai lầm
    // đang đi sửa.
    if (!url || !(await imageWorks(url))) {
      console.log(`  BỎ QUA ${pet.postId} — ảnh thay thế cũng không tải được`);
    } else {
      planned.push({ pet, url });
      console.log(`  ${pet.postId.padEnd(10)} → ${url}`);
    }
    await sleep(PAUSE_MS);
  }

  if (!apply) {
    console.log(`\nMới chỉ xem trước, chưa ghi gì. Chạy lại kèm --apply để ghi ${planned.length} thay đổi.`);
    await mongoose.disconnect();
    return;
  }

  for (const { pet, url } of planned) {
    // Chỉ đặt image. Cố ý không đụng imageId: ảnh mẫu không nằm trên
    // Cloudinary nên không có public_id nào để dọn.
    await Pet.updateOne({ _id: pet._id }, { $set: { image: url } });
  }
  console.log(`\nĐã cập nhật ${planned.length} tin.`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Hỏng:', err && err.message);
  process.exit(1);
});
