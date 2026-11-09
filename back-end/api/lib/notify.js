const Pet = require('../models/petModel');
const User = require('../models/userModel');
const { send } = require('./push');

// Quyết định AI được nhận thông báo khi có tin mới.
//
// Híu đề xuất lọc theo ô "khu vực". Không dùng được: đó là chữ người dùng tự
// gõ, nên "Quận 7, TP.HCM", "Q7" và "quận 7" là ba chuỗi khác nhau — người ở
// ngay cạnh nhau vẫn trượt nhau, mà "Quận 1" lại khớp nhầm "Quận 12".
//
// Dùng khoảng cách thật. Mọi tin đều đã có toạ độ, và mục 6.3 đề cương cũng
// nói tầng lọc phải xét "overlapping geographic area".

const RADIUS_KM = 10;
// Tin quá cũ thì chủ nhân phần lớn đã thôi tìm. Cùng cửa sổ với tầng so khớp.
const WINDOW_DAYS = 120;
// Trần số người nhận cho mỗi tin mới. Một tin ở quận đông người có thể khớp
// hàng trăm chủ tin; gửi hết là vừa đốt hạn mức vừa biến thông báo thành rác.
const MAX_RECIPIENTS = 50;

const EARTH_KM = 6371;
const rad = (deg) => (deg * Math.PI) / 180;

function distanceKm(aLat, aLng, bLat, bLng) {
  const dLat = rad(bLat - aLat);
  const dLng = rad(bLng - aLng);
  const h = Math.sin(dLat / 2) ** 2
    + Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_KM * Math.asin(Math.sqrt(h));
}

const hasCoords = (pet) => Number.isFinite(pet.lat) && Number.isFinite(pet.lng);

// Tiêu đề và nội dung ghép từ dữ liệu của tin, không qua model nào — cùng lý
// do với câu giải thích gợi ý so khớp: thông báo đẩy không được bịa chi tiết.
const buildMessage = (pet) => ({
  title: pet.type === 'found' ? 'Có tin nhặt được gần bạn' : 'Có tin thất lạc gần bạn',
  body: [pet.species, pet.breed, pet.color].filter(Boolean).join(' · ') + ` — ${pet.area}`,
  // App chỉ hiểu hai dạng: { screen: 'Detail', id } và { screen: 'Chat' }.
  // Sai tên màn hoặc thiếu id thì app chỉ mở lên chứ không nhảy màn.
  data: { screen: 'Detail', id: String(pet._id) },
});

/**
 * Báo cho chủ những tin NGƯỢC LOẠI đang mở ở gần, khi có tin mới.
 *
 * Không ném lỗi ra ngoài. Người vừa đăng tin xong không được nhận lỗi chỉ vì
 * dịch vụ thông báo của bên thứ ba đang hỏng.
 */
async function notifyNearby(pet) {
  try {
    if (!pet || !hasCoords(pet)) return { sent: 0 };

    const since = new Date();
    since.setDate(since.getDate() - WINDOW_DAYS);

    // Ngược loại và cùng loài, giống hệt bộ lọc của tầng so khớp: tin nhặt
    // được mới thì báo cho người đang tìm, không báo cho người cũng vừa nhặt.
    const candidates = await Pet.find({
      _id: { $ne: pet._id },
      type: pet.type === 'lost' ? 'found' : 'lost',
      species: pet.species,
      resolved: false,
      date: { $gte: since },
      owner: { $ne: null },
      lat: { $ne: null },
      lng: { $ne: null },
    }).select('owner lat lng').lean();

    const ownerIds = new Set();
    for (const other of candidates) {
      // Người vừa đăng không tự báo cho chính mình.
      if (pet.owner && String(other.owner) === String(pet.owner)) continue;
      if (distanceKm(pet.lat, pet.lng, other.lat, other.lng) > RADIUS_KM) continue;
      ownerIds.add(String(other.owner));
      if (ownerIds.size >= MAX_RECIPIENTS) break;
    }
    if (ownerIds.size === 0) return { sent: 0 };

    const owners = await User.find({ _id: { $in: [...ownerIds] } }).select('+pushTokens').lean();

    const message = buildMessage(pet);
    const messages = [];
    for (const owner of owners) {
      for (const token of owner.pushTokens || []) {
        messages.push({ to: token, ...message });
      }
    }

    return await send(messages);
  } catch (err) {
    console.error('notifyNearby:', err && err.message);
    return { sent: 0 };
  }
}

module.exports = { notifyNearby, distanceKm, RADIUS_KM, MAX_RECIPIENTS };
