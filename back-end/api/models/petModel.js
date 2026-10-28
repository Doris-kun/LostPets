const mongoose = require('mongoose');
const { Schema } = mongoose;

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
  name:        { type: String, default: '' },
  species:     { type: String, required: true, default: 'Khác' },
  breed:       { type: String, required: true },
  color:       { type: String, required: true },
  area:        { type: String, required: true },
  contact:     { type: String, required: true },
  image:       { type: String, default: '' },
  // public_id của ảnh trên Cloudinary. Lưu riêng vì đổi ảnh hay xoá tin thì phải
  // gọi API xoá bằng đúng id này — chỉ có URL thì mỗi lần đổi ảnh lại bỏ lại một
  // file rác, dùng lâu là đầy dung lượng miễn phí.
  // select: false vì đây là chi tiết nội bộ, tin công khai không cần tới.
  imageId:     { type: String, default: '', select: false },
  description: { type: String, default: '' },
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
  secretDetail: { type: String, default: '', select: false },
  // Tin đăng khi đã đăng nhập thì gắn với tài khoản. Khách vãng lai để trống
  // và chỉ dựa vào mã xác nhận như trước.
  owner:       { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  // Băm SHA-256 của mã xác nhận. Chỉ người đăng giữ mã gốc nên chỉ họ sửa/xoá được.
  // select: false để mã băm không bao giờ lọt ra ngoài qua API.
  claimHash:   { type: String, select: false },
  date:        { type: Date, default: Date.now }
}, { collection: 'pets' });

module.exports = mongoose.model('Pet', PetSchema);
