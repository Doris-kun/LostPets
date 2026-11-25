import { darkColors, lightColors, statusStyle, type Colors } from '../theme';
import type { Pet } from '../types';

/*
 * Bộ test cho bảng màu.
 *
 * Đo bằng công thức WCAG 2 thay vì nhìn bằng mắt. Lý do: đã có lần cả bảng
 * màu "nhìn thì ổn" mà đo ra 16 cặp dưới ngưỡng — trong đó tên app ở chế độ
 * tối chỉ đạt 2.41:1, gần như không đọc được.
 *
 * Mắt người quen rất nhanh với chữ mờ, nên không tin mắt được ở việc này.
 */

// --- Công thức WCAG 2 ---

const sang = (hex: string): number => {
  const n = parseInt(hex.replace('#', ''), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const tiLe = (a: string, b: string): number => {
  const [x, y] = [sang(a), sang(b)];
  const [cao, thap] = x > y ? [x, y] : [y, x];
  return (cao + 0.05) / (thap + 0.05);
};

/*
 * Các cặp chữ/nền app thật sự dùng.
 *
 * Ngưỡng: 4.5:1 cho chữ thường, 3:1 cho chữ lớn (>= 24px, hoặc >= 18.66px mà
 * in đậm) và cho những thứ không phải chữ như viền của nút bấm.
 */
const CAP: [string, keyof Colors, keyof Colors, number][] = [
  ['Chữ chính trên nền trang', 'text', 'background', 4.5],
  ['Chữ chính trên thẻ', 'text', 'surface', 4.5],
  ['Chữ phụ trên nền trang', 'textSoft', 'background', 4.5],
  ['Chữ phụ trên thẻ', 'textSoft', 'surface', 4.5],
  ['Chữ mờ trên nền trang', 'textMuted', 'background', 4.5],
  ['Chữ mờ trên thẻ', 'textMuted', 'surface', 4.5],
  ['Chữ mờ trên lớp nổi', 'textMuted', 'surfaceTint', 4.5],

  ['Chữ trên nút chính', 'onPrimary', 'primary', 4.5],
  ['Chữ trên nhãn Bị mất', 'onLost', 'lost', 4.5],
  ['Chữ trên nhãn Tìm thấy', 'onFound', 'found', 4.5],
  ['Chữ trên nhãn Đã đoàn tụ', 'onResolved', 'resolved', 4.5],

  ['Chữ xanh chủ đạo trên nền', 'primary', 'background', 4.5],
  ['Chữ xanh chủ đạo trên thẻ', 'primary', 'surface', 4.5],
  ['Chữ đỏ nút xoá trên nền', 'danger', 'background', 4.5],
  ['Chữ đỏ nút xoá trên thẻ', 'danger', 'surface', 4.5],
  ['Chữ nút Đã đoàn tụ', 'resolved', 'background', 4.5],

  ['Cảnh báo lừa đảo', 'warnText', 'warnBg', 4.5],
  ['Đặc điểm bí mật', 'secretText', 'secretBg', 4.5],
  ['Chữ AI trên nền AI', 'aiText', 'aiBg', 4.5],
  ['Chữ trên nút AI', 'onPrimary', 'aiAccent', 4.5],
  ['Chữ trên khung liên hệ', 'text', 'contactBg', 4.5],

  // Màu chữ riêng cho từng chế độ. Bốn màu thương hiệu giống hệt nhau ở cả
  // hai chế độ nên dùng thẳng làm màu chữ thì chỉ đúng được một bên.
  ['Tên app ở đầu trang', 'brandTitle', 'background', 3],
  ['Nhãn TIN MỚI NHẤT', 'accentText', 'background', 4.5],
  ['Nhãn LIÊN HỆ', 'tealText', 'contactBg', 4.5],
  ['Nhãn ADMIN', 'tealText', 'surfaceTint', 4.5],

  // Màu mượn của Google và Facebook. Mượn thì vẫn phải đo: nút của người
  // khác đặt trong app của mình, chữ không đọc được vẫn là lỗi của mình.
  ['Chữ trên nút Google', 'onGoogle', 'googleBg', 4.5],
  ['Viền nút Google', 'googleBorder', 'googleBg', 3],
  ['Chữ trên nút Facebook', 'onFacebook', 'facebookBg', 4.5],

  // Viền của thứ bấm được hoặc gõ được. Nhiều khi nó là thứ DUY NHẤT cho
  // biết đây là chỗ bấm được, nên chuẩn đòi 3:1.
  ['Viền nút bấm so với nền', 'borderStrong', 'background', 3],
  ['Viền nút bấm so với thẻ', 'borderStrong', 'surface', 3],
  ['Viền nút bấm trên lớp nổi', 'borderStrong', 'surfaceTint', 3],
];

describe.each([
  ['sáng', lightColors],
  ['tối', darkColors],
])('tương phản WCAG — chế độ %s', (_ten, bang) => {
  it.each(CAP)('%s đạt ngưỡng', (_cho, chu, nen, can) => {
    const r = tiLe(bang[chu], bang[nen]);
    expect(r).toBeGreaterThanOrEqual(can);
  });
});

describe('hai bảng màu phải có đúng từng ấy màu', () => {
  /*
   * TypeScript đã bắt chuyện này lúc biên dịch (darkColors khai kiểu Colors).
   * Vẫn để test ở đây vì nó nói ra bằng lời: thiếu một màu ở bảng tối thì
   * chế độ tối sẽ có một ô trống giữa màn hình, mà không ai thử chế độ tối
   * kỹ bằng chế độ sáng.
   */
  it('cùng số lượng và cùng tên', () => {
    expect(Object.keys(darkColors).sort()).toEqual(Object.keys(lightColors).sort());
  });

  it('mọi giá trị đều là mã màu hợp lệ hoặc rgba', () => {
    for (const [ten, giaTri] of Object.entries(lightColors)) {
      expect(String(giaTri)).toMatch(/^(#[0-9A-Fa-f]{6}|rgba?\()/);
      expect(String(darkColors[ten as keyof Colors])).toMatch(/^(#[0-9A-Fa-f]{6}|rgba?\()/);
    }
  });
});

describe('statusStyle — nhãn trạng thái', () => {
  const tin = (p: Partial<Pet>) => ({ resolved: false, type: 'lost', ...p }) as Pet;

  it('tin đã đoàn tụ thắng mọi thứ khác', () => {
    // Kể cả type là lost, đã đoàn tụ thì phải hiện nhãn đoàn tụ.
    const s = statusStyle(tin({ resolved: true, type: 'lost' }), lightColors);
    expect(s.labelKey).toBe('badge.resolved');
    expect(s.color).toBe(lightColors.resolved);
  });

  it('tin báo mất', () => {
    const s = statusStyle(tin({ type: 'lost' }), lightColors);
    expect(s.labelKey).toBe('badge.lost');
    expect(s.color).toBe(lightColors.lost);
  });

  it('tin nhặt được', () => {
    const s = statusStyle(tin({ type: 'found' }), lightColors);
    expect(s.labelKey).toBe('badge.found');
    expect(s.color).toBe(lightColors.found);
  });

  it('trả về cả màu chữ, không để nơi gọi tự nghĩ', () => {
    // Mỗi nhãn một nền khác nhau nên không dùng chung được một màu chữ.
    // Nhãn "đã đoàn tụ" còn đổi nền giữa hai chế độ nên càng không.
    for (const bang of [lightColors, darkColors]) {
      for (const t of [
        tin({ type: 'lost' }),
        tin({ type: 'found' }),
        tin({ resolved: true }),
      ]) {
        const s = statusStyle(t, bang);
        expect(s.onColor).toBeDefined();
        expect(tiLe(s.onColor, s.color)).toBeGreaterThanOrEqual(4.5);
      }
    }
  });
});
