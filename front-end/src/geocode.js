import { langStore } from './i18n';

// Tra tên khu vực từ toạ độ, để ô "khu vực" tự điền khi người dùng bấm nút vị
// trí hoặc ghim lên bản đồ.
//
// Dùng Nominatim của OpenStreetMap: miễn phí, không cần khoá, và web này đã
// dùng ảnh nền bản đồ của họ rồi nên không thêm bên thứ ba nào mới.

const URL = 'https://nominatim.openstreetmap.org/reverse';

// CÙNG lưới làm nhiễu với tầng schema ở back-end (petModel.fuzz).
//
// Toạ độ gửi đi phải được làm tròn TRƯỚC khi rời khỏi trình duyệt. Nút "dùng
// vị trí của tôi" trả về toạ độ chính xác tới từng mét; gửi nguyên như vậy ra
// dịch vụ ngoài là tự phá nguyên tắc mà cả dự án đang giữ — database còn
// không lưu bản chính xác, thì không có lý do gì để một bên thứ ba thấy nó.
//
// Lưới 500m vẫn thừa sức cho ra đúng tên quận.
const FUZZ_GRID = 0.005;
const fuzz = (n) => Number((Math.round(n / FUZZ_GRID) * FUZZ_GRID).toFixed(6));

// Ghép tên khu vực từ các mảnh Nominatim trả về.
//
// Thứ tự ưu tiên đi từ đơn vị hành chính cấp quận/huyện xuống phường, vì ô
// "khu vực" là để người khác ước lượng chỗ nào — "Quận 3, TP.HCM" hữu ích hơn
// "Phường Võ Thị Sáu", mà cũng ít lộ hơn.
function ghepTen(address = {}) {
  const quan = address.city_district || address.district || address.suburb
    || address.quarter || address.town || address.village;
  const tinh = address.city || address.state;
  return [quan, tinh].filter(Boolean).join(', ');
}

/**
 * Trả về tên khu vực, hoặc chuỗi rỗng nếu không tra được.
 *
 * KHÔNG ném lỗi. Chỗ gọi là lúc người dùng đang điền tin đăng — dịch vụ bản
 * đồ hỏng thì họ tự gõ khu vực như trước, chứ không được chặn họ đăng tin.
 */
export async function areaFromCoords(lat, lng) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return '';
  const params = new URLSearchParams({
    format: 'jsonv2',
    lat: String(fuzz(lat)),
    lon: String(fuzz(lng)),
    // zoom 14 ra mức quận/huyện. Để mặc định thì ra cả số nhà.
    zoom: '14',
    'accept-language': langStore.lang === 'en' ? 'en' : 'vi',
  });

  try {
    // fetch chứ không dùng axios chung của web: thực thể axios đó tự gắn
    // Authorization vào mọi request, mà token đăng nhập thì tuyệt đối không
    // được gửi sang máy chủ của người khác.
    const res = await fetch(`${URL}?${params}`, {
      headers: { Accept: 'application/json' },
      credentials: 'omit',
    });
    if (!res.ok) return '';
    const data = await res.json();
    return ghepTen(data && data.address);
  } catch {
    return '';
  }
}

export default { areaFromCoords };
