/**
 * Tạo dữ liệu mẫu để demo.
 *
 *   npm run seed            thêm tin mẫu vào database hiện có
 *   npm run seed -- --reset xoá sạch rồi tạo lại từ đầu
 *
 * Ảnh lấy từ dịch vụ ảnh công khai (placedog.net, cataas.com) nên không tốn
 * dung lượng Cloudinary. Số điện thoại là số giả theo dạng 0900 000 0xx —
 * đây là dữ liệu mẫu trên web công khai, không dùng số thật của ai.
 */
require('dotenv').config();
// DNS của một số nhà mạng không trả về bản ghi SRV mà mongodb+srv:// cần,
// nên dùng DNS của Google như server.js đang làm.
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
const mongoose = require('mongoose');
const Pet = require('../api/models/petModel');

const dog = (id) => `https://placedog.net/600/400?id=${id}`;
const cat = (id) => `https://cataas.com/cat/${id}`;

// Lùi lại n ngày so với hôm nay.
const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
};

const generatePostId = (type) => {
  const prefix = type === 'lost' ? 'L' : 'F';
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const random = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `${prefix}-${random}`;
};

// Ngày được rải đều để bộ lọc "7 ngày" và "30 ngày" cho ra kết quả khác nhau.
const pets = [
  {
    type: 'lost', name: 'Mun', species: 'Chó', breed: 'Corgi', color: 'Nâu trắng',
    area: 'Quận 1, TP.HCM', contact: '0900 000 001', image: dog(11),
    description: 'Chó nhỏ chân ngắn, đeo vòng cổ đỏ có chuông. Mất chiều tối gần công viên Tao Đàn.',
    date: daysAgo(1),
  },
  {
    // Cặp khớp có chủ ý với tin "Mun" ở trên: cùng con chó, khác khu vực, sau 1 ngày.
    // Có cặp này thì tính năng gợi ý ghép tin mới có cái để tìm ra.
    type: 'found', name: '', species: 'Chó', breed: 'Corgi', color: 'Nâu trắng',
    area: 'Quận 3, TP.HCM', contact: '0900 000 019', image: dog(11),
    description: 'Nhặt được chó chân ngắn, lông nâu trắng, có đeo vòng cổ đỏ. Đang giữ tại nhà.',
    date: daysAgo(0),
  },
  {
    type: 'lost', name: 'Kem', species: 'Mèo', breed: 'Mèo Anh lông ngắn', color: 'Xám',
    area: 'Quận 3, TP.HCM', contact: '0900 000 002', image: cat('0w0AIO9enndfLoko'),
    description: 'Mèo lông xám dày, mắt vàng, khá nhát người lạ. Sổng ra từ ban công tầng 2.',
    date: daysAgo(2),
  },
  {
    type: 'found', name: '', species: 'Chó', breed: 'Chó cỏ', color: 'Vàng',
    area: 'Gò Vấp, TP.HCM', contact: '0900 000 003', image: dog(23),
    description: 'Nhặt được ở hẻm 54 Nguyễn Văn Nghi, chó gầy, không đeo vòng cổ. Đang nuôi tạm.',
    date: daysAgo(3),
  },
  {
    type: 'lost', name: 'Bơ', species: 'Chó', breed: 'Poodle', color: 'Nâu socola',
    area: 'Bình Thạnh, TP.HCM', contact: '0900 000 004', image: dog(37),
    description: 'Poodle tiny, lông xoăn mới cắt tỉa, rất quấn người. Mất lúc đi dạo ở Thanh Đa.',
    date: daysAgo(4),
  },
  {
    type: 'found', name: '', species: 'Mèo', breed: 'Mèo tam thể', color: 'Tam thể',
    area: 'Cầu Giấy, Hà Nội', contact: '0900 000 005', image: cat('0wKeoafTJoIbcem8'),
    description: 'Mèo tam thể cái, khoảng 1 tuổi, kêu nhiều. Thấy trong sân chung cư.',
    date: daysAgo(6),
  },
  {
    type: 'lost', name: 'Lucky', species: 'Chó', breed: 'Husky', color: 'Đen trắng',
    area: 'Thủ Đức, TP.HCM', contact: '0900 000 006', image: dog(52),
    description: 'Husky đực lớn, mắt xanh, đeo yếm xanh dương. Chạy mất khi mở cổng.',
    date: daysAgo(8),
  },
  {
    type: 'lost', name: 'Miu', species: 'Mèo', breed: 'Mèo mướp', color: 'Vện xám',
    area: 'Đống Đa, Hà Nội', contact: '0900 000 007', image: cat('0wPxI2kqnJ4DoAI8'),
    description: 'Mèo mướp vện, đuôi cụt một đoạn, có đeo vòng cổ vàng.',
    date: daysAgo(10),
  },
  {
    type: 'found', name: '', species: 'Chó', breed: 'Phú Quốc', color: 'Vện',
    area: 'Hải Châu, Đà Nẵng', contact: '0900 000 008', image: dog(68),
    description: 'Chó vện lưng xoáy, rất khôn, đi theo người đến tận nhà. Tìm chủ giúp.',
    date: daysAgo(12),
  },
  {
    type: 'lost', name: 'Nâu', species: 'Chó', breed: 'Chihuahua', color: 'Nâu đỏ',
    area: 'Quận 7, TP.HCM', contact: '0900 000 009', image: dog(74),
    description: 'Chó nhỏ chỉ khoảng 2kg, run khi gặp người lạ. Mất ở khu Phú Mỹ Hưng.',
    date: daysAgo(15),
  },
  {
    type: 'found', name: '', species: 'Mèo', breed: 'Mèo mun', color: 'Đen',
    area: 'Ninh Kiều, Cần Thơ', contact: '0900 000 010', image: cat('0XykxsO1fUAZRtPp'),
    description: 'Mèo đen tuyền, có đốm trắng ở ngực, khá dạn người.',
    date: daysAgo(18),
  },
  {
    type: 'lost', name: 'Mochi', species: 'Mèo', breed: 'Mèo Xiêm', color: 'Kem nâu',
    area: 'Quận 10, TP.HCM', contact: '0900 000 011', image: cat('0y2qESHWnriH1CyH'),
    description: 'Mèo Xiêm mắt xanh, mặt và tai sẫm màu. Rất hay kêu.',
    date: daysAgo(21),
    resolved: true,
  },
  {
    type: 'lost', name: 'Vàng', species: 'Chó', breed: 'Golden Retriever', color: 'Vàng kem',
    area: 'Tân Bình, TP.HCM', contact: '0900 000 012', image: dog(89),
    description: 'Chó lớn hiền lành, đeo vòng cổ da nâu có khắc tên. Mất gần công viên Hoàng Văn Thụ.',
    date: daysAgo(24),
  },
  {
    type: 'found', name: '', species: 'Chó', breed: 'Alaska', color: 'Xám trắng',
    area: 'Hà Đông, Hà Nội', contact: '0900 000 013', image: dog(95),
    description: 'Chó to, lông dày, có vẻ được nuôi kỹ. Đang gửi ở trạm thú y gần đó.',
    date: daysAgo(27),
  },
  {
    type: 'lost', name: 'Sữa', species: 'Mèo', breed: 'Mèo Ba Tư', color: 'Trắng',
    area: 'Phú Nhuận, TP.HCM', contact: '0900 000 014', image: cat('0ycVeWWOWgDcGsYC'),
    description: 'Mèo trắng lông dài, mặt tẹt, một mắt xanh một mắt vàng.',
    date: daysAgo(32),
    resolved: true,
  },
  {
    type: 'found', name: '', species: 'Mèo', breed: 'Mèo vàng', color: 'Vàng cam',
    area: 'Sơn Trà, Đà Nẵng', contact: '0900 000 015', image: cat('0YOo8tXUKraccqJl'),
    description: 'Mèo vàng đực, béo tròn, rất thân thiện. Lảng vảng ở quán cà phê cả tuần.',
    date: daysAgo(38),
  },
  {
    type: 'lost', name: 'Đậu', species: 'Chó', breed: 'Shiba', color: 'Vàng cam',
    area: 'Hoàn Kiếm, Hà Nội', contact: '0900 000 016', image: dog(101),
    description: 'Shiba đực, đuôi cuộn, hay cười. Mất khi đi dạo quanh hồ.',
    date: daysAgo(45),
  },
  {
    type: 'found', name: '', species: 'Chó', breed: 'Becgie', color: 'Đen vàng',
    area: 'Bình Tân, TP.HCM', contact: '0900 000 017', image: dog(118),
    description: 'Chó lớn, có đeo rọ mõm, trông đã được huấn luyện. Nhặt được ở gần KCN.',
    date: daysAgo(52),
  },
  {
    type: 'lost', name: 'Bắp', species: 'Mèo', breed: 'Mèo mướp', color: 'Vện nâu',
    area: 'Thủ Đức, TP.HCM', contact: '0900 000 018', image: cat('0ztFbDrgDV2K7yJ1'),
    description: 'Mèo mướp nâu, bụng trắng, sợ tiếng động mạnh. Mất sau đêm giao thừa.',
    date: daysAgo(61),
    resolved: true,
  },
];

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('Thiếu MONGODB_URI trong .env');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log('Đã kết nối MongoDB');

  if (process.argv.includes('--reset')) {
    const { deletedCount } = await Pet.deleteMany({});
    console.log(`Đã xoá ${deletedCount} tin cũ`);
  }

  const docs = pets.map((p) => ({ ...p, postId: generatePostId(p.type) }));
  const created = await Pet.insertMany(docs);

  const lost = created.filter((p) => p.type === 'lost').length;
  const resolved = created.filter((p) => p.resolved).length;
  console.log(`Đã tạo ${created.length} tin: ${lost} tin mất, ${created.length - lost} tin nhặt được, ${resolved} tin đã tìm thấy`);
  console.log(`Tổng số tin trong database: ${await Pet.countDocuments()}`);

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Seed thất bại:', err.message);
  process.exit(1);
});
