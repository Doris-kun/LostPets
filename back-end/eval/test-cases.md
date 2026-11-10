# Bảng test case chức năng — back-end LostPets

Chạy ngày 2026-11-10 · sinh tự động bởi `npm run test:report`

## Tổng hợp

| | |
|---|---|
| Tổng số test case | 370 |
| Pass | 370 |
| Fail | 0 |
| Tỉ lệ pass | **100%** |
| Tiêu chí Objective 4 | ≥ 90% |
| Kết luận | **Đạt** |

Môi trường: Jest 28 bộ test, cơ sở dữ liệu tạm trong bộ nhớ (mongodb-memory-server), không gọi mạng ra ngoài.

## Theo nhóm chức năng

| Nhóm | Mục tiêu | Số case | Pass | Fail |
|---|---|---|---|---|
| scaling.test.js | — | 9 | 9 | 0 |
| push.test.js | — | 22 | 22 | 0 |
| no-network.test.js | — | 1 | 1 | 0 |
| forgot-password.test.js | — | 22 | 22 | 0 |
| user-providers.test.js | — | 8 | 8 | 0 |
| bad-id.test.js | — | 20 | 20 | 0 |
| text-filter.test.js | — | 15 | 15 | 0 |
| Đăng ký và đăng nhập bằng mật khẩu | Obj 2 | 11 | 11 | 0 |
| Đăng nhập Google/Facebook và quy tắc gắn tài khoản | Obj 2 | 23 | 23 | 0 |
| Kiểm aud của ID token Google (web, iOS, Android) | Obj 2 | 8 | 8 | 0 |
| Trang quản trị và phân quyền | Obj 2 | 14 | 14 | 0 |
| Danh sách tin của chính mình | Obj 2 | 9 | 9 | 0 |
| Đặc điểm nhận dạng giữ kín | Obj 2 | 9 | 9 | 0 |
| Chặn tần suất gọi API | Obj 2 | 4 | 4 | 0 |
| Giới hạn nguồn gọi API (CORS) | Obj 2 | 4 | 4 | 0 |
| Xử lý lỗi toàn cục | Obj 2 | 6 | 6 | 0 |
| Tạo, đọc, sửa, xoá tin đăng | Obj 2 | 26 | 26 | 0 |
| Toạ độ và làm nhiễu vị trí | Obj 2 | 13 | 13 | 0 |
| Bản đồ và gom nhóm ghim | Obj 2 | 12 | 12 | 0 |
| Ảnh tin đăng và đường lui khi ảnh hỏng | Obj 2 | 20 | 20 | 0 |
| Báo cáo tin xấu | B12 | 19 | 19 | 0 |
| Tự động xoá tin đã giải quyết | B10 | 23 | 23 | 0 |
| Phân tích ảnh bằng AI | Obj 4 | 5 | 5 | 0 |
| So khớp Lost↔Found đầu-cuối | Obj 3 | 17 | 17 | 0 |
| Tầng truy hồi ứng viên so khớp | Obj 3 | 7 | 7 | 0 |
| Tìm kiếm theo nghĩa | Obj 4 | 22 | 22 | 0 |
| Tái xếp hạng kết quả tìm kiếm | Obj 4 / B07 | 10 | 10 | 0 |
| Trợ lý hỗ trợ kỹ thuật | Could-Have | 11 | 11 | 0 |

## Chi tiết từng test case

### scaling.test.js

| Mã | Test case | Kết quả |
|---|---|---|
| TC-001 | index phục vụ đúng truy vấn thật › danh sách tin KHÔNG được quét toàn bộ collection | Pass |
| TC-002 | index phục vụ đúng truy vấn thật › truy vấn lấy ứng viên so khớp chỉ lấy đúng số bản ghi cần | Pass |
| TC-003 | nhớ tạm vector câu tìm kiếm › cùng một câu chỉ gọi Gemini một lần | Pass |
| TC-004 | nhớ tạm vector câu tìm kiếm › câu khác nhau vẫn gọi riêng | Pass |
| TC-005 | nhớ tạm vector câu tìm kiếm › trả về đúng vector ở lần đọc lại | Pass |
| TC-006 | nhớ tạm vector câu tìm kiếm › KHÔNG nhớ lần hỏng, để phút sau quota hồi thì thử lại được | Pass |
| TC-007 | nhớ tạm vector câu tìm kiếm › không phình quá trần, và bỏ câu lâu nhất không ai dùng | Pass |
| TC-008 | nén phản hồi › nén khi trình duyệt khai là đỡ được | Pass |
| TC-009 | nén phản hồi › KHÔNG nén khi trình duyệt không khai | Pass |

### push.test.js

| Mã | Test case | Kết quả |
|---|---|---|
| TC-010 | lưu mã thiết bị › bắt buộc đăng nhập | Pass |
| TC-011 | lưu mã thiết bị › từ chối mã sai định dạng | Pass |
| TC-012 | lưu mã thiết bị › lưu mã hợp lệ | Pass |
| TC-013 | lưu mã thiết bị › gửi cùng một mã nhiều lần vẫn chỉ lưu một dòng | Pass |
| TC-014 | lưu mã thiết bị › một người giữ được nhiều máy | Pass |
| TC-015 | lưu mã thiết bị › xoá được mã lúc đăng xuất | Pass |
| TC-016 | lưu mã thiết bị › mã thiết bị không lọt ra API nào | Pass |
| TC-017 | ai được nhận thông báo › báo cho chủ tin NGƯỢC LOẠI ở gần | Pass |
| TC-018 | ai được nhận thông báo › KHÔNG báo cho tin cùng loại | Pass |
| TC-019 | ai được nhận thông báo › KHÔNG báo cho tin khác loài | Pass |
| TC-020 | ai được nhận thông báo › KHÔNG báo cho tin ở quá xa | Pass |
| TC-021 | ai được nhận thông báo › KHÔNG tự báo cho chính người vừa đăng | Pass |
| TC-022 | ai được nhận thông báo › một tin của khách vãng lai ở gần không làm mất thông báo của người khác | Pass |
| TC-023 | ai được nhận thông báo › KHÔNG báo cho tin đã tìm được chủ | Pass |
| TC-024 | ai được nhận thông báo › KHÔNG báo cho tin đã quá cũ | Pass |
| TC-025 | ai được nhận thông báo › chặn trần số người nhận cho mỗi tin | Pass |
| TC-026 | ai được nhận thông báo › tin mới không có toạ độ thì không báo cho ai | Pass |
| TC-027 | ai được nhận thông báo › dịch vụ của Expo hỏng thì không làm hỏng luồng đăng tin | Pass |
| TC-028 | dọn mã thiết bị đã chết › tầng một: Expo báo DeviceNotRegistered ngay lúc gửi | Pass |
| TC-029 | dọn mã thiết bị đã chết › tầng hai: lỗi chỉ lộ ra trong biên nhận đọc sau | Pass |
| TC-030 | dọn mã thiết bị đã chết › biên nhận chưa có thì giữ lại, lần dọn sau đọc tiếp | Pass |
| TC-031 | dọn mã thiết bị đã chết › biên nhận báo ok thì xoá khỏi hàng chờ, giữ nguyên mã | Pass |

### no-network.test.js

| Mã | Test case | Kết quả |
|---|---|---|
| TC-032 | tấm chắn không cho test gọi mạng thật › khoá Gemini phải rỗng trong môi trường test | Pass |

### forgot-password.test.js

| Mã | Test case | Kết quả |
|---|---|---|
| TC-033 | không để lộ email nào có tài khoản › email CÓ tài khoản và email KHÔNG có trả về cùng một câu | Pass |
| TC-034 | không để lộ email nào có tài khoản › email không có tài khoản thì không gửi thư nào | Pass |
| TC-035 | tài khoản có mật khẩu › gửi thư kèm đường dẫn đặt lại | Pass |
| TC-036 | tài khoản có mật khẩu › đổi được mật khẩu rồi đăng nhập bằng mật khẩu mới | Pass |
| TC-037 | tài khoản có mật khẩu › mã chỉ dùng được MỘT lần | Pass |
| TC-038 | tài khoản có mật khẩu › mã hết hạn thì từ chối | Pass |
| TC-039 | tài khoản có mật khẩu › mã bịa ra thì từ chối | Pass |
| TC-040 | tài khoản có mật khẩu › mật khẩu mới quá ngắn thì từ chối | Pass |
| TC-041 | tài khoản có mật khẩu › thiếu mã hoặc thiếu mật khẩu thì từ chối | Pass |
| TC-042 | tài khoản tạo bằng Google › không tạo mã đặt lại, vì tài khoản chưa từng có mật khẩu | Pass |
| TC-043 | tài khoản tạo bằng Google › vẫn gửi thư, nhưng chỉ đường về nút Google | Pass |
| TC-044 | chưa cấu hình gửi thư › báo 503 thay vì im lặng nuốt thư | Pass |
| TC-045 | mã băm không được lọt ra ngoài › phản hồi đăng nhập không chứa resetHash | Pass |
| TC-046 | mã băm không được lọt ra ngoài › database lưu BĂM chứ không lưu mã trong thư | Pass |
| TC-047 | thư kèm đường mở thẳng ứng dụng điện thoại › có cả đường web lẫn đường app | Pass |
| TC-048 | thư kèm đường mở thẳng ứng dụng điện thoại › hai đường mang CÙNG một mã | Pass |
| TC-049 | thư kèm đường mở thẳng ứng dụng điện thoại › mã lấy từ đường app đặt lại được mật khẩu thật | Pass |
| TC-050 | thư kèm đường mở thẳng ứng dụng điện thoại › đường web đứng TRƯỚC đường app | Pass |
| TC-051 | thư kèm đường mở thẳng ứng dụng điện thoại › thư cho tài khoản Google KHÔNG kèm đường đặt lại nào | Pass |
| TC-052 | không đứng đợi máy chủ thư › trả lời ngay cả khi máy chủ thư treo hẳn | Pass |
| TC-053 | không đứng đợi máy chủ thư › vẫn lưu mã đặt lại dù thư chưa gửi xong | Pass |
| TC-054 | không đứng đợi máy chủ thư › email KHÔNG có tài khoản và email CÓ tài khoản trả lời gần bằng nhau | Pass |

### user-providers.test.js

| Mã | Test case | Kết quả |
|---|---|---|
| TC-055 | tài khoản chưa gắn nhà cung cấp › hai người cùng đăng ký bằng mật khẩu mà không đụng nhau | Pass |
| TC-056 | tài khoản chưa gắn nhà cung cấp › năm người cũng không sao | Pass |
| TC-057 | tài khoản chưa gắn nhà cung cấp › trường phải VẮNG MẶT chứ không phải mang null | Pass |
| TC-058 | ràng buộc unique vẫn còn nguyên › hai tài khoản không được mang cùng một mã Google | Pass |
| TC-059 | ràng buộc unique vẫn còn nguyên › hai tài khoản không được mang cùng một mã Facebook | Pass |
| TC-060 | ràng buộc unique vẫn còn nguyên › cùng email vẫn bị chặn như cũ | Pass |
| TC-061 | mật khẩu › bắt buộc khi chưa gắn nhà cung cấp nào | Pass |
| TC-062 | mật khẩu › không bắt buộc khi đã có mã Google | Pass |

### bad-id.test.js

| Mã | Test case | Kết quả |
|---|---|---|
| TC-063 | mã tin sai định dạng › GET /pets/khong-phai-id trả 404 chứ không phải 500 | Pass |
| TC-064 | mã tin sai định dạng › GET /pets/123 trả 404 chứ không phải 500 | Pass |
| TC-065 | mã tin sai định dạng › GET /pets/abc def trả 404 chứ không phải 500 | Pass |
| TC-066 | mã tin sai định dạng › GET /pets/%20 trả 404 chứ không phải 500 | Pass |
| TC-067 | mã tin sai định dạng › GET /pets/null trả 404 chứ không phải 500 | Pass |
| TC-068 | mã tin sai định dạng › GET /pets/../../etc/passwd trả 404 chứ không phải 500 | Pass |
| TC-069 | mã tin sai định dạng › PUT /pets/khong-phai-id trả 404 chứ không phải 500 | Pass |
| TC-070 | mã tin sai định dạng › PUT /pets/123 trả 404 chứ không phải 500 | Pass |
| TC-071 | mã tin sai định dạng › PUT /pets/abc def trả 404 chứ không phải 500 | Pass |
| TC-072 | mã tin sai định dạng › PUT /pets/%20 trả 404 chứ không phải 500 | Pass |
| TC-073 | mã tin sai định dạng › PUT /pets/null trả 404 chứ không phải 500 | Pass |
| TC-074 | mã tin sai định dạng › PUT /pets/../../etc/passwd trả 404 chứ không phải 500 | Pass |
| TC-075 | mã tin sai định dạng › DELETE /pets/khong-phai-id trả 404 chứ không phải 500 | Pass |
| TC-076 | mã tin sai định dạng › DELETE /pets/123 trả 404 chứ không phải 500 | Pass |
| TC-077 | mã tin sai định dạng › DELETE /pets/abc def trả 404 chứ không phải 500 | Pass |
| TC-078 | mã tin sai định dạng › DELETE /pets/%20 trả 404 chứ không phải 500 | Pass |
| TC-079 | mã tin sai định dạng › DELETE /pets/null trả 404 chứ không phải 500 | Pass |
| TC-080 | mã tin sai định dạng › DELETE /pets/../../etc/passwd trả 404 chứ không phải 500 | Pass |
| TC-081 | mã đúng định dạng nhưng không có tin › vẫn là 404, không nhầm thành 500 | Pass |
| TC-082 | tin có thật vẫn đọc được bình thường › chốt chặn không chặn nhầm người ngay tình | Pass |

### text-filter.test.js

| Mã | Test case | Kết quả |
|---|---|---|
| TC-083 | dấu tiếng Việt viết kiểu nào cũng tìm ra › hai chuỗi này KHÁC nhau về byte dù nhìn giống hệt | Pass |
| TC-084 | dấu tiếng Việt viết kiểu nào cũng tìm ra › gõ kiểu NFD vẫn tìm ra tin lưu kiểu NFC | Pass |
| TC-085 | dấu tiếng Việt viết kiểu nào cũng tìm ra › gõ kiểu NFC vẫn ra như cũ | Pass |
| TC-086 | dấu tiếng Việt viết kiểu nào cũng tìm ra › tin đăng bằng chữ NFD được lưu thành NFC | Pass |
| TC-087 | dấu tiếng Việt viết kiểu nào cũng tìm ra › câu tìm kiếm tự do cũng được quy về một kiểu | Pass |
| TC-088 | ký tự đặc biệt không làm sập máy chủ › lọc theo khu vực "(" vẫn trả 200 | Pass |
| TC-089 | ký tự đặc biệt không làm sập máy chủ › lọc theo khu vực "[" vẫn trả 200 | Pass |
| TC-090 | ký tự đặc biệt không làm sập máy chủ › lọc theo khu vực "*" vẫn trả 200 | Pass |
| TC-091 | ký tự đặc biệt không làm sập máy chủ › lọc theo khu vực "+" vẫn trả 200 | Pass |
| TC-092 | ký tự đặc biệt không làm sập máy chủ › lọc theo khu vực "?" vẫn trả 200 | Pass |
| TC-093 | ký tự đặc biệt không làm sập máy chủ › lọc theo khu vực "\\" vẫn trả 200 | Pass |
| TC-094 | ký tự đặc biệt không làm sập máy chủ › lọc theo khu vực "(((" vẫn trả 200 | Pass |
| TC-095 | ký tự đặc biệt không làm sập máy chủ › lọc theo khu vực "Quận 1 (gần chợ)" vẫn trả 200 | Pass |
| TC-096 | ký tự đặc biệt không làm sập máy chủ › ký tự đặc biệt được hiểu là CHỮ, không phải cú pháp | Pass |
| TC-097 | ký tự đặc biệt không làm sập máy chủ › dấu chấm không còn khớp mọi ký tự | Pass |

### Đăng ký và đăng nhập bằng mật khẩu

| Mã | Test case | Kết quả |
|---|---|---|
| TC-098 | POST /auth/register › tạo tài khoản và trả về token | Pass |
| TC-099 | POST /auth/register › không trả về mật khẩu đã băm | Pass |
| TC-100 | POST /auth/register › từ chối email trùng | Pass |
| TC-101 | POST /auth/register › từ chối mật khẩu quá ngắn | Pass |
| TC-102 | POST /auth/register › từ chối thiếu trường | Pass |
| TC-103 | POST /auth/login › đăng nhập đúng thì có token | Pass |
| TC-104 | POST /auth/login › sai mật khẩu trả 401 | Pass |
| TC-105 | POST /auth/login › email chưa đăng ký cũng trả 401 với cùng thông báo | Pass |
| TC-106 | GET /auth/me › trả về thông tin khi có token hợp lệ | Pass |
| TC-107 | GET /auth/me › không có token thì 401 | Pass |
| TC-108 | GET /auth/me › token rác thì 401 | Pass |

### Đăng nhập Google/Facebook và quy tắc gắn tài khoản

| Mã | Test case | Kết quả |
|---|---|---|
| TC-109 | POST /auth/google › tạo tài khoản mới khi chưa có gì trùng | Pass |
| TC-110 | POST /auth/google › tài khoản tạo kiểu này không có mật khẩu mà vẫn lưu được | Pass |
| TC-111 | POST /auth/google › lần đăng nhập thứ hai dùng lại tài khoản cũ, không tạo thêm | Pass |
| TC-112 | POST /auth/google › nhận ra người cũ kể cả khi họ đã đổi email ở Google | Pass |
| TC-113 | POST /auth/google › gắn vào tài khoản mật khẩu sẵn có khi email đã được xác minh | Pass |
| TC-114 | POST /auth/google › sau khi gắn thì vẫn đăng nhập được bằng mật khẩu như cũ | Pass |
| TC-115 | POST /auth/google › TỪ CHỐI gắn khi nhà cung cấp không xác minh email | Pass |
| TC-116 | POST /auth/google › cấp quyền admin nếu email nằm trong ADMIN_EMAILS | Pass |
| TC-117 | POST /auth/google › token nhà cung cấp hỏng thì trả 401, không tạo tài khoản | Pass |
| TC-118 | POST /auth/google › không bao giờ để lọt mã định danh hay mật khẩu ra response | Pass |
| TC-119 | POST /auth/google › trả 503 khi chưa cấu hình GOOGLE_CLIENT_ID | Pass |
| TC-120 | POST /auth/facebook › tạo tài khoản mới và lưu mã định danh Facebook | Pass |
| TC-121 | POST /auth/facebook › một người gắn được cả Google lẫn Facebook vào cùng tài khoản | Pass |
| TC-122 | POST /auth/facebook › trả 503 khi thiếu FACEBOOK_APP_SECRET | Pass |
| TC-123 | đăng nhập bằng mật khẩu khi tài khoản không có mật khẩu › trả 401 chứ không phải 500 | Pass |
| TC-124 | đăng nhập bằng mật khẩu khi tài khoản không có mật khẩu › vẫn dùng chung một thông báo với trường hợp sai mật khẩu | Pass |
| TC-125 | GET /auth/providers › cho front-end biết nên vẽ nút nào | Pass |
| TC-126 | GET /auth/providers › chìa nút Facebook ra khi FACEBOOK_PUBLIC=on | Pass |
| TC-127 | GET /auth/providers › vẫn ẩn nút khi bật nhưng chưa khai đủ khoá | Pass |
| TC-128 | GET /auth/providers › ẩn nút KHÔNG làm hỏng tính năng — endpoint vẫn chạy | Pass |
| TC-129 | GET /auth/providers › báo biến cho app mobile đã khai hay chưa | Pass |
| TC-130 | GET /auth/providers › không bao giờ trả về giá trị của mã, chỉ true/false | Pass |
| TC-131 | GET /auth/providers › báo false cho nhà cung cấp chưa cấu hình | Pass |

### Kiểm aud của ID token Google (web, iOS, Android)

| Mã | Test case | Kết quả |
|---|---|---|
| TC-132 | danh sách aud được chấp nhận › gửi xuống cả ba mã khi khai đủ | Pass |
| TC-133 | danh sách aud được chấp nhận › bỏ qua mã chưa khai, web vẫn chạy một mình | Pass |
| TC-134 | danh sách aud được chấp nhận › bỏ qua cả chuỗi rỗng chứ không chỉ biến thiếu hẳn | Pass |
| TC-135 | danh sách aud được chấp nhận › không hề gọi thư viện khi chưa khai mã nào | Pass |
| TC-136 | danh sách aud được chấp nhận › không bao giờ truyền undefined hay null xuống thư viện | Pass |
| TC-137 | danh sách aud được chấp nhận › báo đúng là lỗi cấu hình, không đổ cho token | Pass |
| TC-138 | danh sách aud được chấp nhận › vẫn chặn khi thiếu token, trước cả khi xét cấu hình | Pass |
| TC-139 | danh sách aud được chấp nhận › trả về hồ sơ đã chuẩn hoá khi token hợp lệ | Pass |

### Trang quản trị và phân quyền

| Mã | Test case | Kết quả |
|---|---|---|
| TC-140 | Phân quyền quản trị › chưa đăng nhập thì trả 401 | Pass |
| TC-141 | Phân quyền quản trị › người dùng thường trả 403 | Pass |
| TC-142 | Phân quyền quản trị › email trong ADMIN_EMAILS được cấp quyền admin | Pass |
| TC-143 | Phân quyền quản trị › không phân biệt hoa thường và khoảng trắng trong ADMIN_EMAILS | Pass |
| TC-144 | Phân quyền quản trị › nâng quyền ngay ở lần đăng nhập kế tiếp khi email được thêm vào danh sách | Pass |
| TC-145 | GET /admin/stats › đếm đúng theo loại và trạng thái | Pass |
| TC-146 | GET /admin/stats › không chia cho 0 khi chưa có tin nào | Pass |
| TC-147 | GET /admin/stats › xếp hạng khu vực nhiều tin nhất | Pass |
| TC-148 | GET /admin/pets › trả về mọi tin, mới nhất trước | Pass |
| TC-149 | GET /admin/pets › lọc theo loại và trạng thái | Pass |
| TC-150 | GET /admin/pets › tìm theo từ khoá, ký tự đặc biệt không làm vỡ truy vấn | Pass |
| TC-151 | DELETE /admin/pets/:petId › quản trị viên xoá được tin của người khác mà không cần mã | Pass |
| TC-152 | DELETE /admin/pets/:petId › người dùng thường không xoá được qua đường admin | Pass |
| TC-153 | DELETE /admin/pets/:petId › id sai định dạng trả 404 chứ không phải 500 | Pass |

### Danh sách tin của chính mình

| Mã | Test case | Kết quả |
|---|---|---|
| TC-154 | Tin gắn với tài khoản › đăng tin khi đã đăng nhập thì tin thuộc về mình | Pass |
| TC-155 | Tin gắn với tài khoản › chủ tin sửa được mà không cần mã xác nhận | Pass |
| TC-156 | Tin gắn với tài khoản › chủ tin xoá được mà không cần mã xác nhận | Pass |
| TC-157 | Tin gắn với tài khoản › người khác không sửa được tin của mình | Pass |
| TC-158 | Tin gắn với tài khoản › khách vãng lai không sửa được tin đã có chủ | Pass |
| TC-159 | Tin gắn với tài khoản › chỉ thấy tin của mình, không thấy tin người khác | Pass |
| TC-160 | Tin gắn với tài khoản › chưa đăng nhập thì /pets/mine trả 401 | Pass |
| TC-161 | Tin gắn với tài khoản › khách vãng lai đăng tin thì vẫn dùng mã xác nhận như cũ | Pass |
| TC-162 | Tin gắn với tài khoản › danh sách chung vẫn hiện tin của mọi người | Pass |

### Đặc điểm nhận dạng giữ kín

| Mã | Test case | Kết quả |
|---|---|---|
| TC-163 | Đặc điểm bí mật › người xem tin không thấy đặc điểm bí mật | Pass |
| TC-164 | Đặc điểm bí mật › không lọt ra ở danh sách chung | Pass |
| TC-165 | Đặc điểm bí mật › không lọt ra ngay khi vừa tạo tin | Pass |
| TC-166 | Đặc điểm bí mật › chủ tin đăng nhập thì đọc được | Pass |
| TC-167 | Đặc điểm bí mật › người cầm mã xác nhận thì đọc được | Pass |
| TC-168 | Đặc điểm bí mật › mã sai thì không đọc được | Pass |
| TC-169 | Đặc điểm bí mật › tài khoản khác không đọc được | Pass |
| TC-170 | Đặc điểm bí mật › chủ tin sửa được đặc điểm bí mật | Pass |
| TC-171 | Đặc điểm bí mật › bản băm mã xác nhận vẫn không bao giờ lọt ra | Pass |

### Chặn tần suất gọi API

| Mã | Test case | Kết quả |
|---|---|---|
| TC-172 | Giới hạn tần suất › chặn khi gọi AI quá nhiều lần trong thời gian ngắn | Pass |
| TC-173 | Giới hạn tần suất › trả kèm Retry-After để client biết chờ bao lâu | Pass |
| TC-174 | Giới hạn tần suất › mỗi endpoint đếm riêng, chặn chat không chặn luôn match | Pass |
| TC-175 | Giới hạn tần suất › chặn tạo tài khoản hàng loạt | Pass |

### Giới hạn nguồn gọi API (CORS)

| Mã | Test case | Kết quả |
|---|---|---|
| TC-176 | CORS › cho qua domain nằm trong FRONTEND_URL | Pass |
| TC-177 | CORS › chặn domain lạ | Pass |
| TC-178 | CORS › request không có Origin vẫn chạy bình thường | Pass |
| TC-179 | CORS › không lộ header x-powered-by | Pass |

### Xử lý lỗi toàn cục

| Mã | Test case | Kết quả |
|---|---|---|
| TC-180 | Ảnh vượt giới hạn dung lượng › trả 413 thay vì 500 | Pass |
| TC-181 | Ảnh vượt giới hạn dung lượng › trả JSON chứ không phải trang HTML | Pass |
| TC-182 | Ảnh vượt giới hạn dung lượng › không lộ dấu vết ngăn xếp hay đường dẫn máy chủ | Pass |
| TC-183 | Tệp không phải ảnh › trả 400 kèm JSON | Pass |
| TC-184 | Domain không được phép › trả 403 kèm JSON chứ không phải 500 | Pass |
| TC-185 | Domain không được phép › domain hợp lệ vẫn đi qua bình thường | Pass |

### Tạo, đọc, sửa, xoá tin đăng

| Mã | Test case | Kết quả |
|---|---|---|
| TC-186 | GET /pets › trả về { pets, total } | Pass |
| TC-187 | GET /pets › total = 0 khi chưa có data | Pass |
| TC-188 | POST /pets › trả về 400 nếu thiếu field bắt buộc | Pass |
| TC-189 | POST /pets › tạo pet thành công | Pass |
| TC-190 | GET /pets/:petId › trả về 404 nếu không tồn tại | Pass |
| TC-191 | GET /pets/:petId › trả về pet đúng nếu tồn tại | Pass |
| TC-192 | PUT /pets/:petId › cập nhật resolved thành công | Pass |
| TC-193 | DELETE /pets/:petId › xóa pet thành công | Pass |
| TC-194 | Mã xác nhận › trả về claimCode một lần khi tạo tin | Pass |
| TC-195 | Mã xác nhận › không đọc lại được claimCode qua GET | Pass |
| TC-196 | Mã xác nhận › từ chối sửa khi không có mã | Pass |
| TC-197 | Mã xác nhận › từ chối xoá khi mã sai | Pass |
| TC-198 | Mã xác nhận › tin cũ chưa có mã thì vẫn sửa được | Pass |
| TC-199 | Tham số lọc không hợp lệ › không làm sập server với days=abc (chữ thay vì số) | Pass |
| TC-200 | Tham số lọc không hợp lệ › không làm sập server với days=999999999 (số quá lớn) | Pass |
| TC-201 | Tham số lọc không hợp lệ › không làm sập server với days=-5 (số âm) | Pass |
| TC-202 | Tham số lọc không hợp lệ › không làm sập server với skip=-5 (skip âm) | Pass |
| TC-203 | Tham số lọc không hợp lệ › không làm sập server với limit=-3 (limit âm) | Pass |
| TC-204 | Tham số lọc không hợp lệ › không làm sập server với limit=abc (limit là chữ) | Pass |
| TC-205 | Tham số lọc không hợp lệ › limit vẫn bị chặn ở 50 | Pass |
| TC-206 | Giới hạn file khi đăng tin › từ chối file không phải ảnh | Pass |
| TC-207 | Chỉ sửa được những trường cho phép › không đổi được chủ sở hữu qua PUT | Pass |
| TC-208 | Chỉ sửa được những trường cho phép › không đổi được claimHash, tránh chiếm quyền tin của người khác | Pass |
| TC-209 | Chỉ sửa được những trường cho phép › không đổi được postId | Pass |
| TC-210 | Chỉ sửa được những trường cho phép › không đổi được ngày đăng để nhảy lên đầu danh sách | Pass |
| TC-211 | Chỉ sửa được những trường cho phép › vẫn sửa được những trường bình thường | Pass |

### Toạ độ và làm nhiễu vị trí

| Mã | Test case | Kết quả |
|---|---|---|
| TC-212 | Toạ độ trên bản đồ › lưu được toạ độ khi đăng tin | Pass |
| TC-213 | Toạ độ trên bản đồ › không có toạ độ thì để null, tin vẫn đăng được | Pass |
| TC-214 | Toạ độ trên bản đồ › bỏ qua toạ độ không phải số thay vì làm hỏng bản ghi | Pass |
| TC-215 | Toạ độ trên bản đồ › bỏ qua toạ độ ngoài khoảng hợp lệ | Pass |
| TC-216 | Toạ độ trên bản đồ › chỉ có một trong hai thì bỏ cả hai | Pass |
| TC-217 | Toạ độ trên bản đồ › sửa được toạ độ của tin đã đăng | Pass |
| TC-218 | Toạ độ trên bản đồ › toạ độ rác khi sửa thì bị bỏ qua, các trường khác vẫn lưu | Pass |
| TC-219 | Toạ độ trên bản đồ › toạ độ hiện trong danh sách chung để vẽ lên bản đồ | Pass |
| TC-220 | Xoá vị trí › gửi null thì xoá hẳn chứ không thành toạ độ 0,0 | Pass |
| TC-221 | Xoá vị trí › đăng tin không chọn vị trí, form gửi chuỗi "null" cũng ra null | Pass |
| TC-222 | Làm mờ toạ độ › không lưu toạ độ chính xác, làm tròn về lưới 0,005 độ | Pass |
| TC-223 | Làm mờ toạ độ › điểm sau khi làm mờ vẫn nằm trong khoảng 600m so với điểm gốc | Pass |
| TC-224 | Làm mờ toạ độ › hai tin đăng ở hai điểm cách nhau vài chục mét thì trùng vị trí | Pass |

### Bản đồ và gom nhóm ghim

| Mã | Test case | Kết quả |
|---|---|---|
| TC-225 | GET /pets/map › chỉ trả về tin đã ghim vị trí | Pass |
| TC-226 | GET /pets/map › đếm riêng số tin khớp bộ lọc nhưng thiếu toạ độ | Pass |
| TC-227 | GET /pets/map › không nhầm "map" thành mã tin của GET /pets/:petId | Pass |
| TC-228 | GET /pets/map › bộ lọc loại tin vẫn chặn như ở danh sách | Pass |
| TC-229 | GET /pets/map › bộ lọc loài và khu vực vẫn chặn như ở danh sách | Pass |
| TC-230 | GET /pets/map › bộ lọc số ngày vẫn chặn như ở danh sách | Pass |
| TC-231 | GET /pets/map › chỉ gửi những trường bản đồ vẽ ra, không gửi kèm mô tả hay liên hệ | Pass |
| TC-232 | GET /pets/map › không bao giờ để lọt vector hay bí mật của tin | Pass |
| TC-233 | GET /pets/map › báo capped = false khi còn xa ngưỡng 500 tin | Pass |
| TC-234 | GET /pets/map › khi có ô tìm kiếm › lọc theo nghĩa rồi mới bỏ tin thiếu toạ độ | Pass |
| TC-235 | GET /pets/map › khi có ô tìm kiếm › bộ lọc cứng vẫn chặn trước cả khi xếp hạng | Pass |
| TC-236 | GET /pets/map › khi có ô tìm kiếm › nhúng hỏng thì lui về khớp nguyên văn, không trả danh sách xếp bừa | Pass |

### Ảnh tin đăng và đường lui khi ảnh hỏng

| Mã | Test case | Kết quả |
|---|---|---|
| TC-237 | Đăng tin kèm ảnh › lưu cả URL và public_id của ảnh | Pass |
| TC-238 | Đăng tin kèm ảnh › không trả public_id ra ngoài, đó là chi tiết nội bộ | Pass |
| TC-239 | Đổi ảnh khi sửa tin › thay URL ảnh bằng ảnh mới vừa tải lên | Pass |
| TC-240 | Đổi ảnh khi sửa tin › xoá ảnh cũ trên Cloudinary để không bỏ lại file rác | Pass |
| TC-241 | Đổi ảnh khi sửa tin › vẫn sửa được các trường khác trong cùng lượt đổi ảnh | Pass |
| TC-242 | Đổi ảnh khi sửa tin › sửa tin mà không đụng tới ảnh thì giữ nguyên ảnh cũ | Pass |
| TC-243 | Đổi ảnh khi sửa tin › ảnh vượt 5MB nhận 413 kèm JSON chứ không phải 500 | Pass |
| TC-244 | Đổi ảnh khi sửa tin › tệp không phải ảnh bị từ chối | Pass |
| TC-245 | Đổi ảnh khi sửa tin › sai mã xác nhận thì không đổi được ảnh | Pass |
| TC-246 | Xoá ảnh khỏi tin › removeImage làm trống ảnh và dọn file trên Cloudinary | Pass |
| TC-247 | Xoá ảnh khỏi tin › nhận cả boolean khi gửi JSON | Pass |
| TC-248 | Xoá ảnh khỏi tin › tin vốn không có ảnh thì không gọi xoá vô ích | Pass |
| TC-249 | Xoá ảnh khỏi tin › có ảnh mới thì ưu tiên ảnh mới, bỏ qua removeImage | Pass |
| TC-250 | Ảnh không đổi được bằng cách gửi URL › bỏ qua trường image dạng chuỗi trong body | Pass |
| TC-251 | Ảnh không đổi được bằng cách gửi URL › bỏ qua cả imageId gửi kèm, tránh dọn mất ảnh của tin khác | Pass |
| TC-252 | Tin cũ chỉ có URL, chưa có public_id › moi public_id từ URL ra để vẫn dọn được ảnh cũ | Pass |
| TC-253 | Tin cũ chỉ có URL, chưa có public_id › URL lạ không phải của Cloudinary thì bỏ qua, không gọi xoá bừa | Pass |
| TC-254 | Xoá tin › dọn luôn ảnh của tin đó | Pass |
| TC-255 | Cloudinary lỗi › trả 502 với lời nhắn rõ ràng, không phải Server error chung chung | Pass |
| TC-256 | Cloudinary lỗi › ảnh cũ không bị xoá khi ảnh mới chưa lên được | Pass |

### Báo cáo tin xấu

| Mã | Test case | Kết quả |
|---|---|---|
| TC-257 | POST /pets/:petId/report › ai cũng gửi được, không cần đăng nhập | Pass |
| TC-258 | POST /pets/:petId/report › lưu được cả ghi chú kèm theo | Pass |
| TC-259 | POST /pets/:petId/report › từ chối lý do không có trong danh sách | Pass |
| TC-260 | POST /pets/:petId/report › từ chối báo cáo thiếu lý do | Pass |
| TC-261 | POST /pets/:petId/report › trả 404 cho tin không tồn tại, không tạo báo cáo mồ côi | Pass |
| TC-262 | POST /pets/:petId/report › trả 404 khi id sai định dạng thay vì ném lỗi ép kiểu | Pass |
| TC-263 | POST /pets/:petId/report › cắt ghi chú quá dài thay vì từ chối cả báo cáo | Pass |
| TC-264 | POST /pets/:petId/report › không nói cho người gửi biết tin đã bị báo cáo bao nhiêu lần | Pass |
| TC-265 | POST /pets/:petId/report › một người báo cáo được nhiều tin khác nhau | Pass |
| TC-266 | POST /pets/:petId/report › chặn tần suất tính chung mọi tin, không phải mỗi tin một hạn mức | Pass |
| TC-267 | hàng chờ báo cáo ở trang quản trị › khách vãng lai không xem được | Pass |
| TC-268 | hàng chờ báo cáo ở trang quản trị › quản trị viên xem được, kèm thông tin tin bị báo cáo | Pass |
| TC-269 | hàng chờ báo cáo ở trang quản trị › bỏ qua một báo cáo thì tin vẫn còn nguyên | Pass |
| TC-270 | hàng chờ báo cáo ở trang quản trị › xoá tin thì mọi báo cáo về tin đó biến mất theo | Pass |
| TC-271 | hàng chờ báo cáo ở trang quản trị › xoá tin cũng dọn luôn ảnh trên Cloudinary | Pass |
| TC-272 | hàng chờ báo cáo ở trang quản trị › báo cáo của tin đã bị chủ tin tự xoá vẫn hiện, không làm sập hàng chờ | Pass |
| TC-273 | hàng chờ báo cáo ở trang quản trị › số báo cáo chờ xử lý hiện trong thống kê | Pass |
| TC-274 | hàng chờ báo cáo ở trang quản trị › bỏ qua báo cáo không tồn tại trả 404 | Pass |
| TC-275 | hàng chờ báo cáo ở trang quản trị › không có quy tắc nào tự ẩn tin theo số lượt báo cáo | Pass |

### Tự động xoá tin đã giải quyết

| Mã | Test case | Kết quả |
|---|---|---|
| TC-276 | Quyền gọi đợt dọn dẹp › mã cron đúng thì chạy được dù không đăng nhập | Pass |
| TC-277 | Quyền gọi đợt dọn dẹp › mã cron sai trả 401 | Pass |
| TC-278 | Quyền gọi đợt dọn dẹp › không gửi mã và không đăng nhập thì trả 401 | Pass |
| TC-279 | Quyền gọi đợt dọn dẹp › người dùng thường trả 403 | Pass |
| TC-280 | Quyền gọi đợt dọn dẹp › quản trị viên bấm tay thì chạy được, không cần mã cron | Pass |
| TC-281 | Quyền gọi đợt dọn dẹp › chưa đặt CLEANUP_TOKEN thì đường vào bằng mã đóng hẳn | Pass |
| TC-282 | Chọn tin để xoá › xoá tin đã đoàn tụ quá hạn giữ lại | Pass |
| TC-283 | Chọn tin để xoá › giữ lại tin đoàn tụ còn trong hạn | Pass |
| TC-284 | Chọn tin để xoá › không đụng tới tin chưa đoàn tụ dù đăng đã rất lâu | Pass |
| TC-285 | Chọn tin để xoá › tin đoàn tụ cũ chưa có mốc thời gian thì được đóng dấu, không xoá ngay | Pass |
| TC-286 | Chọn tin để xoá › đổi CLEANUP_AFTER_DAYS thì đổi theo hạn giữ lại | Pass |
| TC-287 | Chọn tin để xoá › giá trị CLEANUP_AFTER_DAYS vô nghĩa thì quay về mặc định 30 ngày | Pass |
| TC-288 | Chọn tin để xoá › xoá nhiều tin trong một lượt và bỏ qua tin không đủ điều kiện | Pass |
| TC-289 | Dọn ảnh kèm theo › xoá tin thì xoá luôn ảnh trên Cloudinary theo imageId | Pass |
| TC-290 | Dọn ảnh kèm theo › tin cũ chỉ có URL vẫn moi được public_id để xoá ảnh | Pass |
| TC-291 | Dọn ảnh kèm theo › tin không có ảnh thì không gọi Cloudinary | Pass |
| TC-292 | Dọn ảnh kèm theo › Cloudinary lỗi thì tin vẫn xoá xong, đợt dọn không thất bại | Pass |
| TC-293 | Đồng hồ đếm ngược resolvedAt › bấm "đã tìm thấy" thì đóng dấu thời điểm | Pass |
| TC-294 | Đồng hồ đếm ngược resolvedAt › bỏ đánh dấu đoàn tụ thì đồng hồ dừng lại | Pass |
| TC-295 | Đồng hồ đếm ngược resolvedAt › gửi chuỗi "false" qua form vẫn hiểu là bỏ đoàn tụ | Pass |
| TC-296 | Đồng hồ đếm ngược resolvedAt › sửa nội dung tin đã đoàn tụ không đẩy lùi hạn xoá | Pass |
| TC-297 | Đồng hồ đếm ngược resolvedAt › client không tự đặt được resolvedAt để né đợt dọn | Pass |
| TC-298 | Thống kê báo trước số tin sắp bị xoá › đếm đúng số tin đã quá hạn | Pass |

### Phân tích ảnh bằng AI

| Mã | Test case | Kết quả |
|---|---|---|
| TC-299 | POST /ai/analyze-image › trả về 503 khi chưa cấu hình GEMINI_API_KEY | Pass |
| TC-300 | POST /ai/analyze-image › trả về 400 khi không gửi ảnh | Pass |
| TC-301 | POST /ai/analyze-image › trả về 400 khi file không phải ảnh | Pass |
| TC-302 | GET /ai/match/:petId › trả về 503 khi chưa cấu hình GEMINI_API_KEY | Pass |
| TC-303 | Timeout khi AI quá chậm › trả 504 thay vì treo tới khi proxy cắt | Pass |

### So khớp Lost↔Found đầu-cuối

| Mã | Test case | Kết quả |
|---|---|---|
| TC-304 | GET /ai/match/:petId — các tình huống hỏng › id sai định dạng trả 404 chứ không phải 500 | Pass |
| TC-305 | GET /ai/match/:petId — các tình huống hỏng › id đúng định dạng nhưng không tồn tại trả 404 | Pass |
| TC-306 | GET /ai/match/:petId — các tình huống hỏng › không có ứng viên nào thì trả mảng rỗng chứ không lỗi | Pass |
| TC-307 | GET /ai/match/:petId — các tình huống hỏng › ảnh tải không được thì vẫn đối chiếu bằng mô tả | Pass |
| TC-308 | GET /ai/match/:petId — các tình huống hỏng › Gemini từ chối vì ảnh thì thử lại bằng chữ và vẫn trả kết quả | Pass |
| TC-309 | GET /ai/match/:petId — các tình huống hỏng › bỏ qua ứng viên AI chấm dưới ngưỡng | Pass |
| TC-310 | GET /ai/match/:petId — các tình huống hỏng › bỏ qua index AI bịa ra ngoài danh sách ứng viên | Pass |
| TC-311 | GET /ai/match/:petId — các tình huống hỏng › AI trả về chuỗi không phải JSON thì báo 502 chứ không sập | Pass |
| TC-312 | GET /ai/match/:petId — các tình huống hỏng › cả hai lần gọi đều hỏng thì trả 500 có thông báo | Pass |
| TC-313 | GET /ai/match/:petId — các tình huống hỏng › AI quá chậm thì trả 504 | Pass |
| TC-314 | GET /ai/match/:petId — câu giải thích › nêu đủ cả hai vế của trường khác nhau | Pass |
| TC-315 | GET /ai/match/:petId — câu giải thích › KHÔNG nói hai màu khác nhau là giống nhau | Pass |
| TC-316 | GET /ai/match/:petId — câu giải thích › bỏ qua hoàn toàn chữ model cố tình nhét vào | Pass |
| TC-317 | GET /ai/match/:petId — câu giải thích › gộp các trường thật sự giống nhau | Pass |
| TC-318 | GET /ai/match/:petId — câu giải thích › nói rõ khoảng cách ngày giữa hai tin | Pass |
| TC-319 | GET /ai/match/:petId — câu giải thích › không nhắc tới ảnh khi model trả khong_ro | Pass |
| TC-320 | GET /ai/match/:petId — câu giải thích › không sập khi model trả giá trị ảnh lạ | Pass |

### Tầng truy hồi ứng viên so khớp

| Mã | Test case | Kết quả |
|---|---|---|
| TC-321 | oppositeType › đổi lost thành found và ngược lại | Pass |
| TC-322 | candidateFilter › chỉ nhận tin ngược loại, cùng loài, chưa giải quyết | Pass |
| TC-323 | findCandidates › loại tin cùng loại, khác loài, đã giải quyết và quá cũ | Pass |
| TC-324 | findCandidates › xếp theo độ giống chứ không theo ngày khi tin gốc có vector | Pass |
| TC-325 | findCandidates › rơi về xếp theo ngày khi tin gốc chưa có vector | Pass |
| TC-326 | findCandidates › đẩy tin chưa nhúng xuống cuối thay vì bỏ hẳn | Pass |
| TC-327 | findCandidates › cắt đúng số lượng yêu cầu | Pass |

### Tìm kiếm theo nghĩa

| Mã | Test case | Kết quả |
|---|---|---|
| TC-328 | Xếp hạng theo nghĩa › tin gần câu hỏi nhất đứng đầu | Pass |
| TC-329 | Xếp hạng theo nghĩa › đổi câu hỏi thì đổi thứ tự | Pass |
| TC-330 | Xếp hạng theo nghĩa › trả về mọi tin chứ không cắt theo ngưỡng điểm | Pass |
| TC-331 | Xếp hạng theo nghĩa › không có câu hỏi thì vẫn sắp theo ngày như cũ | Pass |
| TC-332 | Khớp nguyên văn luôn đứng trên › gõ mã tin thì ra đúng tin đó dù điểm ngữ nghĩa bằng 0 | Pass |
| TC-333 | Khớp nguyên văn luôn đứng trên › khớp chữ trong mô tả cũng được ưu tiên | Pass |
| TC-334 | Khớp nguyên văn luôn đứng trên › không phân biệt hoa thường | Pass |
| TC-335 | Bộ lọc cứng vẫn chặn trước › lọc loài thì câu hỏi không kéo tin loài khác vào | Pass |
| TC-336 | Bộ lọc cứng vẫn chặn trước › lọc loại tin vẫn áp dụng | Pass |
| TC-337 | Bộ lọc cứng vẫn chặn trước › phân trang chạy trên kết quả đã xếp hạng | Pass |
| TC-338 | Khi nhúng hỏng › nhúng câu hỏi thất bại thì lui về lọc theo chữ | Pass |
| TC-339 | Khi nhúng hỏng › nhúng hỏng và không khớp chữ nào thì trả danh sách rỗng, không xếp bừa | Pass |
| TC-340 | Khi nhúng hỏng › tin chưa kịp nhúng vẫn hiện, chỉ là xếp sau | Pass |
| TC-341 | Vector không lọt ra ngoài API › danh sách không kèm embedding | Pass |
| TC-342 | Vector không lọt ra ngoài API › danh sách không có câu hỏi cũng không kèm embedding | Pass |
| TC-343 | Vector không lọt ra ngoài API › xem chi tiết tin không kèm embedding | Pass |
| TC-344 | Nhúng ngầm lúc đăng và sửa tin › đăng tin xong thì nhúng chạy ngầm | Pass |
| TC-345 | Nhúng ngầm lúc đăng và sửa tin › nhúng hỏng thì tin vẫn đăng được bình thường | Pass |
| TC-346 | Nhúng ngầm lúc đăng và sửa tin › sửa mô tả thì nhúng lại | Pass |
| TC-347 | Nhúng ngầm lúc đăng và sửa tin › bấm "đã tìm thấy" thì KHÔNG nhúng lại, khỏi đốt quota | Pass |
| TC-348 | Câu hỏi bất thường › câu hỏi toàn khoảng trắng thì coi như không tìm | Pass |
| TC-349 | Câu hỏi bất thường › câu hỏi dài quá bị cắt chứ không làm sập server | Pass |

### Tái xếp hạng kết quả tìm kiếm

| Mã | Test case | Kết quả |
|---|---|---|
| TC-350 | shouldRerank › bỏ qua câu quá ngắn — tra từ khoá thì vector đã đủ | Pass |
| TC-351 | shouldRerank › nhận câu đủ dài để coi là mô tả | Pass |
| TC-352 | shouldRerank › tắt hẳn khi SEARCH_RERANK không phải on | Pass |
| TC-353 | shouldRerank › mặc định tắt khi không khai biến | Pass |
| TC-354 | rerank › sắp lại theo điểm model chấm | Pass |
| TC-355 | rerank › không bao giờ làm mất tin, kể cả tin bị chấm 0 điểm | Pass |
| TC-356 | rerank › giữ nguyên thứ tự cũ cho tin model quên chấm | Pass |
| TC-357 | rerank › trả nguyên thứ tự cũ khi model hỏng | Pass |
| TC-358 | rerank › trả nguyên thứ tự cũ khi model trả rác | Pass |
| TC-359 | rerank › không gọi model khi chỉ có một tin | Pass |

### Trợ lý hỗ trợ kỹ thuật

| Mã | Test case | Kết quả |
|---|---|---|
| TC-360 | POST /ai/chat › trả 503 khi chưa cấu hình GEMINI_API_KEY | Pass |
| TC-361 | POST /ai/chat › trả lời khi hỏi bình thường | Pass |
| TC-362 | POST /ai/chat › gửi cả hội thoại trước đó để trợ lý hiểu ngữ cảnh | Pass |
| TC-363 | POST /ai/chat › từ chối khi không có nội dung | Pass |
| TC-364 | POST /ai/chat › từ chối khi messages không phải mảng | Pass |
| TC-365 | POST /ai/chat › từ chối hội thoại quá dài | Pass |
| TC-366 | POST /ai/chat › từ chối tin nhắn quá dài | Pass |
| TC-367 | POST /ai/chat › bỏ qua tin nhắn rỗng, chỉ toàn rỗng thì báo lỗi | Pass |
| TC-368 | POST /ai/chat › trả 502 khi trợ lý trả về chuỗi rỗng | Pass |
| TC-369 | POST /ai/chat › trả 504 khi trợ lý quá chậm | Pass |
| TC-370 | POST /ai/chat › trả 500 kèm thông báo khi dịch vụ hỏng | Pass |

