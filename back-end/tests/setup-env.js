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
// Ghi chú về maxWorkers trong package.json: mỗi bộ test tự dựng một
// MongoDB riêng trong bộ nhớ. Chạy hết 30 bộ song song trên máy nhiều nhân
// thì hết bộ nhớ, và Jest báo cả loạt test đỏ với thời gian chạy 140–300
// giây — trông như mã vừa hỏng, trong khi chạy riêng từng bộ thì xanh hết.
// Ràng buộc ở đây là BỘ NHỚ chứ không phải số nhân, nên đặt một con số
// tuyệt đối thay vì phần trăm số nhân. Máy phát triển đo được 16 nhân nhưng
// chỉ 7,7 GB RAM và còn trống 1,8 GB; "50%" ra 8 worker, tức 8 mongod cùng
// lúc, và vẫn hết bộ nhớ.
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
