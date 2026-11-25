// Mẩu thay thế cho mọi tệp CSS khi chạy test.
//
// map.js nhập 'leaflet/dist/leaflet.css'. Jest không biết CSS là gì nên đem
// tệp đó phân tích như JavaScript và vỡ ngay dấu chấm đầu tiên. Webpack lúc
// build thì có loader lo việc này, còn Jest thì phải tự khai.
//
// Test ở đây không kiểm giao diện nên không cần nội dung CSS thật.
module.exports = {};
