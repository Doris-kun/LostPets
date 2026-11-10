const mongoose = require('mongoose');
const { Schema } = mongoose;

// Quy mọi chữ tiếng Việt về một cách biểu diễn duy nhất trước khi lưu.
//
// Unicode cho phép viết "è" bằng hai cách: một ký tự có sẵn dấu (NFC), hoặc
// chữ "e" đứng rời rồi tới dấu huyền (NFD). Hai chuỗi hiện lên màn hình
// GIỐNG HỆT NHAU nhưng khác nhau từng byte, nên so sánh chuỗi và biểu thức
// chính quy đều coi chúng là hai thứ khác nhau.
//
// Bàn phím iOS hay gửi NFD. Không chuẩn hoá thì một tin đăng từ iPhone sẽ
// nằm chết trong database: người tìm gõ "Mèo" kiểu NFC không bao giờ ra nó,
// mà nhìn bằng mắt thì không ai hiểu vì sao.
//
// Đặt ở tầng schema chứ không ở controller, cùng kiểu với `fuzz` bên dưới:
// mọi đường ghi đều đi qua đây, không phụ thuộc chỗ gọi nào nhớ gọi.
const nfc = (value) => (typeof value === 'string' ? value.normalize('NFC') : value);

// Lưới 0,005 độ ~ 550m ở vĩ độ Việt Nam.
const FUZZ_GRID = 0.005;
function fuzz(value) {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Number((Math.round(n / FUZZ_GRID) * FUZZ_GRID).toFixed(6));
}

const PetSchema = new Schema({
  postId:      { type: String, unique: true, sparse: true },
  type:        { type: String, required: true, enum: ['lost', 'found'] },
  name:        { type: String, default: '', set: nfc },
  species:     { type: String, required: true, default: 'Khác', set: nfc },
  breed:       { type: String, required: true, set: nfc },
  color:       { type: String, required: true, set: nfc },
  area:        { type: String, required: true, set: nfc },
  contact:     { type: String, required: true },
  image:       { type: String, default: '' },
  // public_id của ảnh trên Cloudinary. Lưu riêng vì đổi ảnh hay xoá tin thì phải
  // gọi API xoá bằng đúng id này — chỉ có URL thì mỗi lần đổi ảnh lại bỏ lại một
  // file rác, dùng lâu là đầy dung lượng miễn phí.
  // select: false vì đây là chi tiết nội bộ, tin công khai không cần tới.
  imageId:     { type: String, default: '', select: false },
  description: { type: String, default: '', set: nfc },
  resolved:    { type: Boolean, default: false },
  // Thời điểm tin được đánh dấu đoàn tụ. Đây là đồng hồ đếm ngược cho đợt dọn
  // tự động: tin đoàn tụ quá hạn giữ lại thì bị xoá kèm ảnh.
  // Phải là trường riêng chứ không dùng `date` được — date là ngày ĐĂNG, một
  // tin đăng từ năm ngoái mà hôm nay mới đoàn tụ thì tính theo date là xoá ngay.
  // Bỏ đánh dấu đoàn tụ thì trả về null, đồng hồ dừng lại.
  resolvedAt:  { type: Date, default: null, index: true },
  // Toạ độ nơi mất hoặc nơi nhặt được. Tuỳ chọn — ô "khu vực" dạng chữ vẫn là
  // thứ bắt buộc, bản đồ chỉ bổ sung cho ai muốn chỉ rõ hơn.
  //
  // Toạ độ được làm tròn về lưới 0,005 độ (khoảng 500m) NGAY LÚC GÁN, nên bản
  // chính xác không bao giờ nằm trong database. Thú cưng thường mất gần nhà,
  // ghim chính xác là công khai địa chỉ nhà người đăng — ghép với số điện thoại
  // ngay bên cạnh thì quá nguy hiểm.
  lat:         { type: Number, default: null, min: -90, max: 90, set: fuzz },
  lng:         { type: Number, default: null, min: -180, max: 180, set: fuzz },
  // Đặc điểm chỉ chủ nuôi biết: vết sẹo, đốm lông khuất, thói quen lạ.
  // select: false nên nó không bao giờ lọt ra ở danh sách hay tin công khai —
  // người nhận là đã tìm thấy phải tự mô tả được thì mới đáng tin.
  secretDetail: { type: String, default: '', select: false, set: nfc },
  // Tin đăng khi đã đăng nhập thì gắn với tài khoản. Khách vãng lai để trống
  // và chỉ dựa vào mã xác nhận như trước.
  owner:       { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  // Băm SHA-256 của mã xác nhận. Chỉ người đăng giữ mã gốc nên chỉ họ sửa/xoá được.
  // select: false để mã băm không bao giờ lọt ra ngoài qua API.
  claimHash:   { type: String, select: false },
  // Vector ngữ nghĩa của tin, dùng cho ô tìm kiếm. Sinh ngầm sau khi lưu nên
  // có thể rỗng một lúc, hoặc rỗng hẳn nếu Gemini lỗi — lúc đó tin vẫn hiện
  // bình thường, chỉ là không xếp hạng theo nghĩa được.
  // select: false vì 768 con số không có việc gì phải đi theo mọi response.
  embedding:   { type: [Number], default: [], select: false },
  date:        { type: Date, default: Date.now }
}, { collection: 'pets' });

// Hai index phục vụ hai đường đi, không phải thêm cho đủ.
//
// 1. Mọi lần mở danh sách và mở bản đồ đều sắp theo `date`, vì front-end luôn
//    gửi kèm sort (xem Home.vue). Không có index này thì MongoDB phải quét cả
//    collection rồi sắp xếp trong RAM trước khi cắt lấy 9 tin — công việc tỉ
//    lệ với TỔNG số tin, dù người dùng chỉ xem một trang. Có index thì nó đi
//    dọc index theo đúng thứ tự cần và dừng sau skip+limit bản ghi.
//
//    Mấy ô lọc còn lại (species, breed, color, area) là biểu thức chính quy
//    không neo đầu chuỗi nên không index được — nhưng chúng chỉ lọc, còn chỗ
//    đắt là sắp xếp, và sắp xếp thì index này lo.
//
//    Đo bằng scripts/bench-list.js, 20.000 tin: COLLSCAN + SORT đổi thành
//    IXSCAN, trang đầu đi từ 251 lên 675 req/s (nhanh 2,7 lần, p95 117ms ->
//    36ms), trang có lọc loại + loài đi từ 166 lên 549 req/s (nhanh 3,3 lần).
//    Truy vấn có lọc giảm từ 20.000 xuống 66 bản ghi phải lấy lên.
//
//    Đã thử thêm {type, date} cho ô lọc "loại tin" và BỎ. Nó chỉ giảm 66 bản
//    ghi xuống 33 — không đáng để mọi lượt đăng tin trả phí cập nhật thêm một
//    index. Mà đo xong thì bỏ nó còn NHANH HƠN: 549 req/s so với 272 khi có
//    nó, vì planner bớt một phương án phải cân ở mỗi truy vấn.
PetSchema.index({ date: -1 });

// 2. Tầng so khớp và tầng thông báo đẩy dùng chung một hình dạng truy vấn:
//    bằng đúng type + species + resolved, rồi chặn khoảng `date`, rồi sắp theo
//    `date`. Đặt ba trường bằng-đúng lên trước, `date` xuống cuối, thì một
//    index lo cả phần lọc, phần chặn khoảng và phần sắp xếp.
//
//    Đo trên 20.000 tin: truy vấn lấy ứng viên giảm từ 497 xuống 50 bản ghi
//    phải lấy lên — đúng bằng số nó cần trả về, không lấy thừa cái nào. Chỉ
//    riêng {date} thì không đủ, vì nó phải lấy lên 497 tin rồi loại bớt.
PetSchema.index({ type: 1, species: 1, resolved: 1, date: -1 });

module.exports = mongoose.model('Pet', PetSchema);
