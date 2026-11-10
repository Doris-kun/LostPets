# Bảng test case chức năng — back-end LostPets

Chạy ngày 2026-11-10 · sinh tự động bởi `npm run test:report`

## Tổng hợp

| | |
|---|---|
| Tổng số test case | 352 |
| Pass | 352 |
| Fail | 0 |
| Tỉ lệ pass | **100%** |
| Tiêu chí Objective 4 | ≥ 90% |
| Kết luận | **Đạt** |

Môi trường: Jest 26 bộ test, cơ sở dữ liệu tạm trong bộ nhớ (mongodb-memory-server), không gọi mạng ra ngoài.

## Theo nhóm chức năng

| Nhóm | Mục tiêu | Số case | Pass | Fail |
|---|---|---|---|---|
| text-filter.test.js | — | 15 | 15 | 0 |
| forgot-password.test.js | — | 14 | 14 | 0 |
| user-providers.test.js | — | 8 | 8 | 0 |
| bad-id.test.js | — | 20 | 20 | 0 |
| push.test.js | — | 22 | 22 | 0 |
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

### text-filter.test.js

| Mã | Test case | Kết quả |
|---|---|---|
| TC-001 | dấu tiếng Việt viết kiểu nào cũng tìm ra › hai chuỗi này KHÁC nhau về byte dù nhìn giống hệt | Pass |
| TC-002 | dấu tiếng Việt viết kiểu nào cũng tìm ra › gõ kiểu NFD vẫn tìm ra tin lưu kiểu NFC | Pass |
| TC-003 | dấu tiếng Việt viết kiểu nào cũng tìm ra › gõ kiểu NFC vẫn ra như cũ | Pass |
| TC-004 | dấu tiếng Việt viết kiểu nào cũng tìm ra › tin đăng bằng chữ NFD được lưu thành NFC | Pass |
| TC-005 | dấu tiếng Việt viết kiểu nào cũng tìm ra › câu tìm kiếm tự do cũng được quy về một kiểu | Pass |
| TC-006 | ký tự đặc biệt không làm sập máy chủ › lọc theo khu vực "(" vẫn trả 200 | Pass |
| TC-007 | ký tự đặc biệt không làm sập máy chủ › lọc theo khu vực "[" vẫn trả 200 | Pass |
| TC-008 | ký tự đặc biệt không làm sập máy chủ › lọc theo khu vực "*" vẫn trả 200 | Pass |
| TC-009 | ký tự đặc biệt không làm sập máy chủ › lọc theo khu vực "+" vẫn trả 200 | Pass |
| TC-010 | ký tự đặc biệt không làm sập máy chủ › lọc theo khu vực "?" vẫn trả 200 | Pass |
| TC-011 | ký tự đặc biệt không làm sập máy chủ › lọc theo khu vực "\\" vẫn trả 200 | Pass |
| TC-012 | ký tự đặc biệt không làm sập máy chủ › lọc theo khu vực "(((" vẫn trả 200 | Pass |
| TC-013 | ký tự đặc biệt không làm sập máy chủ › lọc theo khu vực "Quận 1 (gần chợ)" vẫn trả 200 | Pass |
| TC-014 | ký tự đặc biệt không làm sập máy chủ › ký tự đặc biệt được hiểu là CHỮ, không phải cú pháp | Pass |
| TC-015 | ký tự đặc biệt không làm sập máy chủ › dấu chấm không còn khớp mọi ký tự | Pass |

### forgot-password.test.js

| Mã | Test case | Kết quả |
|---|---|---|
| TC-016 | không để lộ email nào có tài khoản › email CÓ tài khoản và email KHÔNG có trả về cùng một câu | Pass |
| TC-017 | không để lộ email nào có tài khoản › email không có tài khoản thì không gửi thư nào | Pass |
| TC-018 | tài khoản có mật khẩu › gửi thư kèm đường dẫn đặt lại | Pass |
| TC-019 | tài khoản có mật khẩu › đổi được mật khẩu rồi đăng nhập bằng mật khẩu mới | Pass |
| TC-020 | tài khoản có mật khẩu › mã chỉ dùng được MỘT lần | Pass |
| TC-021 | tài khoản có mật khẩu › mã hết hạn thì từ chối | Pass |
| TC-022 | tài khoản có mật khẩu › mã bịa ra thì từ chối | Pass |
| TC-023 | tài khoản có mật khẩu › mật khẩu mới quá ngắn thì từ chối | Pass |
| TC-024 | tài khoản có mật khẩu › thiếu mã hoặc thiếu mật khẩu thì từ chối | Pass |
| TC-025 | tài khoản tạo bằng Google › không tạo mã đặt lại, vì tài khoản chưa từng có mật khẩu | Pass |
| TC-026 | tài khoản tạo bằng Google › vẫn gửi thư, nhưng chỉ đường về nút Google | Pass |
| TC-027 | chưa cấu hình gửi thư › báo 503 thay vì im lặng nuốt thư | Pass |
| TC-028 | mã băm không được lọt ra ngoài › phản hồi đăng nhập không chứa resetHash | Pass |
| TC-029 | mã băm không được lọt ra ngoài › database lưu BĂM chứ không lưu mã trong thư | Pass |

### user-providers.test.js

| Mã | Test case | Kết quả |
|---|---|---|
| TC-030 | tài khoản chưa gắn nhà cung cấp › hai người cùng đăng ký bằng mật khẩu mà không đụng nhau | Pass |
| TC-031 | tài khoản chưa gắn nhà cung cấp › năm người cũng không sao | Pass |
| TC-032 | tài khoản chưa gắn nhà cung cấp › trường phải VẮNG MẶT chứ không phải mang null | Pass |
| TC-033 | ràng buộc unique vẫn còn nguyên › hai tài khoản không được mang cùng một mã Google | Pass |
| TC-034 | ràng buộc unique vẫn còn nguyên › hai tài khoản không được mang cùng một mã Facebook | Pass |
| TC-035 | ràng buộc unique vẫn còn nguyên › cùng email vẫn bị chặn như cũ | Pass |
| TC-036 | mật khẩu › bắt buộc khi chưa gắn nhà cung cấp nào | Pass |
| TC-037 | mật khẩu › không bắt buộc khi đã có mã Google | Pass |

### bad-id.test.js

| Mã | Test case | Kết quả |
|---|---|---|
| TC-038 | mã tin sai định dạng › GET /pets/khong-phai-id trả 404 chứ không phải 500 | Pass |
| TC-039 | mã tin sai định dạng › GET /pets/123 trả 404 chứ không phải 500 | Pass |
| TC-040 | mã tin sai định dạng › GET /pets/abc def trả 404 chứ không phải 500 | Pass |
| TC-041 | mã tin sai định dạng › GET /pets/%20 trả 404 chứ không phải 500 | Pass |
| TC-042 | mã tin sai định dạng › GET /pets/null trả 404 chứ không phải 500 | Pass |
| TC-043 | mã tin sai định dạng › GET /pets/../../etc/passwd trả 404 chứ không phải 500 | Pass |
| TC-044 | mã tin sai định dạng › PUT /pets/khong-phai-id trả 404 chứ không phải 500 | Pass |
| TC-045 | mã tin sai định dạng › PUT /pets/123 trả 404 chứ không phải 500 | Pass |
| TC-046 | mã tin sai định dạng › PUT /pets/abc def trả 404 chứ không phải 500 | Pass |
| TC-047 | mã tin sai định dạng › PUT /pets/%20 trả 404 chứ không phải 500 | Pass |
| TC-048 | mã tin sai định dạng › PUT /pets/null trả 404 chứ không phải 500 | Pass |
| TC-049 | mã tin sai định dạng › PUT /pets/../../etc/passwd trả 404 chứ không phải 500 | Pass |
| TC-050 | mã tin sai định dạng › DELETE /pets/khong-phai-id trả 404 chứ không phải 500 | Pass |
| TC-051 | mã tin sai định dạng › DELETE /pets/123 trả 404 chứ không phải 500 | Pass |
| TC-052 | mã tin sai định dạng › DELETE /pets/abc def trả 404 chứ không phải 500 | Pass |
| TC-053 | mã tin sai định dạng › DELETE /pets/%20 trả 404 chứ không phải 500 | Pass |
| TC-054 | mã tin sai định dạng › DELETE /pets/null trả 404 chứ không phải 500 | Pass |
| TC-055 | mã tin sai định dạng › DELETE /pets/../../etc/passwd trả 404 chứ không phải 500 | Pass |
| TC-056 | mã đúng định dạng nhưng không có tin › vẫn là 404, không nhầm thành 500 | Pass |
| TC-057 | tin có thật vẫn đọc được bình thường › chốt chặn không chặn nhầm người ngay tình | Pass |

### push.test.js

| Mã | Test case | Kết quả |
|---|---|---|
| TC-058 | lưu mã thiết bị › bắt buộc đăng nhập | Pass |
| TC-059 | lưu mã thiết bị › từ chối mã sai định dạng | Pass |
| TC-060 | lưu mã thiết bị › lưu mã hợp lệ | Pass |
| TC-061 | lưu mã thiết bị › gửi cùng một mã nhiều lần vẫn chỉ lưu một dòng | Pass |
| TC-062 | lưu mã thiết bị › một người giữ được nhiều máy | Pass |
| TC-063 | lưu mã thiết bị › xoá được mã lúc đăng xuất | Pass |
| TC-064 | lưu mã thiết bị › mã thiết bị không lọt ra API nào | Pass |
| TC-065 | ai được nhận thông báo › báo cho chủ tin NGƯỢC LOẠI ở gần | Pass |
| TC-066 | ai được nhận thông báo › KHÔNG báo cho tin cùng loại | Pass |
| TC-067 | ai được nhận thông báo › KHÔNG báo cho tin khác loài | Pass |
| TC-068 | ai được nhận thông báo › KHÔNG báo cho tin ở quá xa | Pass |
| TC-069 | ai được nhận thông báo › KHÔNG tự báo cho chính người vừa đăng | Pass |
| TC-070 | ai được nhận thông báo › một tin của khách vãng lai ở gần không làm mất thông báo của người khác | Pass |
| TC-071 | ai được nhận thông báo › KHÔNG báo cho tin đã tìm được chủ | Pass |
| TC-072 | ai được nhận thông báo › KHÔNG báo cho tin đã quá cũ | Pass |
| TC-073 | ai được nhận thông báo › chặn trần số người nhận cho mỗi tin | Pass |
| TC-074 | ai được nhận thông báo › tin mới không có toạ độ thì không báo cho ai | Pass |
| TC-075 | ai được nhận thông báo › dịch vụ của Expo hỏng thì không làm hỏng luồng đăng tin | Pass |
| TC-076 | dọn mã thiết bị đã chết › tầng một: Expo báo DeviceNotRegistered ngay lúc gửi | Pass |
| TC-077 | dọn mã thiết bị đã chết › tầng hai: lỗi chỉ lộ ra trong biên nhận đọc sau | Pass |
| TC-078 | dọn mã thiết bị đã chết › biên nhận chưa có thì giữ lại, lần dọn sau đọc tiếp | Pass |
| TC-079 | dọn mã thiết bị đã chết › biên nhận báo ok thì xoá khỏi hàng chờ, giữ nguyên mã | Pass |

### Đăng ký và đăng nhập bằng mật khẩu

| Mã | Test case | Kết quả |
|---|---|---|
| TC-080 | POST /auth/register › tạo tài khoản và trả về token | Pass |
| TC-081 | POST /auth/register › không trả về mật khẩu đã băm | Pass |
| TC-082 | POST /auth/register › từ chối email trùng | Pass |
| TC-083 | POST /auth/register › từ chối mật khẩu quá ngắn | Pass |
| TC-084 | POST /auth/register › từ chối thiếu trường | Pass |
| TC-085 | POST /auth/login › đăng nhập đúng thì có token | Pass |
| TC-086 | POST /auth/login › sai mật khẩu trả 401 | Pass |
| TC-087 | POST /auth/login › email chưa đăng ký cũng trả 401 với cùng thông báo | Pass |
| TC-088 | GET /auth/me › trả về thông tin khi có token hợp lệ | Pass |
| TC-089 | GET /auth/me › không có token thì 401 | Pass |
| TC-090 | GET /auth/me › token rác thì 401 | Pass |

### Đăng nhập Google/Facebook và quy tắc gắn tài khoản

| Mã | Test case | Kết quả |
|---|---|---|
| TC-091 | POST /auth/google › tạo tài khoản mới khi chưa có gì trùng | Pass |
| TC-092 | POST /auth/google › tài khoản tạo kiểu này không có mật khẩu mà vẫn lưu được | Pass |
| TC-093 | POST /auth/google › lần đăng nhập thứ hai dùng lại tài khoản cũ, không tạo thêm | Pass |
| TC-094 | POST /auth/google › nhận ra người cũ kể cả khi họ đã đổi email ở Google | Pass |
| TC-095 | POST /auth/google › gắn vào tài khoản mật khẩu sẵn có khi email đã được xác minh | Pass |
| TC-096 | POST /auth/google › sau khi gắn thì vẫn đăng nhập được bằng mật khẩu như cũ | Pass |
| TC-097 | POST /auth/google › TỪ CHỐI gắn khi nhà cung cấp không xác minh email | Pass |
| TC-098 | POST /auth/google › cấp quyền admin nếu email nằm trong ADMIN_EMAILS | Pass |
| TC-099 | POST /auth/google › token nhà cung cấp hỏng thì trả 401, không tạo tài khoản | Pass |
| TC-100 | POST /auth/google › không bao giờ để lọt mã định danh hay mật khẩu ra response | Pass |
| TC-101 | POST /auth/google › trả 503 khi chưa cấu hình GOOGLE_CLIENT_ID | Pass |
| TC-102 | POST /auth/facebook › tạo tài khoản mới và lưu mã định danh Facebook | Pass |
| TC-103 | POST /auth/facebook › một người gắn được cả Google lẫn Facebook vào cùng tài khoản | Pass |
| TC-104 | POST /auth/facebook › trả 503 khi thiếu FACEBOOK_APP_SECRET | Pass |
| TC-105 | đăng nhập bằng mật khẩu khi tài khoản không có mật khẩu › trả 401 chứ không phải 500 | Pass |
| TC-106 | đăng nhập bằng mật khẩu khi tài khoản không có mật khẩu › vẫn dùng chung một thông báo với trường hợp sai mật khẩu | Pass |
| TC-107 | GET /auth/providers › cho front-end biết nên vẽ nút nào | Pass |
| TC-108 | GET /auth/providers › chìa nút Facebook ra khi FACEBOOK_PUBLIC=on | Pass |
| TC-109 | GET /auth/providers › vẫn ẩn nút khi bật nhưng chưa khai đủ khoá | Pass |
| TC-110 | GET /auth/providers › ẩn nút KHÔNG làm hỏng tính năng — endpoint vẫn chạy | Pass |
| TC-111 | GET /auth/providers › báo biến cho app mobile đã khai hay chưa | Pass |
| TC-112 | GET /auth/providers › không bao giờ trả về giá trị của mã, chỉ true/false | Pass |
| TC-113 | GET /auth/providers › báo false cho nhà cung cấp chưa cấu hình | Pass |

### Kiểm aud của ID token Google (web, iOS, Android)

| Mã | Test case | Kết quả |
|---|---|---|
| TC-114 | danh sách aud được chấp nhận › gửi xuống cả ba mã khi khai đủ | Pass |
| TC-115 | danh sách aud được chấp nhận › bỏ qua mã chưa khai, web vẫn chạy một mình | Pass |
| TC-116 | danh sách aud được chấp nhận › bỏ qua cả chuỗi rỗng chứ không chỉ biến thiếu hẳn | Pass |
| TC-117 | danh sách aud được chấp nhận › không hề gọi thư viện khi chưa khai mã nào | Pass |
| TC-118 | danh sách aud được chấp nhận › không bao giờ truyền undefined hay null xuống thư viện | Pass |
| TC-119 | danh sách aud được chấp nhận › báo đúng là lỗi cấu hình, không đổ cho token | Pass |
| TC-120 | danh sách aud được chấp nhận › vẫn chặn khi thiếu token, trước cả khi xét cấu hình | Pass |
| TC-121 | danh sách aud được chấp nhận › trả về hồ sơ đã chuẩn hoá khi token hợp lệ | Pass |

### Trang quản trị và phân quyền

| Mã | Test case | Kết quả |
|---|---|---|
| TC-122 | Phân quyền quản trị › chưa đăng nhập thì trả 401 | Pass |
| TC-123 | Phân quyền quản trị › người dùng thường trả 403 | Pass |
| TC-124 | Phân quyền quản trị › email trong ADMIN_EMAILS được cấp quyền admin | Pass |
| TC-125 | Phân quyền quản trị › không phân biệt hoa thường và khoảng trắng trong ADMIN_EMAILS | Pass |
| TC-126 | Phân quyền quản trị › nâng quyền ngay ở lần đăng nhập kế tiếp khi email được thêm vào danh sách | Pass |
| TC-127 | GET /admin/stats › đếm đúng theo loại và trạng thái | Pass |
| TC-128 | GET /admin/stats › không chia cho 0 khi chưa có tin nào | Pass |
| TC-129 | GET /admin/stats › xếp hạng khu vực nhiều tin nhất | Pass |
| TC-130 | GET /admin/pets › trả về mọi tin, mới nhất trước | Pass |
| TC-131 | GET /admin/pets › lọc theo loại và trạng thái | Pass |
| TC-132 | GET /admin/pets › tìm theo từ khoá, ký tự đặc biệt không làm vỡ truy vấn | Pass |
| TC-133 | DELETE /admin/pets/:petId › quản trị viên xoá được tin của người khác mà không cần mã | Pass |
| TC-134 | DELETE /admin/pets/:petId › người dùng thường không xoá được qua đường admin | Pass |
| TC-135 | DELETE /admin/pets/:petId › id sai định dạng trả 404 chứ không phải 500 | Pass |

### Danh sách tin của chính mình

| Mã | Test case | Kết quả |
|---|---|---|
| TC-136 | Tin gắn với tài khoản › đăng tin khi đã đăng nhập thì tin thuộc về mình | Pass |
| TC-137 | Tin gắn với tài khoản › chủ tin sửa được mà không cần mã xác nhận | Pass |
| TC-138 | Tin gắn với tài khoản › chủ tin xoá được mà không cần mã xác nhận | Pass |
| TC-139 | Tin gắn với tài khoản › người khác không sửa được tin của mình | Pass |
| TC-140 | Tin gắn với tài khoản › khách vãng lai không sửa được tin đã có chủ | Pass |
| TC-141 | Tin gắn với tài khoản › chỉ thấy tin của mình, không thấy tin người khác | Pass |
| TC-142 | Tin gắn với tài khoản › chưa đăng nhập thì /pets/mine trả 401 | Pass |
| TC-143 | Tin gắn với tài khoản › khách vãng lai đăng tin thì vẫn dùng mã xác nhận như cũ | Pass |
| TC-144 | Tin gắn với tài khoản › danh sách chung vẫn hiện tin của mọi người | Pass |

### Đặc điểm nhận dạng giữ kín

| Mã | Test case | Kết quả |
|---|---|---|
| TC-145 | Đặc điểm bí mật › người xem tin không thấy đặc điểm bí mật | Pass |
| TC-146 | Đặc điểm bí mật › không lọt ra ở danh sách chung | Pass |
| TC-147 | Đặc điểm bí mật › không lọt ra ngay khi vừa tạo tin | Pass |
| TC-148 | Đặc điểm bí mật › chủ tin đăng nhập thì đọc được | Pass |
| TC-149 | Đặc điểm bí mật › người cầm mã xác nhận thì đọc được | Pass |
| TC-150 | Đặc điểm bí mật › mã sai thì không đọc được | Pass |
| TC-151 | Đặc điểm bí mật › tài khoản khác không đọc được | Pass |
| TC-152 | Đặc điểm bí mật › chủ tin sửa được đặc điểm bí mật | Pass |
| TC-153 | Đặc điểm bí mật › bản băm mã xác nhận vẫn không bao giờ lọt ra | Pass |

### Chặn tần suất gọi API

| Mã | Test case | Kết quả |
|---|---|---|
| TC-154 | Giới hạn tần suất › chặn khi gọi AI quá nhiều lần trong thời gian ngắn | Pass |
| TC-155 | Giới hạn tần suất › trả kèm Retry-After để client biết chờ bao lâu | Pass |
| TC-156 | Giới hạn tần suất › mỗi endpoint đếm riêng, chặn chat không chặn luôn match | Pass |
| TC-157 | Giới hạn tần suất › chặn tạo tài khoản hàng loạt | Pass |

### Giới hạn nguồn gọi API (CORS)

| Mã | Test case | Kết quả |
|---|---|---|
| TC-158 | CORS › cho qua domain nằm trong FRONTEND_URL | Pass |
| TC-159 | CORS › chặn domain lạ | Pass |
| TC-160 | CORS › request không có Origin vẫn chạy bình thường | Pass |
| TC-161 | CORS › không lộ header x-powered-by | Pass |

### Xử lý lỗi toàn cục

| Mã | Test case | Kết quả |
|---|---|---|
| TC-162 | Ảnh vượt giới hạn dung lượng › trả 413 thay vì 500 | Pass |
| TC-163 | Ảnh vượt giới hạn dung lượng › trả JSON chứ không phải trang HTML | Pass |
| TC-164 | Ảnh vượt giới hạn dung lượng › không lộ dấu vết ngăn xếp hay đường dẫn máy chủ | Pass |
| TC-165 | Tệp không phải ảnh › trả 400 kèm JSON | Pass |
| TC-166 | Domain không được phép › trả 403 kèm JSON chứ không phải 500 | Pass |
| TC-167 | Domain không được phép › domain hợp lệ vẫn đi qua bình thường | Pass |

### Tạo, đọc, sửa, xoá tin đăng

| Mã | Test case | Kết quả |
|---|---|---|
| TC-168 | GET /pets › trả về { pets, total } | Pass |
| TC-169 | GET /pets › total = 0 khi chưa có data | Pass |
| TC-170 | POST /pets › trả về 400 nếu thiếu field bắt buộc | Pass |
| TC-171 | POST /pets › tạo pet thành công | Pass |
| TC-172 | GET /pets/:petId › trả về 404 nếu không tồn tại | Pass |
| TC-173 | GET /pets/:petId › trả về pet đúng nếu tồn tại | Pass |
| TC-174 | PUT /pets/:petId › cập nhật resolved thành công | Pass |
| TC-175 | DELETE /pets/:petId › xóa pet thành công | Pass |
| TC-176 | Mã xác nhận › trả về claimCode một lần khi tạo tin | Pass |
| TC-177 | Mã xác nhận › không đọc lại được claimCode qua GET | Pass |
| TC-178 | Mã xác nhận › từ chối sửa khi không có mã | Pass |
| TC-179 | Mã xác nhận › từ chối xoá khi mã sai | Pass |
| TC-180 | Mã xác nhận › tin cũ chưa có mã thì vẫn sửa được | Pass |
| TC-181 | Tham số lọc không hợp lệ › không làm sập server với days=abc (chữ thay vì số) | Pass |
| TC-182 | Tham số lọc không hợp lệ › không làm sập server với days=999999999 (số quá lớn) | Pass |
| TC-183 | Tham số lọc không hợp lệ › không làm sập server với days=-5 (số âm) | Pass |
| TC-184 | Tham số lọc không hợp lệ › không làm sập server với skip=-5 (skip âm) | Pass |
| TC-185 | Tham số lọc không hợp lệ › không làm sập server với limit=-3 (limit âm) | Pass |
| TC-186 | Tham số lọc không hợp lệ › không làm sập server với limit=abc (limit là chữ) | Pass |
| TC-187 | Tham số lọc không hợp lệ › limit vẫn bị chặn ở 50 | Pass |
| TC-188 | Giới hạn file khi đăng tin › từ chối file không phải ảnh | Pass |
| TC-189 | Chỉ sửa được những trường cho phép › không đổi được chủ sở hữu qua PUT | Pass |
| TC-190 | Chỉ sửa được những trường cho phép › không đổi được claimHash, tránh chiếm quyền tin của người khác | Pass |
| TC-191 | Chỉ sửa được những trường cho phép › không đổi được postId | Pass |
| TC-192 | Chỉ sửa được những trường cho phép › không đổi được ngày đăng để nhảy lên đầu danh sách | Pass |
| TC-193 | Chỉ sửa được những trường cho phép › vẫn sửa được những trường bình thường | Pass |

### Toạ độ và làm nhiễu vị trí

| Mã | Test case | Kết quả |
|---|---|---|
| TC-194 | Toạ độ trên bản đồ › lưu được toạ độ khi đăng tin | Pass |
| TC-195 | Toạ độ trên bản đồ › không có toạ độ thì để null, tin vẫn đăng được | Pass |
| TC-196 | Toạ độ trên bản đồ › bỏ qua toạ độ không phải số thay vì làm hỏng bản ghi | Pass |
| TC-197 | Toạ độ trên bản đồ › bỏ qua toạ độ ngoài khoảng hợp lệ | Pass |
| TC-198 | Toạ độ trên bản đồ › chỉ có một trong hai thì bỏ cả hai | Pass |
| TC-199 | Toạ độ trên bản đồ › sửa được toạ độ của tin đã đăng | Pass |
| TC-200 | Toạ độ trên bản đồ › toạ độ rác khi sửa thì bị bỏ qua, các trường khác vẫn lưu | Pass |
| TC-201 | Toạ độ trên bản đồ › toạ độ hiện trong danh sách chung để vẽ lên bản đồ | Pass |
| TC-202 | Xoá vị trí › gửi null thì xoá hẳn chứ không thành toạ độ 0,0 | Pass |
| TC-203 | Xoá vị trí › đăng tin không chọn vị trí, form gửi chuỗi "null" cũng ra null | Pass |
| TC-204 | Làm mờ toạ độ › không lưu toạ độ chính xác, làm tròn về lưới 0,005 độ | Pass |
| TC-205 | Làm mờ toạ độ › điểm sau khi làm mờ vẫn nằm trong khoảng 600m so với điểm gốc | Pass |
| TC-206 | Làm mờ toạ độ › hai tin đăng ở hai điểm cách nhau vài chục mét thì trùng vị trí | Pass |

### Bản đồ và gom nhóm ghim

| Mã | Test case | Kết quả |
|---|---|---|
| TC-207 | GET /pets/map › chỉ trả về tin đã ghim vị trí | Pass |
| TC-208 | GET /pets/map › đếm riêng số tin khớp bộ lọc nhưng thiếu toạ độ | Pass |
| TC-209 | GET /pets/map › không nhầm "map" thành mã tin của GET /pets/:petId | Pass |
| TC-210 | GET /pets/map › bộ lọc loại tin vẫn chặn như ở danh sách | Pass |
| TC-211 | GET /pets/map › bộ lọc loài và khu vực vẫn chặn như ở danh sách | Pass |
| TC-212 | GET /pets/map › bộ lọc số ngày vẫn chặn như ở danh sách | Pass |
| TC-213 | GET /pets/map › chỉ gửi những trường bản đồ vẽ ra, không gửi kèm mô tả hay liên hệ | Pass |
| TC-214 | GET /pets/map › không bao giờ để lọt vector hay bí mật của tin | Pass |
| TC-215 | GET /pets/map › báo capped = false khi còn xa ngưỡng 500 tin | Pass |
| TC-216 | GET /pets/map › khi có ô tìm kiếm › lọc theo nghĩa rồi mới bỏ tin thiếu toạ độ | Pass |
| TC-217 | GET /pets/map › khi có ô tìm kiếm › bộ lọc cứng vẫn chặn trước cả khi xếp hạng | Pass |
| TC-218 | GET /pets/map › khi có ô tìm kiếm › nhúng hỏng thì lui về khớp nguyên văn, không trả danh sách xếp bừa | Pass |

### Ảnh tin đăng và đường lui khi ảnh hỏng

| Mã | Test case | Kết quả |
|---|---|---|
| TC-219 | Đăng tin kèm ảnh › lưu cả URL và public_id của ảnh | Pass |
| TC-220 | Đăng tin kèm ảnh › không trả public_id ra ngoài, đó là chi tiết nội bộ | Pass |
| TC-221 | Đổi ảnh khi sửa tin › thay URL ảnh bằng ảnh mới vừa tải lên | Pass |
| TC-222 | Đổi ảnh khi sửa tin › xoá ảnh cũ trên Cloudinary để không bỏ lại file rác | Pass |
| TC-223 | Đổi ảnh khi sửa tin › vẫn sửa được các trường khác trong cùng lượt đổi ảnh | Pass |
| TC-224 | Đổi ảnh khi sửa tin › sửa tin mà không đụng tới ảnh thì giữ nguyên ảnh cũ | Pass |
| TC-225 | Đổi ảnh khi sửa tin › ảnh vượt 5MB nhận 413 kèm JSON chứ không phải 500 | Pass |
| TC-226 | Đổi ảnh khi sửa tin › tệp không phải ảnh bị từ chối | Pass |
| TC-227 | Đổi ảnh khi sửa tin › sai mã xác nhận thì không đổi được ảnh | Pass |
| TC-228 | Xoá ảnh khỏi tin › removeImage làm trống ảnh và dọn file trên Cloudinary | Pass |
| TC-229 | Xoá ảnh khỏi tin › nhận cả boolean khi gửi JSON | Pass |
| TC-230 | Xoá ảnh khỏi tin › tin vốn không có ảnh thì không gọi xoá vô ích | Pass |
| TC-231 | Xoá ảnh khỏi tin › có ảnh mới thì ưu tiên ảnh mới, bỏ qua removeImage | Pass |
| TC-232 | Ảnh không đổi được bằng cách gửi URL › bỏ qua trường image dạng chuỗi trong body | Pass |
| TC-233 | Ảnh không đổi được bằng cách gửi URL › bỏ qua cả imageId gửi kèm, tránh dọn mất ảnh của tin khác | Pass |
| TC-234 | Tin cũ chỉ có URL, chưa có public_id › moi public_id từ URL ra để vẫn dọn được ảnh cũ | Pass |
| TC-235 | Tin cũ chỉ có URL, chưa có public_id › URL lạ không phải của Cloudinary thì bỏ qua, không gọi xoá bừa | Pass |
| TC-236 | Xoá tin › dọn luôn ảnh của tin đó | Pass |
| TC-237 | Cloudinary lỗi › trả 502 với lời nhắn rõ ràng, không phải Server error chung chung | Pass |
| TC-238 | Cloudinary lỗi › ảnh cũ không bị xoá khi ảnh mới chưa lên được | Pass |

### Báo cáo tin xấu

| Mã | Test case | Kết quả |
|---|---|---|
| TC-239 | POST /pets/:petId/report › ai cũng gửi được, không cần đăng nhập | Pass |
| TC-240 | POST /pets/:petId/report › lưu được cả ghi chú kèm theo | Pass |
| TC-241 | POST /pets/:petId/report › từ chối lý do không có trong danh sách | Pass |
| TC-242 | POST /pets/:petId/report › từ chối báo cáo thiếu lý do | Pass |
| TC-243 | POST /pets/:petId/report › trả 404 cho tin không tồn tại, không tạo báo cáo mồ côi | Pass |
| TC-244 | POST /pets/:petId/report › trả 404 khi id sai định dạng thay vì ném lỗi ép kiểu | Pass |
| TC-245 | POST /pets/:petId/report › cắt ghi chú quá dài thay vì từ chối cả báo cáo | Pass |
| TC-246 | POST /pets/:petId/report › không nói cho người gửi biết tin đã bị báo cáo bao nhiêu lần | Pass |
| TC-247 | POST /pets/:petId/report › một người báo cáo được nhiều tin khác nhau | Pass |
| TC-248 | POST /pets/:petId/report › chặn tần suất tính chung mọi tin, không phải mỗi tin một hạn mức | Pass |
| TC-249 | hàng chờ báo cáo ở trang quản trị › khách vãng lai không xem được | Pass |
| TC-250 | hàng chờ báo cáo ở trang quản trị › quản trị viên xem được, kèm thông tin tin bị báo cáo | Pass |
| TC-251 | hàng chờ báo cáo ở trang quản trị › bỏ qua một báo cáo thì tin vẫn còn nguyên | Pass |
| TC-252 | hàng chờ báo cáo ở trang quản trị › xoá tin thì mọi báo cáo về tin đó biến mất theo | Pass |
| TC-253 | hàng chờ báo cáo ở trang quản trị › xoá tin cũng dọn luôn ảnh trên Cloudinary | Pass |
| TC-254 | hàng chờ báo cáo ở trang quản trị › báo cáo của tin đã bị chủ tin tự xoá vẫn hiện, không làm sập hàng chờ | Pass |
| TC-255 | hàng chờ báo cáo ở trang quản trị › số báo cáo chờ xử lý hiện trong thống kê | Pass |
| TC-256 | hàng chờ báo cáo ở trang quản trị › bỏ qua báo cáo không tồn tại trả 404 | Pass |
| TC-257 | hàng chờ báo cáo ở trang quản trị › không có quy tắc nào tự ẩn tin theo số lượt báo cáo | Pass |

### Tự động xoá tin đã giải quyết

| Mã | Test case | Kết quả |
|---|---|---|
| TC-258 | Quyền gọi đợt dọn dẹp › mã cron đúng thì chạy được dù không đăng nhập | Pass |
| TC-259 | Quyền gọi đợt dọn dẹp › mã cron sai trả 401 | Pass |
| TC-260 | Quyền gọi đợt dọn dẹp › không gửi mã và không đăng nhập thì trả 401 | Pass |
| TC-261 | Quyền gọi đợt dọn dẹp › người dùng thường trả 403 | Pass |
| TC-262 | Quyền gọi đợt dọn dẹp › quản trị viên bấm tay thì chạy được, không cần mã cron | Pass |
| TC-263 | Quyền gọi đợt dọn dẹp › chưa đặt CLEANUP_TOKEN thì đường vào bằng mã đóng hẳn | Pass |
| TC-264 | Chọn tin để xoá › xoá tin đã đoàn tụ quá hạn giữ lại | Pass |
| TC-265 | Chọn tin để xoá › giữ lại tin đoàn tụ còn trong hạn | Pass |
| TC-266 | Chọn tin để xoá › không đụng tới tin chưa đoàn tụ dù đăng đã rất lâu | Pass |
| TC-267 | Chọn tin để xoá › tin đoàn tụ cũ chưa có mốc thời gian thì được đóng dấu, không xoá ngay | Pass |
| TC-268 | Chọn tin để xoá › đổi CLEANUP_AFTER_DAYS thì đổi theo hạn giữ lại | Pass |
| TC-269 | Chọn tin để xoá › giá trị CLEANUP_AFTER_DAYS vô nghĩa thì quay về mặc định 30 ngày | Pass |
| TC-270 | Chọn tin để xoá › xoá nhiều tin trong một lượt và bỏ qua tin không đủ điều kiện | Pass |
| TC-271 | Dọn ảnh kèm theo › xoá tin thì xoá luôn ảnh trên Cloudinary theo imageId | Pass |
| TC-272 | Dọn ảnh kèm theo › tin cũ chỉ có URL vẫn moi được public_id để xoá ảnh | Pass |
| TC-273 | Dọn ảnh kèm theo › tin không có ảnh thì không gọi Cloudinary | Pass |
| TC-274 | Dọn ảnh kèm theo › Cloudinary lỗi thì tin vẫn xoá xong, đợt dọn không thất bại | Pass |
| TC-275 | Đồng hồ đếm ngược resolvedAt › bấm "đã tìm thấy" thì đóng dấu thời điểm | Pass |
| TC-276 | Đồng hồ đếm ngược resolvedAt › bỏ đánh dấu đoàn tụ thì đồng hồ dừng lại | Pass |
| TC-277 | Đồng hồ đếm ngược resolvedAt › gửi chuỗi "false" qua form vẫn hiểu là bỏ đoàn tụ | Pass |
| TC-278 | Đồng hồ đếm ngược resolvedAt › sửa nội dung tin đã đoàn tụ không đẩy lùi hạn xoá | Pass |
| TC-279 | Đồng hồ đếm ngược resolvedAt › client không tự đặt được resolvedAt để né đợt dọn | Pass |
| TC-280 | Thống kê báo trước số tin sắp bị xoá › đếm đúng số tin đã quá hạn | Pass |

### Phân tích ảnh bằng AI

| Mã | Test case | Kết quả |
|---|---|---|
| TC-281 | POST /ai/analyze-image › trả về 503 khi chưa cấu hình GEMINI_API_KEY | Pass |
| TC-282 | POST /ai/analyze-image › trả về 400 khi không gửi ảnh | Pass |
| TC-283 | POST /ai/analyze-image › trả về 400 khi file không phải ảnh | Pass |
| TC-284 | GET /ai/match/:petId › trả về 503 khi chưa cấu hình GEMINI_API_KEY | Pass |
| TC-285 | Timeout khi AI quá chậm › trả 504 thay vì treo tới khi proxy cắt | Pass |

### So khớp Lost↔Found đầu-cuối

| Mã | Test case | Kết quả |
|---|---|---|
| TC-286 | GET /ai/match/:petId — các tình huống hỏng › id sai định dạng trả 404 chứ không phải 500 | Pass |
| TC-287 | GET /ai/match/:petId — các tình huống hỏng › id đúng định dạng nhưng không tồn tại trả 404 | Pass |
| TC-288 | GET /ai/match/:petId — các tình huống hỏng › không có ứng viên nào thì trả mảng rỗng chứ không lỗi | Pass |
| TC-289 | GET /ai/match/:petId — các tình huống hỏng › ảnh tải không được thì vẫn đối chiếu bằng mô tả | Pass |
| TC-290 | GET /ai/match/:petId — các tình huống hỏng › Gemini từ chối vì ảnh thì thử lại bằng chữ và vẫn trả kết quả | Pass |
| TC-291 | GET /ai/match/:petId — các tình huống hỏng › bỏ qua ứng viên AI chấm dưới ngưỡng | Pass |
| TC-292 | GET /ai/match/:petId — các tình huống hỏng › bỏ qua index AI bịa ra ngoài danh sách ứng viên | Pass |
| TC-293 | GET /ai/match/:petId — các tình huống hỏng › AI trả về chuỗi không phải JSON thì báo 502 chứ không sập | Pass |
| TC-294 | GET /ai/match/:petId — các tình huống hỏng › cả hai lần gọi đều hỏng thì trả 500 có thông báo | Pass |
| TC-295 | GET /ai/match/:petId — các tình huống hỏng › AI quá chậm thì trả 504 | Pass |
| TC-296 | GET /ai/match/:petId — câu giải thích › nêu đủ cả hai vế của trường khác nhau | Pass |
| TC-297 | GET /ai/match/:petId — câu giải thích › KHÔNG nói hai màu khác nhau là giống nhau | Pass |
| TC-298 | GET /ai/match/:petId — câu giải thích › bỏ qua hoàn toàn chữ model cố tình nhét vào | Pass |
| TC-299 | GET /ai/match/:petId — câu giải thích › gộp các trường thật sự giống nhau | Pass |
| TC-300 | GET /ai/match/:petId — câu giải thích › nói rõ khoảng cách ngày giữa hai tin | Pass |
| TC-301 | GET /ai/match/:petId — câu giải thích › không nhắc tới ảnh khi model trả khong_ro | Pass |
| TC-302 | GET /ai/match/:petId — câu giải thích › không sập khi model trả giá trị ảnh lạ | Pass |

### Tầng truy hồi ứng viên so khớp

| Mã | Test case | Kết quả |
|---|---|---|
| TC-303 | oppositeType › đổi lost thành found và ngược lại | Pass |
| TC-304 | candidateFilter › chỉ nhận tin ngược loại, cùng loài, chưa giải quyết | Pass |
| TC-305 | findCandidates › loại tin cùng loại, khác loài, đã giải quyết và quá cũ | Pass |
| TC-306 | findCandidates › xếp theo độ giống chứ không theo ngày khi tin gốc có vector | Pass |
| TC-307 | findCandidates › rơi về xếp theo ngày khi tin gốc chưa có vector | Pass |
| TC-308 | findCandidates › đẩy tin chưa nhúng xuống cuối thay vì bỏ hẳn | Pass |
| TC-309 | findCandidates › cắt đúng số lượng yêu cầu | Pass |

### Tìm kiếm theo nghĩa

| Mã | Test case | Kết quả |
|---|---|---|
| TC-310 | Xếp hạng theo nghĩa › tin gần câu hỏi nhất đứng đầu | Pass |
| TC-311 | Xếp hạng theo nghĩa › đổi câu hỏi thì đổi thứ tự | Pass |
| TC-312 | Xếp hạng theo nghĩa › trả về mọi tin chứ không cắt theo ngưỡng điểm | Pass |
| TC-313 | Xếp hạng theo nghĩa › không có câu hỏi thì vẫn sắp theo ngày như cũ | Pass |
| TC-314 | Khớp nguyên văn luôn đứng trên › gõ mã tin thì ra đúng tin đó dù điểm ngữ nghĩa bằng 0 | Pass |
| TC-315 | Khớp nguyên văn luôn đứng trên › khớp chữ trong mô tả cũng được ưu tiên | Pass |
| TC-316 | Khớp nguyên văn luôn đứng trên › không phân biệt hoa thường | Pass |
| TC-317 | Bộ lọc cứng vẫn chặn trước › lọc loài thì câu hỏi không kéo tin loài khác vào | Pass |
| TC-318 | Bộ lọc cứng vẫn chặn trước › lọc loại tin vẫn áp dụng | Pass |
| TC-319 | Bộ lọc cứng vẫn chặn trước › phân trang chạy trên kết quả đã xếp hạng | Pass |
| TC-320 | Khi nhúng hỏng › nhúng câu hỏi thất bại thì lui về lọc theo chữ | Pass |
| TC-321 | Khi nhúng hỏng › nhúng hỏng và không khớp chữ nào thì trả danh sách rỗng, không xếp bừa | Pass |
| TC-322 | Khi nhúng hỏng › tin chưa kịp nhúng vẫn hiện, chỉ là xếp sau | Pass |
| TC-323 | Vector không lọt ra ngoài API › danh sách không kèm embedding | Pass |
| TC-324 | Vector không lọt ra ngoài API › danh sách không có câu hỏi cũng không kèm embedding | Pass |
| TC-325 | Vector không lọt ra ngoài API › xem chi tiết tin không kèm embedding | Pass |
| TC-326 | Nhúng ngầm lúc đăng và sửa tin › đăng tin xong thì nhúng chạy ngầm | Pass |
| TC-327 | Nhúng ngầm lúc đăng và sửa tin › nhúng hỏng thì tin vẫn đăng được bình thường | Pass |
| TC-328 | Nhúng ngầm lúc đăng và sửa tin › sửa mô tả thì nhúng lại | Pass |
| TC-329 | Nhúng ngầm lúc đăng và sửa tin › bấm "đã tìm thấy" thì KHÔNG nhúng lại, khỏi đốt quota | Pass |
| TC-330 | Câu hỏi bất thường › câu hỏi toàn khoảng trắng thì coi như không tìm | Pass |
| TC-331 | Câu hỏi bất thường › câu hỏi dài quá bị cắt chứ không làm sập server | Pass |

### Tái xếp hạng kết quả tìm kiếm

| Mã | Test case | Kết quả |
|---|---|---|
| TC-332 | shouldRerank › bỏ qua câu quá ngắn — tra từ khoá thì vector đã đủ | Pass |
| TC-333 | shouldRerank › nhận câu đủ dài để coi là mô tả | Pass |
| TC-334 | shouldRerank › tắt hẳn khi SEARCH_RERANK không phải on | Pass |
| TC-335 | shouldRerank › mặc định tắt khi không khai biến | Pass |
| TC-336 | rerank › sắp lại theo điểm model chấm | Pass |
| TC-337 | rerank › không bao giờ làm mất tin, kể cả tin bị chấm 0 điểm | Pass |
| TC-338 | rerank › giữ nguyên thứ tự cũ cho tin model quên chấm | Pass |
| TC-339 | rerank › trả nguyên thứ tự cũ khi model hỏng | Pass |
| TC-340 | rerank › trả nguyên thứ tự cũ khi model trả rác | Pass |
| TC-341 | rerank › không gọi model khi chỉ có một tin | Pass |

### Trợ lý hỗ trợ kỹ thuật

| Mã | Test case | Kết quả |
|---|---|---|
| TC-342 | POST /ai/chat › trả 503 khi chưa cấu hình GEMINI_API_KEY | Pass |
| TC-343 | POST /ai/chat › trả lời khi hỏi bình thường | Pass |
| TC-344 | POST /ai/chat › gửi cả hội thoại trước đó để trợ lý hiểu ngữ cảnh | Pass |
| TC-345 | POST /ai/chat › từ chối khi không có nội dung | Pass |
| TC-346 | POST /ai/chat › từ chối khi messages không phải mảng | Pass |
| TC-347 | POST /ai/chat › từ chối hội thoại quá dài | Pass |
| TC-348 | POST /ai/chat › từ chối tin nhắn quá dài | Pass |
| TC-349 | POST /ai/chat › bỏ qua tin nhắn rỗng, chỉ toàn rỗng thì báo lỗi | Pass |
| TC-350 | POST /ai/chat › trả 502 khi trợ lý trả về chuỗi rỗng | Pass |
| TC-351 | POST /ai/chat › trả 504 khi trợ lý quá chậm | Pass |
| TC-352 | POST /ai/chat › trả 500 kèm thông báo khi dịch vụ hỏng | Pass |

