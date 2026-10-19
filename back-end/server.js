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
    .connect(MONGODB_URI, { serverSelectionTimeoutMS: 10000 })
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
