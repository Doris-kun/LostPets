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
process.env.GEMINI_API_KEY = '';
process.env.GOOGLE_API_KEY = '';
