/*
 * Màu và khoảng cách dùng chung — lấy trực tiếp từ logo LostPets.
 *
 * React Native KHÔNG có Tailwind, không viết được className="bg-orange-500".
 * Mọi thứ khai báo bằng object JavaScript qua StyleSheet. Gom màu về một chỗ
 * để đổi một lần là cả app đổi theo, thay cho vai trò của tailwind.config.js.
 *
 * File này chỉ chứa DỮ LIỆU màu, không biết người dùng đang chọn chế độ nào.
 * Việc đó do context/theme.js lo.
 */

/*
 * Màu rút từ logo. Logo chia đôi: nửa chó màu cam, nửa mèo màu xanh ngọc —
 * trùng đúng với hai loại tin của app, nên dùng luôn cặp màu đó cho nhãn
 * "Bị mất" / "Tìm thấy". Người dùng nhìn nhãn là liên tưởng ngay tới logo.
 *
 * Bốn màu thương hiệu này GIỮ NGUYÊN ở cả hai chế độ: logo không đổi màu theo
 * nền, nên nhãn trạng thái cũng không nên đổi.
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

export const lightColors = {
  ...brand,

  // Màu hành động chính: nút Đăng, nút Lưu, nút tròn nổi.
  // Chọn navy vì nó đứng giữa hai nửa cam/xanh của logo, không giành màu với
  // nhãn trạng thái, và nhìn chắc chắn hơn khi đặt trên nền trắng.
  primary: brand.navy,
  primaryDark: '#164760',
  onPrimary: '#FFFFFF', // chữ nằm TRÊN nền primary
  // Chữ trên nhãn trạng thái. Nền nhãn là màu thương hiệu, giống nhau ở cả
  // hai chế độ, nên chữ cũng phải giống nhau — không đổi theo sáng/tối.
  onStatus: '#FFFFFF',

  danger: '#D92F2F', // nút xoá — đậm hơn bản cũ #E05252 để đạt 4.77:1

  // Nhãn trạng thái tin
  lost: brand.orange,
  found: brand.teal,
  resolved: brand.navy,

/*
 * MÀU CHỮ CỦA THƯƠNG HIỆU — mỗi chế độ một giá trị.
 *
 * Bốn màu thương hiệu ở trên GIỮ NGUYÊN cả sáng lẫn tối, vì logo không đổi
 * màu theo nền. Nhưng dùng chính chúng làm MÀU CHỮ thì hỏng: màu nào đọc rõ
 * trên nền trắng thì chìm trên nền tối, và ngược lại. Đo thật:
 *
 *   navy  (#1F5C7A) trên nền sáng 7.32:1 ✔   trên nền tối 2.41:1 ✘
 *   orange(#E8912E) trên nền tối  7.16:1 ✔   trên nền sáng 2.46:1 ✘
 *   teal  (#2FA3A8) trên nền tối  5.26:1 ✔   trên nền sáng 2.86:1 ✘
 *
 * Chuẩn WCAG đòi 4.5:1 cho chữ thường. Nên ba màu dưới đây là bản ĐÃ CHỈNH
 * ĐỘ SÁNG của màu thương hiệu — giữ nguyên sắc, chỉ đậm hoặc nhạt đi cho đủ
 * tương phản. Nhìn vẫn ra đúng màu đó, chỉ là đọc được.
 */
  brandTitle: brand.navy, // tên app ở đầu trang
  accentText: '#A86212', // cam đậm lại, 4.75:1
  tealText: '#237A7E', // xanh ngọc đậm lại, 5.05:1

  text: '#16293A',
  // Đo được 2.46:1 trên nền trắng — dưới ngưỡng 4.5:1 của chữ thường. Đậm lên
  // thành 4.96:1. "Chữ xám trên nền xám" là lỗi bị nêu đích danh trong hướng
  // dẫn giao diện, và đây đúng là nó.
  textMuted: '#617281',
  textSoft: '#5B6B78',

  border: '#E3E9ED',
  borderLight: '#F1F5F7',
  background: '#FFFFFF',
  surface: '#F7FAFB',
  surfaceTint: '#EDF6F8', // nền nhạt pha xanh, dùng cho khung ảnh trống

  // Khung "Liên hệ" ở màn chi tiết — tông ấm để tách khỏi phần còn lại
  contactBg: '#FFF7ED',
  contactBorder: '#FED7AA',

  // Cảnh báo lừa đảo: đỏ nhạt, đủ nổi để người ta dừng lại đọc
  warnBg: '#FEF2F2',
  warnBorder: '#FECACA',
  warnText: '#B91C1C',

  // Đặc điểm bí mật: vàng hổ phách, tông "chỉ mình bạn thấy"
  secretBg: '#FFFBEB',
  secretBorder: '#FDE68A',
  secretText: '#92400E',

  /*
   * Màu riêng cho các nút AI — tím, không trùng màu nào trong bộ thương hiệu.
   * Cố ý: AI là thứ máy đoán hộ, phải nhìn ra ngay là khác với hành động do
   * chính người dùng quyết định. Web cũng dùng tông tím này.
   */
  aiAccent: '#7C5CE0',
  aiBg: '#F5F3FF',
  aiBorder: '#DDD6FE',
  aiText: '#5B3FD0',

  // Lớp tối sau bảng lọc
  scrim: 'rgba(22, 41, 58, 0.45)',
};

/*
 * Bảng màu chế độ tối.
 *
 * Không dùng đen tuyệt đối (#000). Nền đen kịt với chữ trắng tương phản quá
 * gắt, đọc lâu mỏi mắt, và mất hết cảm giác chiều sâu giữa các lớp. Thay bằng
 * xanh đen pha từ chính màu navy của logo — app vẫn ra "chất" LostPets.
 *
 * Quy tắc: lớp càng NỔI LÊN TRÊN thì màu càng SÁNG.
 *   background (nền sâu nhất)  ->  surface (thẻ tin)  ->  surfaceTint (nổi nhất)
 * Ngược hẳn với chế độ sáng, nơi lớp nổi lên thì trắng hơn.
 */
export const darkColors = {
  ...brand,

  // navy gốc chìm nghỉm trên nền tối, phải sáng hơn hẳn mới nhìn ra là nút bấm
  primary: '#3D93C2',
  primaryDark: '#2E7093',
  onPrimary: '#0B1620',
  onStatus: '#FFFFFF',

  danger: '#F06B6B', // đỏ gốc bị tối, nâng sáng lên

  lost: brand.orange,
  found: brand.teal,
  resolved: brand.sky, // navy không thấy gì trên nền tối -> dùng xanh nhạt

  // Cùng vai trò với bộ bên chế độ sáng, nhưng đảo hướng: ở đây navy phải
  // sáng lên, còn cam và xanh ngọc giữ nguyên vì chúng vốn đã nổi trên nền tối.
  brandTitle: '#3D93C2', // 5.17:1, thay cho navy gốc chỉ được 2.41:1
  accentText: brand.orange, // 7.16:1
  // Nhích sáng hơn brand.teal một chút: trên lớp nổi nhất (surfaceTint) màu
  // gốc chỉ được 4.50:1, đúng sát mép ngưỡng 4.5 — nhích lên cho chắc.
  tealText: '#30A8AD', // 4.76:1

  text: '#E8EFF3',
  // Trên lớp nổi nhất (surfaceTint) chỉ đạt 4.13:1, nâng nhẹ cho đủ 4.52:1
  textMuted: '#8697A2',
  textSoft: '#B6C5CE',

  border: '#243845',
  borderLight: '#1B2B36',
  background: '#0E1A23',
  surface: '#16242F',
  surfaceTint: '#1C303D',

  contactBg: '#2A2017',
  contactBorder: '#6B4A1E',

  warnBg: '#2A1618',
  warnBorder: '#6B2A2E',
  warnText: '#F8A5A5',

  secretBg: '#2A2413',
  secretBorder: '#6B5A1E',
  secretText: '#F0C97A',

  // Tím sáng hơn bản ngày, nền tím than — vẫn tách khỏi bộ màu thương hiệu
  aiAccent: '#8B6FE8',
  aiBg: '#221E35',
  aiBorder: '#453A6B',
  aiText: '#C4B5FD',

  // Tối hơn chế độ sáng: nền vốn đã tối, lớp phủ nhạt thì không tách lớp được
  scrim: 'rgba(0, 0, 0, 0.6)',
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

/*
 * Đổ bóng phải khai báo riêng cho từng hệ: iOS dùng shadow*, Android dùng elevation.
 *
 * Chế độ tối gần như bỏ bóng đi: bóng là vệt tối, đặt trên nền vốn đã tối thì
 * không ai thấy. Thay vào đó các lớp tự tách nhau bằng độ sáng khác nhau.
 */
export const lightShadow = {
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

export const darkShadow = {
  card: {
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  float: {
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 7,
  },
};

/*
 * Màu và chữ của nhãn trạng thái. Dùng ở cả màn danh sách lẫn màn chi tiết.
 *
 * Nhận colors từ bên ngoài vì màu "đã đoàn tụ" khác nhau giữa hai chế độ.
 * Trả về labelKey chứ không trả thẳng chữ: hàm này không biết người dùng đang
 * xem tiếng gì. Nơi gọi tự dịch bằng t(status.labelKey).
 */
export function statusStyle(pet, colors) {
  if (pet.resolved) return { color: colors.resolved, labelKey: 'badge.resolved' };
  if (pet.type === 'lost') return { color: colors.lost, labelKey: 'badge.lost' };
  return { color: colors.found, labelKey: 'badge.found' };
}
