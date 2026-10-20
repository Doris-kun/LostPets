const mongoose = require('mongoose');
const { Schema } = mongoose;

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
  description: { type: String, default: '' },
  resolved:    { type: Boolean, default: false },
  // Băm SHA-256 của mã xác nhận. Chỉ người đăng giữ mã gốc nên chỉ họ sửa/xoá được.
  // select: false để mã băm không bao giờ lọt ra ngoài qua API.
  claimHash:   { type: String, select: false },
  date:        { type: Date, default: Date.now }
}, { collection: 'pets' });

module.exports = mongoose.model('Pet', PetSchema);
