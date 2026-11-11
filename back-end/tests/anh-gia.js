// Buffer giả làm ảnh, có đúng mấy byte đầu của một tệp JPEG thật.
//
// Từ khi petController kiểm định dạng bằng byte đầu file thay vì tin lời khai
// của trình duyệt, Buffer.from('gia-lam-anh') bị từ chối ngay — đúng như mong
// muốn, nhưng test thì cần một thứ vượt qua được cửa đó.
//
// FF D8 FF là chữ ký của JPEG. Phần sau là rác, vì Cloudinary đã bị giả lập
// trong test nên không ai giải mã nội dung ảnh cả.
const DAU_JPEG = [0xff, 0xd8, 0xff, 0xe0];

const anhGia = (bytes = 32) =>
  Buffer.concat([Buffer.from(DAU_JPEG), Buffer.alloc(Math.max(0, bytes - DAU_JPEG.length), 7)]);

module.exports = { anhGia, DAU_JPEG };
