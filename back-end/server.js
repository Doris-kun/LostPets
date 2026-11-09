require('dotenv').config();
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
const mongoose = require('mongoose');
const app = require('./app');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/lost-pets';
const RETRY_DELAY_MS = 5000;

let isConnecting = false;

function connectDB() {
  if (isConnecting) return;
  isConnecting = true;
  mongoose
    .connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      // Mongoose để mặc định 100 kết nối. Atlas gói miễn phí chỉ cho 500 kết
      // nối cho cả cluster, nên mặc định đó chặn ở 5 instance — mà web này
      // chạy trên 0,1 CPU thì không bao giờ dùng hết 100 kết nối cùng lúc.
      // Ghim xuống 20 để sau này bật nhiều instance không phải sửa gì.
      maxPoolSize: 20,
      // Trả lại kết nối rỗi sau một phút. Render ngủ rồi thức liên tục, giữ
      // kết nối chết trong pool thì lượt gọi đầu sau khi thức bị chờ timeout.
      maxIdleTimeMS: 60000,
    })
    .then(() => {
      isConnecting = false;
      console.log('Connected to MongoDB');
    })
    .catch(err => {
      isConnecting = false;
      console.error('MongoDB connection error:', err.message);
      console.log(`Retrying in ${RETRY_DELAY_MS / 1000}s...`);
      setTimeout(connectDB, RETRY_DELAY_MS);
    });
}

mongoose.connection.on('disconnected', () => {
  console.warn('MongoDB disconnected. Attempting to reconnect...');
  connectDB();
});

connectDB();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
