// Cấu hình Jest cho front-end.
//
// Cố ý KHÔNG dựng vue-jest để nạp file .vue. Phần đáng canh nhất ở đây không
// nằm trong giao diện mà nằm trong mấy module .js thuần: làm nhiễu toạ độ
// trước khi gửi ra ngoài, thu nhỏ ảnh, tính khoảng cách, giữ phiên đăng nhập.
// Thêm cả bộ công cụ dựng component chỉ để chụp vài cái nút là đổi lấy một
// đống phụ thuộc mà không canh thêm được gì quan trọng.
module.exports = {
  // jsdom vì mã có đụng tới localStorage, fetch và window.
  testEnvironment: 'jsdom',
  testMatch: ['<rootDir>/tests/**/*.test.js'],
  // CSS không phải JavaScript. map.js nhập leaflet.css, mà Jest thì đem
  // mọi thứ đi phân tích như JS nếu không khai gì.
  moduleNameMapper: {
    '\.(css|less|scss|sass)$': '<rootDir>/tests/stub-css.js',
  },
  // Dùng lại babel.config.js có sẵn của Vue CLI, không khai riêng.
  transform: {
    '^.+\\.js$': 'babel-jest',
  },
  // Cùng lý do với back-end: mỗi worker là một tiến trình, mà máy phát triển
  // chỉ có 7,7 GB RAM.
  maxWorkers: 3,
};
