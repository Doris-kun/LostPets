import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { BIEN_MAU } from '../tailwind.config.js';

/*
 * Bảng màu, đọc thẳng từ tailwind.config.js.
 *
 * Pin và chấm gộp là HTML thô do mình nối chuỗi rồi đưa cho Leaflet, nên lớp
 * tiện ích của Tailwind không với tới được. Nhưng MÀU thì vẫn chung một nguồn
 * được, và đó mới là thứ đáng giữ cho khớp: trước đây chỗ này viết cứng mã
 * màu, nên đổi bảng màu xong mà bản đồ vẫn giữ màu cũ — mà không ai thấy, vì
 * phải mở đúng trang bản đồ mới lộ ra.
 *
 * App di động làm y hệt: src/map.ts nhập màu từ src/theme.ts.
 *
 * Đây là BIẾN CSS (`rgb(var(--m-x))`) chứ không phải mã màu, nên pin và chấm
 * gộp tự đổi theo chế độ sáng/tối mà không phải vẽ lại — var() chạy bình
 * thường trong style nội dòng. Chỗ duy nhất không dùng được là tuỳ chọn màu
 * của L.circle: Leaflet đặt nó lên thuộc tính SVG, mà thuộc tính SVG không
 * nhận var(). Vòng bán kính vì vậy tô bằng CSS, xem .lp-vong-ban-kinh.
 */
export const MAU = BIEN_MAU;

/*
 * Cùng một màu nhưng mờ đi, dùng cho quầng sáng quanh chấm vị trí.
 *
 * Biến vào có dạng `rgb(var(--m-primary))`, cần ra `rgb(var(--m-primary) / a)`
 * — tức là chèn alpha trước dấu đóng CUỐI CÙNG. Đừng dùng replace(')', ...):
 * nó bắt dấu đóng của var() và cho ra `rgb(var(--m-primary / a))`, sai cú pháp
 * nên trình duyệt bỏ qua cả màu, quầng sáng biến mất.
 *
 * Làm được vì biến chứa ba số kênh, nên `rgb(31 92 122 / .25)` là màu hợp lệ.
 */
const mo = (bien, alpha) => `${bien.slice(0, -1)} / ${alpha})`;

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
export function pinIcon(color = PIN_COLORS.lost) {
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

/*
 * Ba màu pin, đúng bằng ba màu nhãn trạng thái.
 *
 * "Đã đoàn tụ" dùng primary (navy) chứ không dùng xanh ngọc nữa: xanh ngọc
 * giờ là màu của tin "Tìm thấy", để nguyên thì hai trạng thái trùng màu trên
 * cùng một bản đồ.
 */
export const PIN_COLORS = {
  lost: MAU.lost,
  found: MAU.found,
  resolved: MAU.primary,
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
        font:700 ${members.length > 99 ? 12 : 14}px system-ui,sans-serif;color:${MAU["gray-900"]};">
        ${members.length}
      </div></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

/*
 * Chấm "bạn đang ở đây".
 *
 * Dùng primary, giống app di động. Trùng màu với pin "Đã đoàn tụ", nên phân
 * biệt bằng HÌNH chứ không bằng màu: chấm này nhỏ hơn và có quầng sáng rộng
 * bao quanh, pin thì không.
 */
export function meIcon() {
  return L.divIcon({
    className: 'lp-me',
    html: `<span style="
      display:block;width:14px;height:14px;border-radius:9999px;
      background:${MAU.primary};border:3px solid #fff;
      box-shadow:0 0 0 6px ${mo(MAU.primary, 0.25)};"></span>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}


// Vị trí người dùng, do bản đồ lưu lại sau khi họ bấm "vị trí của tôi".
//
// Để ở đây chứ không để riêng trong PetMap vì thẻ tin ở trang chủ cũng cần
// đọc. Hai nơi cùng gõ chuỗi 'map:me' thì sớm muộn cũng lệch nhau một chữ.
export const ME_KEY = 'map:me';

export function saveMe(point) {
  try {
    localStorage.setItem(ME_KEY, JSON.stringify(point));
  } catch {
    /* chế độ ẩn danh hoặc trình duyệt chặn lưu trữ: lần sau hỏi lại */
  }
}

export function readSavedMe() {
  try {
    const raw = JSON.parse(localStorage.getItem(ME_KEY) || 'null');
    return Array.isArray(raw) && raw.length === 2 && raw.every(Number.isFinite) ? raw : null;
  } catch {
    // Chế độ ẩn danh hoặc trình duyệt chặn lưu trữ: coi như chưa biết vị trí.
    return null;
  }
}

// Toạ độ đã bị làm tròn về lưới 500m ngay lúc lưu vào database, nên in
// "2,34 km" là nói quá độ chính xác mình thực sự có. Một chữ số thập phân,
// và luôn kèm dấu ngã để người đọc hiểu đây là con số áng chừng.
export function formatDistanceKm(km) {
  if (!Number.isFinite(km)) return '';
  if (km < 1) return `~${Math.max(100, Math.round(km * 1000 / 100) * 100)} m`;
  if (km < 10) return `~${km.toFixed(1)} km`;
  return `~${Math.round(km)} km`;
}

export default L;
