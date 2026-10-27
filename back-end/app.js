const express = require('express');
const cors = require('cors');
const multer = require('multer');
const petRoutes = require('./api/routes/petRoutes');
const aiRoutes = require('./api/routes/aiRoutes');
const authRoutes = require('./api/routes/authRoutes');
const adminRoutes = require('./api/routes/adminRoutes');

const app = express();

// Render đứng sau proxy. Không bật cái này thì req.ip là IP của proxy và
// giới hạn tần suất sẽ tính chung cho tất cả mọi người.
app.set('trust proxy', 1);

// Danh sách domain được phép gọi API, ngăn cách bằng dấu phẩy.
// Chưa đặt FRONTEND_URL thì mở cho mọi domain như trước — để quên biến môi trường
// lúc deploy không làm sập web, nhưng có cảnh báo trong log.
const allowedOrigins = (process.env.FRONTEND_URL || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

if (allowedOrigins.length === 0) {
  console.warn('FRONTEND_URL chưa được đặt — API đang mở cho mọi domain.');
  app.use(cors());
} else {
  app.use(
    cors({
      origin(origin, callback) {
        // Không có header Origin: curl, Postman, health check của Render.
        if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
        callback(new Error('Origin không được phép'));
      },
    })
  );
}

// Không cần quảng cáo đang chạy Express.
app.disable('x-powered-by');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/pets', petRoutes);
app.use('/ai', aiRoutes);
app.use('/auth', authRoutes);
app.use('/admin', adminRoutes);

// Trình xử lý lỗi cuối cùng. Không có nó thì Express trả trang HTML kèm cả
// dấu vết ngăn xếp và đường dẫn trên máy chủ — front-end không đọc được, mà
// người ngoài lại thấy cấu trúc thư mục.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ message: 'Ảnh quá lớn, tối đa 5MB' });
    }
    // fileFilter từ chối file không phải ảnh bằng mã này.
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ message: 'Chỉ hỗ trợ ảnh JPEG, PNG, GIF hoặc WEBP' });
    }
    return res.status(400).json({ message: 'Tệp tải lên không hợp lệ' });
  }

  // cors ném lỗi khi domain không nằm trong danh sách cho phép.
  if (err && err.message === 'Origin không được phép') {
    return res.status(403).json({ message: 'Domain này không được phép gọi API' });
  }

  console.error('Lỗi chưa xử lý:', err && err.message);
  res.status(500).json({ message: 'Server error' });
});

module.exports = app;
