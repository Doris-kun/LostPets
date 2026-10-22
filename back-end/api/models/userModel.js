const mongoose = require('mongoose');
const { Schema } = mongoose;

const UserSchema = new Schema({
  name:  { type: String, required: true, trim: true },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^[^@\s]+@[^@\s]+\.[^@\s]+$/, 'Email không hợp lệ'],
  },
  // Băm bcrypt. select: false để mật khẩu không bao giờ lọt ra qua API.
  passwordHash: { type: String, required: true, select: false },
  // Quản trị viên được xác định bằng biến môi trường ADMIN_EMAILS, không phải
  // bằng cách tự sửa trong database — đổi người quản trị chỉ cần sửa cấu hình.
  role:         { type: String, enum: ['user', 'admin'], default: 'user' },
  createdAt:    { type: Date, default: Date.now },
}, { collection: 'users' });

module.exports = mongoose.model('User', UserSchema);
