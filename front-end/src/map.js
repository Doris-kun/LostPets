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

export const colorForPet = (pet) =>
  pet.resolved ? PIN_COLORS.resolved : PIN_COLORS[pet.type] || PIN_COLORS.lost;

export default L;
