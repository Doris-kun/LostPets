const axios = require('axios');
const User = require('../models/userModel');
const PushReceipt = require('../models/pushReceiptModel');

// Gửi thông báo đẩy qua dịch vụ của Expo.
//
// Gọi thẳng HTTP thay vì dùng expo-server-sdk: chỉ cần hai đường gọi, mà bớt
// được một phụ thuộc. Đổi lại phải tự làm mấy thứ SDK lo sẵn — chia lô, kiểm
// định dạng mã, và dọn mã chết — nên ba thứ đó nằm ngay dưới đây.
//
// Expo không đòi khoá xác thực cho hai đường này; mã thiết bị là đủ. Nhưng
// chính vì vậy, AI CÓ MÃ THÌ GỬI ĐƯỢC thông báo tới đúng máy đó — nên mã để
// select: false và không bao giờ trả ra API nào.

const SEND_URL = 'https://exp.host/--/api/v2/push/send';
const RECEIPTS_URL = 'https://exp.host/--/api/v2/push/getReceipts';

// Expo nhận nhiều thông báo trong một lượt gọi. 100 là mức SDK chính thức của
// họ dùng; tài liệu không nêu trần cứng cho mỗi request, nhưng có nêu trần 600
// thông báo mỗi giây cho mỗi dự án.
const CHUNK = 100;
const HTTP_TIMEOUT_MS = 15000;

// Mã Expo luôn có dạng ExponentPushToken[...]. Kiểm trước khi gửi để một mã
// rác trong database không làm hỏng cả lô.
const isExpoToken = (token) =>
  typeof token === 'string' && /^ExponentPushToken\[[^\]\s]+\]$/.test(token);

const chunk = (list, size) => {
  const out = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
};

async function postJson(url, body) {
  try {
    const res = await axios.post(url, body, {
      timeout: HTTP_TIMEOUT_MS,
      headers: { 'Content-Type': 'application/json' },
    });
    return (res.data && res.data.data) || null;
  } catch (err) {
    console.error('Expo push:', err && err.message);
    return null;
  }
}

// Gỡ một mã khỏi mọi tài khoản đang giữ nó.
//
// Không nhắm vào một người cụ thể: cùng một máy có thể từng đăng nhập bằng
// nhiều tài khoản, nên mã chết thì chết với tất cả.
async function dropToken(token) {
  await User.updateMany({ pushTokens: token }, { $pull: { pushTokens: token } });
}

/**
 * Gửi một loạt thông báo.
 *
 * messages: [{ to, title, body, data }]
 *
 * Không ném lỗi ra ngoài. Chỗ gọi là luồng đăng tin — người dùng vừa đăng
 * xong không được nhận lỗi chỉ vì dịch vụ thông báo của bên thứ ba đang hỏng.
 */
async function send(messages) {
  const valid = (messages || []).filter((m) => isExpoToken(m.to));
  if (valid.length === 0) return { sent: 0, dead: 0 };

  let sent = 0;
  let dead = 0;

  for (const lot of chunk(valid, CHUNK)) {
    const tickets = await postJson(SEND_URL, lot);
    if (!Array.isArray(tickets)) continue;

    for (let i = 0; i < tickets.length; i++) {
      const ticket = tickets[i] || {};
      const token = lot[i] && lot[i].to;

      if (ticket.status === 'ok') {
        sent += 1;
        // Lỗi thật thường KHÔNG về ngay ở đây mà về sau trong biên nhận. Giữ
        // lại mã biên nhận để đợt dọn hằng đêm đọc lại — xem checkReceipts().
        if (ticket.id && token) {
          await PushReceipt.create({ receiptId: ticket.id, token }).catch(() => {});
        }
        continue;
      }

      // Tầng một: mã đã chết ngay từ lúc gửi.
      if (ticket.details && ticket.details.error === 'DeviceNotRegistered' && token) {
        await dropToken(token);
        dead += 1;
      }
    }
  }

  return { sent, dead };
}

/**
 * Tầng hai của việc dọn mã chết: đọc biên nhận.
 *
 * Vì sao cần, dù đã bắt lỗi lúc gửi: Expo trả "ok" cho gần như mọi thông báo
 * ngay lúc nhận, rồi mới báo hỏng sau trong biên nhận. Chỉ bắt lỗi tức thì là
 * bỏ sót phần lớn mã chết, và danh sách mã phình mãi đúng như lo ngại ban đầu.
 *
 * Gọi từ đợt dọn hằng đêm chứ không hẹn giờ trong tiến trình: Render bản miễn
 * phí ngủ sau 15 phút không ai dùng, mọi setTimeout dài đều chết theo.
 */
async function checkReceipts({ limit = 1000 } = {}) {
  const pending = await PushReceipt.find().sort({ createdAt: 1 }).limit(limit).lean();
  if (pending.length === 0) return { checked: 0, dead: 0 };

  let dead = 0;
  for (const lot of chunk(pending, CHUNK)) {
    const receipts = await postJson(RECEIPTS_URL, { ids: lot.map((r) => r.receiptId) });
    if (!receipts) continue;

    for (const row of lot) {
      const receipt = receipts[row.receiptId];
      // Chưa có biên nhận thì để lại, lần dọn sau đọc tiếp.
      if (!receipt) continue;
      if (receipt.status === 'error'
        && receipt.details && receipt.details.error === 'DeviceNotRegistered') {
        await dropToken(row.token);
        dead += 1;
      }
      await PushReceipt.deleteOne({ _id: row._id });
    }
  }

  return { checked: pending.length, dead };
}

module.exports = { send, checkReceipts, isExpoToken };
