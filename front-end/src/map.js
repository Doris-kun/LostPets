import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Mặc định nhìn về TP.HCM, nơi phần lớn tin đăng đang tập trung.
export const DEFAULT_CENTER = [10.776, 106.7];
export const DEFAULT_ZOOM = 12;

// Server làm tròn toạ độ về lưới ~500m trước khi lưu, nên đây là độ chính xác
// thật sự của mọi điểm trên bản đồ.
export const AREA_RADIUS_M = 500;

// Mở ứng dụng bản đồ của thiết bị để chỉ đường. Dùng đường liên kết chung của
// Google Maps: không cần khoá API, trên điện thoại tự mở app.
export const directionsUrl = (lat, lng) =>
  `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

// Nền bản đồ OpenStreetMap: miễn phí, không cần đăng ký khoá.
// Bắt buộc ghi nguồn theo điều khoản sử dụng của họ.
export function addTiles(map) {
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map);
}

// Ảnh marker mặc định của Leaflet hỏng đường dẫn khi đóng gói bằng webpack.
// Tự vẽ bằng HTML nên không phụ thuộc file ảnh, và đổi màu theo loại tin được.
export function pinIcon(color = '#f97316') {
  return L.divIcon({
    className: 'lp-pin',
    html: `<span style="
      display:block;width:18px;height:18px;border-radius:9999px;
      background:${color};border:3px solid #fff;
      box-shadow:0 1px 4px rgba(0,0,0,.4);"></span>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

export const PIN_COLORS = {
  lost: '#f43f5e',
  found: '#10b981',
  resolved: '#14b8a6',
};

const colorKind = (pet) => (pet.resolved ? 'resolved' : pet.type === 'found' ? 'found' : 'lost');

export const colorForPet = (pet) => PIN_COLORS[colorKind(pet)];

// Mức thu phóng khi nhảy tới vị trí người dùng: đủ gần để thấy tên đường,
// đủ rộng để thấy vài khu phố xung quanh.
export const NEAR_ZOOM = 14;

// Bán kính "gần tôi" cho người dùng chọn. 2km là đi bộ, 5km là chạy xe vài
// phút — cũng là khoảng một con chó đi lạc có thể tới trong một ngày.
export const RADIUS_CHOICES_KM = [2, 5, 10];

// Khoảng cách giữa hai điểm trên mặt cầu, đơn vị km.
export function distanceKm(aLat, aLng, bLat, bLng) {
  const R = 6371;
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(bLat - aLat);
  const dLng = rad(bLng - aLng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Gom các điểm nằm sát nhau TRÊN MÀN HÌNH thành một nhóm.
//
// Gom theo pixel chứ không theo khoảng cách thật: hai tin cách nhau 5km chồng
// lên nhau khi nhìn cả nước, nhưng tách hẳn ra khi phóng to. Vì vậy phải gom
// lại mỗi lần đổi mức thu phóng. Lưới vuông CELL_PX đủ tốt ở quy mô vài trăm
// tin và dễ hiểu hơn nhiều so với phân cụm phân cấp.
const CELL_PX = 64;

export function clusterByScreen(map, pets, zoom) {
  const cells = new Map();
  pets.forEach((pet) => {
    const point = map.project([pet.lat, pet.lng], zoom);
    const key = `${Math.floor(point.x / CELL_PX)}:${Math.floor(point.y / CELL_PX)}`;
    if (!cells.has(key)) cells.set(key, []);
    cells.get(key).push(pet);
  });

  return [...cells.values()].map((members) => ({
    members,
    // Tâm nhóm là trung bình toạ độ các thành viên, nên chấm gộp nằm đúng giữa
    // chùm tin chứ không lệch về một góc ô lưới.
    lat: members.reduce((sum, p) => sum + p.lat, 0) / members.length,
    lng: members.reduce((sum, p) => sum + p.lng, 0) / members.length,
  }));
}

// Chấm gộp: vành ngoài chia theo tỉ lệ tin mất / tin tìm thấy, số đếm ở giữa.
// Gộp mà mất luôn thông tin loại tin thì người dùng phải phóng to mới biết
// đang nhìn gì — vành màu giữ lại được điều đó ngay ở mức thu nhỏ.
export function clusterIcon(members) {
  const size = members.length < 10 ? 36 : members.length < 50 ? 44 : 52;
  const slices = [];
  let at = 0;
  ['lost', 'found', 'resolved'].forEach((kind) => {
    const share = members.filter((p) => colorKind(p) === kind).length / members.length;
    if (share === 0) return;
    const to = at + share * 360;
    slices.push(`${PIN_COLORS[kind]} ${at}deg ${to}deg`);
    at = to;
  });

  return L.divIcon({
    className: 'lp-cluster',
    html: `<div style="
      width:${size}px;height:${size}px;border-radius:9999px;
      background:conic-gradient(${slices.join(',')});
      box-shadow:0 2px 6px rgba(0,0,0,.3);
      display:flex;align-items:center;justify-content:center;">
      <div style="
        width:${size - 10}px;height:${size - 10}px;border-radius:9999px;
        background:#fff;display:flex;align-items:center;justify-content:center;
        font:700 ${members.length > 99 ? 12 : 14}px system-ui,sans-serif;color:#111827;">
        ${members.length}
      </div></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

// Chấm "bạn đang ở đây". Màu xanh dương để không lẫn với ba màu của tin đăng.
export function meIcon() {
  return L.divIcon({
    className: 'lp-me',
    html: `<span style="
      display:block;width:14px;height:14px;border-radius:9999px;
      background:#3b82f6;border:3px solid #fff;
      box-shadow:0 0 0 6px rgba(59,130,246,.25);"></span>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}


export default L;
