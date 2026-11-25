// Cấu hình Jest cho bản React.
//
// Chép từ bản Vue và giữ nguyên chủ ý của nó: KHÔNG dựng bộ công cụ render
// component. Phần đáng canh nhất không nằm trong giao diện mà nằm trong mấy
// module .js thuần — làm nhiễu toạ độ trước khi gửi ra ngoài, thu nhỏ ảnh,
// tính khoảng cách, giữ phiên đăng nhập. Thêm cả @testing-library chỉ để chụp
// vài cái nút là đổi lấy một đống phụ thuộc mà không canh thêm được gì quan
// trọng.
//
// Nhờ vậy 47 test của bản Vue chạy được nguyên vẹn trên bản React: chúng gọi
// đúng những tên hàm mà bản React giữ lại.
//
// export default chứ không module.exports: package.json khai "type": "module".
export default {
  // jsdom vì mã có đụng tới localStorage, fetch và window.
  testEnvironment: 'jsdom',
  testMatch: ['<rootDir>/tests/**/*.test.js'],
  // CSS không phải JavaScript. map.js nhập leaflet.css, mà Jest thì đem
  // mọi thứ đi phân tích như JS nếu không khai gì.
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': '<rootDir>/tests/stub-css.js',
  },
  transform: {
    '^.+\\.(js|jsx)$': 'babel-jest',
  },
  // Cùng lý do với back-end: mỗi worker là một tiến trình, mà máy phát triển
  // chỉ có 7,7 GB RAM.
  maxWorkers: 3,
};
