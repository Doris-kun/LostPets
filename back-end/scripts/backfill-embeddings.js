/**
 * Nhúng vector cho những tin chưa có, để chúng tìm kiếm theo nghĩa được.
 *
 *   npm run embed          chỉ nhúng tin còn thiếu vector
 *   npm run embed -- --all nhúng lại toàn bộ (dùng khi đổi model hoặc số chiều)
 *
 * Tin đăng trước khi có tính năng tìm kiếm thì chưa có vector. Tin đăng lúc
 * Gemini sập hay hết quota cũng vậy — lúc đó nhúng ngầm thất bại trong im lặng
 * và tin vẫn lưu bình thường. Chạy script này là bù lại.
 *
 * An toàn khi chạy lại nhiều lần: nó chỉ ghi thêm trường embedding, không đụng
 * tới bất kỳ nội dung nào của tin.
 */
require('dotenv').config();
// DNS của một số nhà mạng không trả về bản ghi SRV mà mongodb+srv:// cần,
// nên dùng DNS của Google như server.js đang làm.
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
const mongoose = require('mongoose');
const Pet = require('../api/models/petModel');
const { textForPet, embedDocument, DIMENSIONS, MODEL } = require('../api/lib/embedding');

// Gemini có giới hạn số lượt mỗi phút. Nhúng tuần tự và nghỉ một nhịp ngắn
// giữa các lượt, chậm hơn nhưng không bị chặn giữa chừng rồi phải chạy lại.
const PAUSE_MS = 200;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function run() {
  if (!process.env.GEMINI_API_KEY) {
    console.error('Thiếu GEMINI_API_KEY trong .env — không nhúng được.');
    process.exit(1);
  }
  if (!process.env.MONGODB_URI) {
    console.error('Thiếu MONGODB_URI trong .env.');
    process.exit(1);
  }

  const all = process.argv.includes('--all');
  await mongoose.connect(process.env.MONGODB_URI);

  const filter = all ? {} : { $or: [{ embedding: { $size: 0 } }, { embedding: { $exists: false } }] };
  const pets = await Pet.find(filter).select('+embedding');

  console.log(`Model ${MODEL}, ${DIMENSIONS} chiều`);
  console.log(`Cần nhúng: ${pets.length} tin${all ? ' (nhúng lại toàn bộ)' : ''}`);
  if (pets.length === 0) {
    await mongoose.disconnect();
    return;
  }

  let done = 0;
  let failed = 0;
  for (const pet of pets) {
    const vector = await embedDocument(textForPet(pet));
    if (vector) {
      await Pet.updateOne({ _id: pet._id }, { $set: { embedding: vector } });
      done += 1;
    } else {
      failed += 1;
      console.warn(`  bỏ qua ${pet.postId || pet._id}`);
    }
    process.stdout.write(`\r  ${done + failed}/${pets.length}`);
    await sleep(PAUSE_MS);
  }

  console.log(`\nXong: ${done} tin đã nhúng${failed ? `, ${failed} tin lỗi` : ''}`);
  if (failed) console.log('Chạy lại script để thử tiếp những tin còn lỗi.');
  await mongoose.disconnect();
}

run().catch(async (err) => {
  console.error('\nNhúng thất bại:', err.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
