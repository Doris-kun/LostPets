const express = require('express');
const cors = require('cors');
const petRoutes = require('./api/routes/petRoutes');
const aiRoutes = require('./api/routes/aiRoutes');

const app = express();

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

module.exports = app;
