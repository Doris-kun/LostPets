/** @type {import('tailwindcss').Config} */

/*
 * Cấu hình Tailwind cho NativeWind.
 *
 * ĐANG THỬ NGHIỆM. Mục đích của bước này chỉ là trả lời đúng một câu hỏi:
 * NativeWind có chạy được trên Expo SDK 58 / React Native 0.88 không?
 *
 * Tài liệu của NativeWind dừng ở SDK 54 / RN 0.81, và nó dựa vào
 * react-native-css-interop — thư viện vá thẳng vào ruột React Native, đúng
 * loại dễ vỡ khi RN đổi bên trong. Nên phải thử trước khi chuyển bất kỳ màn
 * hình nào.
 *
 * Chưa đụng tới bảng màu ở src/theme.ts trong bước này. Nối hai nguồn màu lại
 * làm một là việc của bước sau, và chỉ làm nếu bước này chạy được.
 */
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
    extend: {},
  },
  plugins: [],
};
