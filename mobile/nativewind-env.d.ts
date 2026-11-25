/*
 * Khai cho TypeScript biết mọi component React Native giờ nhận thêm thuộc
 * tính className. Thiếu dòng này thì tsc báo lỗi ở từng thẻ có className.
 */
/// <reference types="nativewind/types" />

/*
 * Khai riêng cho việc nạp file .css.
 *
 * nativewind/types chỉ khai thuộc tính className, KHÔNG khai kiểu cho
 * `import './global.css'`. Thiếu dòng dưới thì tsc báo:
 *   TS2882: Cannot find module or type declarations for side-effect import
 * mà câu đó không hề gợi ý rằng thiếu một khai báo module.
 */
declare module '*.css';
