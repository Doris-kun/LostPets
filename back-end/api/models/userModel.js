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
  // Bắt buộc, TRỪ KHI tài khoản đăng nhập bằng Google hoặc Facebook — những
  // tài khoản đó không bao giờ có mật khẩu ở đây.
  passwordHash: {
    type: String,
    select: false,
    required: function () { return !this.google && !this.facebook; },
  },
  // Mã định danh phía nhà cung cấp. Phải lưu mã này chứ không chỉ dựa vào
  // email: người ta đổi được email Google của mình, đổi xong mà hệ thống chỉ
  // nhận ra nhau qua email thì họ mất luôn tài khoản và mọi tin đã đăng.
  // sparse để nhiều tài khoản cùng bỏ trống mà không đụng ràng buộc unique.
  google:   { type: String, default: null, unique: true, sparse: true, select: false },
  facebook: { type: String, default: null, unique: true, sparse: true, select: false },
  // Quản trị viên được xác định bằng biến môi trường ADMIN_EMAILS, không phải
  // bằng cách tự sửa trong database — đổi người quản trị chỉ cần sửa cấu hình.
  role:         { type: String, enum: ['user', 'admin'], default: 'user' },
  createdAt:    { type: Date, default: Date.now },
}, { collection: 'users' });

module.exports = mongoose.model('User', UserSchema);
