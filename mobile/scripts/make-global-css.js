/**
 * Sinh ra mobile/global.css từ bảng màu trong src/theme.ts.
 *
 *   npm run make:css
 *
 * Vì sao cần: Tailwind không đọc được object JavaScript chạy lúc thực thi.
 * Muốn viết `className="bg-surface"` thì Tailwind phải biết `surface` là màu
 * gì NGAY LÚC BIÊN DỊCH.
 *
 * Cách rẻ nhất là chép 96 giá trị màu sang tailwind.config.js. Nhưng chép là
 * có hai nguồn sự thật, và sớm muộn một bên đổi mà bên kia quên — lúc đó app
 * có hai sắc xanh khác nhau cho cùng một thứ, mà không ai nhận ra vì chênh
 * nhau vài phần trăm.
 *
 * Nên thay vì chép, script này ĐỌC THẲNG src/theme.ts rồi đẻ ra global.css.
 * theme.ts vẫn là nguồn sự thật duy nhất, và toàn bộ ghi chú đo tương phản
 * WCAG trong đó không phải động vào.
 *
 * -----------------------------------------------------------------------
 * ĐỌC FILE .ts BẰNG NODE THƯỜNG
 *
 * Không cần ts-node hay bước biên dịch nào: Node 22.18 trở lên tự bóc phần
 * khai kiểu ra khỏi file .ts. Đã kiểm trên Node 24 của máy này.
 *
 * Nếu sau này đổi sang Node cũ hơn thì dòng require bên dưới sẽ chết với
 * "Unknown file extension .ts" — lúc đó phải thêm bước biên dịch.
 */
const fs = require('fs');
const path = require('path');

const { lightColors, darkColors } = require('../src/theme.ts');

const OUT = path.join(__dirname, '..', 'global.css');

/*
 * Đổi camelCase sang kebab-case: surfaceTint -> surface-tint
 *
 * Vì tên lớp của Tailwind viết theo kebab. Để nguyên camelCase thì phải viết
 * className="bg-surfaceTint", chạy được nhưng lạc lõng giữa những lớp khác
 * của Tailwind, và người quen Tailwind sẽ gõ nhầm.
 */
const kebab = (name) => name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

/*
 * Đổi #RRGGBB thành "r g b", ba số cách nhau bằng dấu cách.
 *
 * Không phải màu CSS hợp lệ, và đó là CHỦ Ý: Tailwind ghép nó vào
 * rgb(var(--color-x) / <alpha-value>) để lớp bg-surface/50 cho ra nửa trong
 * suốt. Lưu nguyên "#F7FAFB" thì phần <alpha-value> không chèn vào đâu được.
 */
function toChannels(hex) {
  const n = Number.parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
}

/*
 * Chỉ nhận mã #RRGGBB. Bỏ qua phần còn lại và NÓI RA là đã bỏ.
 *
 * Bảng màu có vài giá trị dạng rgba(...) — ví dụ scrim, lớp phủ sau bảng lọc.
 * Chúng vốn đã kèm độ trong suốt nên không tách thành ba kênh được. Bỏ qua
 * im lặng thì sau này ai đó viết className="bg-scrim" sẽ ra không màu gì cả
 * mà không hiểu vì sao.
 */
const HEX = /^#[0-9a-fA-F]{6}$/;

function build(colors) {
  const lines = [];
  const skipped = [];

  for (const [name, value] of Object.entries(colors)) {
    if (typeof value !== 'string' || !HEX.test(value)) {
      skipped.push(name);
      continue;
    }
    lines.push(`    --color-${kebab(name)}: ${toChannels(value)};`);
  }

  return { lines, skipped };
}

const light = build(lightColors);
const dark = build(darkColors);

/*
 * Hai bảng màu phải có đúng từng ấy tên. Lệch một tên nghĩa là một lớp tiện
 * ích chạy ở chế độ sáng mà mất màu ở chế độ tối, hoặc ngược lại — lỗi chỉ
 * hiện ra khi người dùng bấm đổi chế độ, tức là rất muộn.
 */
if (light.lines.length !== dark.lines.length) {
  console.error(
    `Hai bảng màu lệch nhau: sáng có ${light.lines.length}, tối có ${dark.lines.length}.`,
  );
  process.exit(1);
}

const css = `/*
 * FILE NÀY DO MÁY SINH RA — ĐỪNG SỬA TAY.
 *
 *   Nguồn:  src/theme.ts
 *   Lệnh:   npm run make:css
 *
 * Sửa tay thì lần chạy sau ghi đè mất, mà màu sẽ lệch với src/theme.ts trong
 * khoảng thời gian ở giữa. Muốn đổi màu thì sửa src/theme.ts rồi chạy lại
 * lệnh trên.
 *
 * Vì sao màu phải nằm ở đây nữa: Tailwind cần biết giá trị màu ngay lúc biên
 * dịch, mà src/theme.ts là object chạy lúc thực thi. Biến CSS là cầu nối.
 *
 * Phần .dark bên dưới ăn theo nút đổi sáng/tối trong Cài đặt, không phải
 * theo cài đặt của hệ điều hành — xem darkMode: 'class' trong tailwind.config.js.
 */

@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
${light.lines.join('\n')}
  }

  .dark:root {
${dark.lines.join('\n')}
  }
}
`;

fs.writeFileSync(OUT, css, 'utf8');

console.log(`Đã ghi global.css — ${light.lines.length} màu mỗi chế độ.`);
if (light.skipped.length > 0) {
  console.log(
    `Bỏ qua ${light.skipped.length} giá trị không phải mã #RRGGBB: ${light.skipped.join(', ')}`,
  );
  console.log('Những tên đó KHÔNG dùng được dưới dạng lớp Tailwind, phải dùng qua useTheme().');
}
