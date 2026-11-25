/*
 * Trước khi thêm NativeWind, dự án KHÔNG có file này — Expo tự lo hết. Giờ
 * phải khai tay vì NativeWind cần hai thứ:
 *
 *   jsxImportSource  — để mọi thẻ JSX hiểu được thuộc tính className
 *   nativewind/babel — biến className thành style lúc biên dịch
 *
 * Giữ nguyên babel-preset-expo làm nền, chỉ thêm tham số. Thay nó bằng preset
 * khác là mất phần Expo tự cấu hình cho Hermes và kiến trúc mới.
 *
 * -----------------------------------------------------------------------
 * KHI CHẠY TEST THÌ BỎ NativeWind RA
 *
 * nativewind/babel chèn một biến nội bộ (_ReactNativeCSSInterop) vào MỌI
 * factory của jest.mock() trong file nó biên dịch. Jest cấm factory chạm vào
 * biến ngoài phạm vi, nên cả 6 bộ test chết ngay trước khi chạy case đầu
 * tiên — 232 case báo đỏ cùng một lúc, với một thông báo chẳng nhắc gì tới
 * NativeWind.
 *
 * Không dùng khối `env: { test: ... }` được: Babel CỘNG DỒN preset của env
 * vào preset gốc chứ không thay thế, nên nativewind/babel vẫn được áp. Phải
 * loại bằng điều kiện tường minh như dưới đây.
 *
 * Bỏ nó ra khi test thì className không biến thành style trong môi trường
 * test. Chấp nhận được: các bài test render chỉ hỏi "vẽ ra được không" và
 * "bấm vào có chạy đúng không", không hỏi màu sắc. Còn luật 44pt thì đọc
 * thẳng mã nguồn chứ không chạy mã.
 */
module.exports = function (api) {
  /*
   * api.cache.using chứ không phải api.cache(true).
   *
   * cache(true) khoá cứng kết quả, nên điều kiện dưới đây chỉ được tính MỘT
   * lần cho môi trường chạy đầu tiên rồi dùng lại mãi. Mẫu của Expo dùng
   * cache(true) vì mẫu đó không phân biệt môi trường nào cả.
   */
  api.cache.using(() => process.env.NODE_ENV);

  const dangTest = api.env('test');

  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: dangTest ? 'react' : 'nativewind' }],
      ...(dangTest ? [] : ['nativewind/babel']),
    ],
  };
};
