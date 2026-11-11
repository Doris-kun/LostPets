// Chạy TRƯỚC mọi file test, trước cả khi file test nạp module nào.
//
// Vì sao cần: trên máy phát triển, GEMINI_API_KEY nằm trong biến môi trường
// của Windows chứ không chỉ trong .env. Nghĩa là mọi tiến trình Node đều có
// khoá thật — kể cả Jest. Bộ test nào không tự giả lập @google/genai sẽ gọi
// thẳng ra mạng.
//
// Hai thiệt hại đo được, cả hai đều đã xảy ra thật:
//   1. Đốt quota thật. Gói miễn phí chặn 100 lượt nhúng mỗi phút cho CẢ dự án.
//   2. Test chập chờn. Một lượt chạy đủ 27 bộ đã đỏ 7 test ở cleanup và oauth
//      vì lượt gọi mạng thật hết giờ; chạy lại thì xanh. Bộ test mà phụ thuộc
//      vào mạng thì nó không còn trả lời được câu "mã của tôi có đúng không".
//
// Đặt ở đây chứ không rải vào từng file: 10/27 bộ test chạm được đường nhúng,
// và bộ viết sau này cũng vậy. Bộ nào cần khoá thì tự đặt khoá giả của nó,
// dòng đó chạy sau dòng này nên vẫn có tác dụng.
// Ghi chú về maxWorkers trong package.json.
//
// Mỗi bộ test tự dựng một MongoDB riêng, nên số bộ chạy song song cũng là số
// tiến trình mongod cùng lúc. Khi máy đang tải nặng, chạy nhiều worker thì
// Jest báo cả loạt test đỏ với thời gian chạy 140–312 giây — trông như mã
// vừa hỏng, trong khi chạy riêng từng bộ thì xanh hết.
//
// KHÔNG khẳng định được nguyên nhân chính xác. Đã thử quy cho hết bộ nhớ,
// nhưng số liệu không ủng hộ: lúc đỏ máy còn trống 1,8 GB, lúc xanh chỉ còn
// 1,3 GB. Cùng cấu hình 8 worker mà lúc đỏ lúc xanh, và cũng không còn tiến
// trình mongod mồ côi nào để đổ lỗi.
//
// Thứ đo được chắc chắn, trong cùng một phiên làm việc:
//   3 worker: xanh 3/3 lần, mất 18–19 giây
//   8 worker: đỏ 2/3 lần, mất 15–16 giây khi xanh
//
// Nên giữ 3: trả 3 giây để đổi lấy tính ổn định. Con số tuyệt đối chứ không
// phải phần trăm số nhân, vì máy này có 16 nhân nhưng chỉ 7,7 GB RAM.
//
// Cách sửa triệt để là dựng một mongod duy nhất cho cả lượt chạy qua
// globalSetup, nhưng phải sửa cả 30 file test.
process.env.GEMINI_API_KEY = '';
process.env.GOOGLE_API_KEY = '';

// Dọn cảnh báo strictQuery khỏi log test, cùng một lý do với server.js: mỗi
// bộ test in ra một đoạn cảnh báo dài, mà log test là chỗ phải đọc được khi
// có gì đó hỏng. Chính đống cảnh báo này từng làm khó thấy dòng "fetch
// failed" — manh mối cho thấy test đang gọi mạng thật.
//
// Đặt ở đây được vì mongoose là singleton: file test nạp lại thì vẫn là cùng
// một thể hiện đã được cấu hình.
require('mongoose').set('strictQuery', true);
