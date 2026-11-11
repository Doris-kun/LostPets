// Tính toán theo khoảng cách, dùng chung cho tầng thông báo và tầng so khớp.
//
// Trước đây haversine nằm trong notify.js. Khi tầng so khớp cũng cần lọc theo
// khoảng cách thì chép sang là sai: hai bản chép rời nhau rồi sẽ trôi khác
// nhau, mà sai lệch kiểu đó không có test nào bắt được vì mỗi bên vẫn tự
// nhất quán với chính nó.

const EARTH_KM = 6371;
const rad = (deg) => (deg * Math.PI) / 180;

const hasCoords = (p) => Boolean(p) && Number.isFinite(p.lat) && Number.isFinite(p.lng);

function distanceKm(aLat, aLng, bLat, bLng) {
  const dLat = rad(bLat - aLat);
  const dLng = rad(bLng - aLng);
  const h = Math.sin(dLat / 2) ** 2
    + Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_KM * Math.asin(Math.sqrt(h));
}

// Khung vuông bao quanh một điểm, để thu hẹp ngay ở tầng truy vấn.
//
// MongoDB không tính được haversine nếu không có index 2dsphere, mà lat/lng ở
// đây là hai trường số rời chứ không phải GeoJSON. Lọc bằng khung vuông trước
// thì database trả về ít bản ghi hơn hẳn, rồi haversine cắt nốt mấy góc thừa.
//
// Khung vuông luôn RỘNG hơn hình tròn cùng bán kính, nên bước này không bao
// giờ loại nhầm tin nằm trong tầm.
function boxAround(lat, lng, km) {
  const dLat = km / 111;
  // Một độ kinh tuyến hẹp dần về hai cực. Không nhân cos thì ở vĩ độ cao
  // khung sẽ hẹp hơn dự tính và loại nhầm tin thật.
  const dLng = km / (111 * Math.max(Math.cos(rad(lat)), 0.01));
  return {
    lat: { $gte: lat - dLat, $lte: lat + dLat },
    lng: { $gte: lng - dLng, $lte: lng + dLng },
  };
}

module.exports = { distanceKm, boxAround, hasCoords };
