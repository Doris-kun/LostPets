// Giới hạn tần suất đơn giản, đếm trong bộ nhớ.
// Đủ cho một instance như hiện tại. Nếu sau này chạy nhiều instance thì phải
// chuyển sang bộ đếm dùng chung (Redis), vì mỗi instance đang đếm riêng.
const buckets = new Map();

// Dọn các mốc đã hết hạn để Map không phình mãi.
function sweep(now) {
  for (const [key, entry] of buckets) {
    if (entry.resetAt <= now) buckets.delete(key);
  }
}

let lastSweep = 0;
const SWEEP_EVERY_MS = 60 * 1000;

// windowMs và max nhận cả số lẫn hàm. Dạng hàm để đọc biến môi trường lúc có
// request thay vì lúc nạp module, nhờ vậy test đổi ngưỡng được mà không phải
// nạp lại toàn bộ ứng dụng.
const resolve = (value) => (typeof value === 'function' ? value() : value);

function rateLimit({ windowMs, max, message }) {
  return (req, res, next) => {
    const now = Date.now();
    const limit = resolve(max);
    const window = resolve(windowMs);
    if (now - lastSweep > SWEEP_EVERY_MS) {
      sweep(now);
      lastSweep = now;
    }

    // req.ip đúng là IP người dùng nhờ app.set('trust proxy') trong app.js.
    const key = `${req.baseUrl}${req.path}:${req.ip}`;
    const entry = buckets.get(key);

    if (!entry || entry.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + window });
      return next();
    }

    entry.count += 1;
    if (entry.count > limit) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      res.set('Retry-After', String(retryAfter));
      return res.status(429).json({ message });
    }

    next();
  };
};

// Bộ đếm nằm chung cho cả tiến trình, nên test phải xoá giữa các lượt,
// không thì file test này ăn ngưỡng của file test kia.
rateLimit.reset = () => buckets.clear();

module.exports = rateLimit;
