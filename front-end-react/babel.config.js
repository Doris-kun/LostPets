// Babel ở đây CHỈ dùng cho Jest, không dùng để build.
//
// Vite tự biên dịch bằng esbuild, không đọc file này. Bản Vue thì khác — nó
// dùng chung babel.config.js cho cả build lẫn test, nên preset của nó là
// '@vue/cli-plugin-babel/preset'. Preset đó kéo theo cả Vue, ở đây không có
// nên phải khai riêng.
//
// export default chứ không module.exports: package.json khai "type": "module"
// nên mọi file .js ở đây là ESM. Viết module.exports là Node ném
// "module is not defined" ngay lúc Jest nạp cấu hình.
export default {
  presets: [
    [
      '@babel/preset-env',
      {
        // Chỉ nhắm Node đang chạy test. Không hạ xuống ES5 cho trình duyệt cũ
        // vì phần đó là việc của Vite, mà hạ thấp thì test chạy chậm đi và
        // thông báo lỗi cũng khó đọc hơn.
        targets: { node: 'current' },
      },
    ],
    [
      '@babel/preset-react',
      {
        // Không phải khai import React ở đầu mỗi file .jsx. React 19 bỏ hẳn
        // lối cũ, và mã nguồn ở đây cũng không có file nào import như vậy.
        runtime: 'automatic',
      },
    ],
  ],
};
