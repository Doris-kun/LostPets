/*
 * Màu và khoảng cách dùng chung — lấy trực tiếp từ logo LostPets.
 *
 * React Native KHÔNG có Tailwind, không viết được className="bg-orange-500".
 * Mọi thứ khai báo bằng object JavaScript qua StyleSheet. Gom màu về một chỗ
 * để đổi một lần là cả app đổi theo, thay cho vai trò của tailwind.config.js.
 */

/*
 * Màu rút từ logo. Logo chia đôi: nửa chó màu cam, nửa mèo màu xanh ngọc —
 * trùng đúng với hai loại tin của app, nên dùng luôn cặp màu đó cho nhãn
 * "Bị mất" / "Tìm thấy". Người dùng nhìn nhãn là liên tưởng ngay tới logo.
 */
const brand = {
  orange: '#E8912E', // nửa chó
  orangeDark: '#C9741A',
  teal: '#2FA3A8', // vòng tròn + nửa mèo
  tealDark: '#1F8A8F',
  navy: '#1F5C7A', // viền mèo và chữ "LostPets"
  sky: '#70C0D0',
  cream: '#FFE9B8',
};

export const colors = {
  ...brand,

  // Màu hành động chính: nút Đăng, nút Lưu, nút tròn nổi.
  // Chọn navy vì nó đứng giữa hai nửa cam/xanh của logo, không giành màu với
  // nhãn trạng thái, và nhìn chắc chắn hơn khi đặt trên nền trắng.
  primary: brand.navy,
  primaryDark: '#164760',

  danger: '#E05252', // nút xoá

  // Nhãn trạng thái tin
  lost: brand.orange,
  found: brand.teal,
  resolved: brand.navy,

  text: '#16293A',
  textMuted: '#9AA7B2',
  textSoft: '#5B6B78',

  border: '#E3E9ED',
  borderLight: '#F1F5F7',
  background: '#FFFFFF',
  surface: '#F7FAFB',
  surfaceTint: '#EDF6F8', // nền nhạt pha xanh, dùng cho khung ảnh trống
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 18,
  full: 999,
};

// Đổ bóng phải khai báo riêng cho từng hệ: iOS dùng shadow*, Android dùng elevation.
export const shadow = {
  card: {
    shadowColor: '#1F5C7A',
    shadowOpacity: 0.07,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  float: {
    shadowColor: '#1F5C7A',
    shadowOpacity: 0.28,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 7,
  },
};

// Màu và chữ của nhãn trạng thái. Dùng ở cả màn danh sách lẫn màn chi tiết.
export function statusStyle(pet) {
  if (pet.resolved) return { color: colors.resolved, label: 'Đã đoàn tụ' };
  if (pet.type === 'lost') return { color: colors.lost, label: 'Bị mất' };
  return { color: colors.found, label: 'Tìm thấy' };
}
