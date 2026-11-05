const fs = require('fs');
const path = require('path');

/*
 * Lấy danh sách tên màu TỪ CHÍNH global.css.
 *
 * Vì sao không viết tay 47 tên vào đây: viết tay là nguồn sự thật thứ ba,
 * sau src/theme.ts và global.css. Thêm một màu vào theme.ts mà quên khai ở
 * đây thì lớp bg-... đó im lặng không ra màu gì — Tailwind không báo lỗi với
 * một tên màu nó chưa từng nghe, nó chỉ bỏ qua.
 *
 * Đọc ngược từ global.css thì thêm màu ở theme.ts, chạy `npm run make:css`,
 * là lớp tiện ích có ngay, không phải sửa file này.
 */
function readColorNames() {
  const css = fs.readFileSync(path.join(__dirname, 'global.css'), 'utf8');

  // Chỉ lấy trong khối :root, không lấy khối .dark:root — hai khối có đúng
  // từng ấy tên nên lấy cả hai sẽ ra danh sách trùng đôi.
  const root = css.slice(css.indexOf(':root {'), css.indexOf('.dark:root'));
  return [...root.matchAll(/--color-([a-z0-9-]+):/g)].map((m) => m[1]);
}

/*
 * rgb(var(...) / <alpha-value>) chứ không phải var(...) trần.
 *
 * Nhờ dạng này mà bg-surface/50 cho ra nửa trong suốt: Tailwind thay
 * <alpha-value> bằng 0.5. Viết var(--color-surface) trần thì phần độ trong
 * suốt không chèn vào đâu được và mọi lớp /50, /20 đều im lặng không ăn.
 */
const colors = Object.fromEntries(
  readColorNames().map((name) => [name, `rgb(var(--color-${name}) / <alpha-value>)`]),
);

/** @type {import('tailwindcss').Config} */
module.exports = {
  // Quét đúng những nơi có thể chứa className. Quét thừa thì Metro chậm đi mà
  // chẳng được gì.
  content: ['./App.tsx', './src/**/*.{ts,tsx}'],

  presets: [require('nativewind/preset')],

  /*
   * darkMode: 'class' chứ không phải 'media'.
   *
   * App đã có nút đổi sáng/tối trong Cài đặt, lưu lựa chọn vào bộ nhớ máy.
   * Để 'media' thì NativeWind đọc thẳng cài đặt của hệ điều hành và bỏ qua
   * lựa chọn của người dùng — tức là gỡ mất một tính năng đang chạy.
   */
  darkMode: 'class',

  theme: {
    extend: {
      /*
       * 47 màu của app, lấy từ src/theme.ts qua global.css.
       *
       * Thiếu đúng một cái: `scrim` (lớp phủ sau bảng lọc). Nó lưu dạng
       * rgba() vì đã kèm sẵn độ trong suốt, nên không tách thành ba kênh
       * được. Chỗ nào cần scrim thì vẫn lấy qua useTheme().
       */
      colors,
    },
  },

  plugins: [],
};
