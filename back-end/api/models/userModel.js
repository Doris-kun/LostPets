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
  //
  // TUYỆT ĐỐI KHÔNG đặt `default: null` ở hai trường này.
  //
  // sparse chỉ bỏ qua tài liệu KHÔNG CÓ trường đó. Trường có mặt mà mang giá
  // trị null thì vẫn bị đánh chỉ mục như mọi giá trị khác — nên unique chỉ
  // cho phép đúng MỘT tài liệu mang null. Đặt default: null nghĩa là mọi user
  // mới đều mang null, và người thứ hai không tạo được tài khoản.
  //
  // Đã xảy ra thật: một tài khoản chiếm mất chỗ null của facebook, sau đó
  // mọi lượt đăng ký và mọi lượt đăng nhập Google tạo tài khoản mới đều nhận
  // lỗi trùng khoá 11000, front-end hiện ra thành "Không thực hiện được".
  //
  // Không có default thì trường vắng mặt khi chưa gắn, sparse hoạt động đúng
  // như tên gọi, và bao nhiêu tài khoản bỏ trống cũng được.
  google:   { type: String, unique: true, sparse: true, select: false },
  facebook: { type: String, unique: true, sparse: true, select: false },
  // Mã thiết bị để gửi thông báo đẩy. MẢNG chứ không phải một trường đơn:
  // một người có thể có cả điện thoại và máy tính bảng, lưu một trường thì
  // máy đăng nhập sau đẩy mất máy trước.
  //
  // select: false vì mã này tuy không phải mật khẩu, nhưng ai có nó thì gửi
  // được thông báo tới đúng máy đó. Không trả ra API nào.
  pushTokens:   { type: [String], default: [], select: false },

  // Đặt lại mật khẩu. Lưu BĂM của mã chứ không lưu mã, cùng lý do với mã xác
  // nhận tin: ai đọc được database cũng không đặt lại được mật khẩu người khác.
  //
  // select: false để mã băm không vô tình lọt vào phản hồi API nào.
  resetHash:    { type: String, select: false },
  resetExpires: { type: Date, select: false },
  // Quản trị viên được xác định bằng biến môi trường ADMIN_EMAILS, không phải
  // bằng cách tự sửa trong database — đổi người quản trị chỉ cần sửa cấu hình.
  role:         { type: String, enum: ['user', 'admin'], default: 'user' },
  // Số phiên bản của token. Tăng lên một là MỌI token đã phát đều hết hiệu lực.
  //
  // Không có trường này thì đổi mật khẩu không đuổi được ai ra cả: JWT đã phát
  // vẫn sống tới 7 ngày. Mà đặt lại mật khẩu chính là việc người ta làm KHI
  // nghi tài khoản bị chiếm — để nguyên thì kẻ đang ở trong vẫn ở nguyên đó.
  //
  // KHÔNG đặt select: false. Đây không phải bí mật, và publicUser đã lọc theo
  // danh sách trắng nên nó không lọt ra API nào. Để select: false thì mọi chỗ
  // gọi signToken phải nhớ chọn tay, quên một chỗ là token mang số sai.
  tokenVersion: { type: Number, default: 0 },
  // Đã chứng minh đọc được hộp thư này hay chưa.
  //
  // Không có trường này thì quyền quản trị chỉ cần BIẾT một địa chỉ email là
  // chiếm được: role gán theo ADMIN_EMAILS ngay lúc đăng ký, mà đăng ký thì
  // không ai kiểm tra bạn có mở được hộp thư đó không.
  //
  // Thành true khi: bấm đường dẫn trong thư xác minh, đăng nhập bằng Google
  // (Google đã xác minh hộ), hoặc đặt lại mật khẩu thành công (đọc được thư
  // tức là mở được hộp thư).
  emailVerified: { type: Boolean, default: false },
  verifyHash:    { type: String, select: false },
  verifyExpires: { type: Date, select: false },
  createdAt:    { type: Date, default: Date.now },
}, { collection: 'users' });

module.exports = mongoose.model('User', UserSchema);
