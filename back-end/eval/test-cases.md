# Bảng test case chức năng — back-end LostPets

Chạy ngày 2026-11-02 · sinh tự động bởi `npm run test:report`

## Tổng hợp

| | |
|---|---|
| Tổng số test case | 261 |
| Pass | 261 |
| Fail | 0 |
| Tỉ lệ pass | **100%** |
| Tiêu chí Objective 4 | ≥ 90% |
| Kết luận | **Đạt** |

Môi trường: Jest 21 bộ test, cơ sở dữ liệu tạm trong bộ nhớ (mongodb-memory-server), không gọi mạng ra ngoài.

## Theo nhóm chức năng

| Nhóm | Mục tiêu | Số case | Pass | Fail |
|---|---|---|---|---|
| Đăng ký và đăng nhập bằng mật khẩu | Obj 2 | 11 | 11 | 0 |
| Đăng nhập Google/Facebook và quy tắc gắn tài khoản | Obj 2 | 18 | 18 | 0 |
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
| So khớp Lost↔Found đầu-cuối | Obj 3 | 10 | 10 | 0 |
| Tầng truy hồi ứng viên so khớp | Obj 3 | 7 | 7 | 0 |
| Tìm kiếm theo nghĩa | Obj 4 | 22 | 22 | 0 |
| Tái xếp hạng kết quả tìm kiếm | Obj 4 / B07 | 10 | 10 | 0 |
| Trợ lý hỗ trợ kỹ thuật | Could-Have | 11 | 11 | 0 |

## Chi tiết từng test case

### Đăng ký và đăng nhập bằng mật khẩu

| Mã | Test case | Kết quả |
|---|---|---|
| TC-001 | POST /auth/register › tạo tài khoản và trả về token | Pass |
| TC-002 | POST /auth/register › không trả về mật khẩu đã băm | Pass |
| TC-003 | POST /auth/register › từ chối email trùng | Pass |
| TC-004 | POST /auth/register › từ chối mật khẩu quá ngắn | Pass |
| TC-005 | POST /auth/register › từ chối thiếu trường | Pass |
| TC-006 | POST /auth/login › đăng nhập đúng thì có token | Pass |
| TC-007 | POST /auth/login › sai mật khẩu trả 401 | Pass |
| TC-008 | POST /auth/login › email chưa đăng ký cũng trả 401 với cùng thông báo | Pass |
| TC-009 | GET /auth/me › trả về thông tin khi có token hợp lệ | Pass |
| TC-010 | GET /auth/me › không có token thì 401 | Pass |
| TC-011 | GET /auth/me › token rác thì 401 | Pass |

### Đăng nhập Google/Facebook và quy tắc gắn tài khoản

| Mã | Test case | Kết quả |
|---|---|---|
| TC-012 | POST /auth/google › tạo tài khoản mới khi chưa có gì trùng | Pass |
| TC-013 | POST /auth/google › tài khoản tạo kiểu này không có mật khẩu mà vẫn lưu được | Pass |
| TC-014 | POST /auth/google › lần đăng nhập thứ hai dùng lại tài khoản cũ, không tạo thêm | Pass |
| TC-015 | POST /auth/google › nhận ra người cũ kể cả khi họ đã đổi email ở Google | Pass |
| TC-016 | POST /auth/google › gắn vào tài khoản mật khẩu sẵn có khi email đã được xác minh | Pass |
| TC-017 | POST /auth/google › sau khi gắn thì vẫn đăng nhập được bằng mật khẩu như cũ | Pass |
| TC-018 | POST /auth/google › TỪ CHỐI gắn khi nhà cung cấp không xác minh email | Pass |
| TC-019 | POST /auth/google › cấp quyền admin nếu email nằm trong ADMIN_EMAILS | Pass |
| TC-020 | POST /auth/google › token nhà cung cấp hỏng thì trả 401, không tạo tài khoản | Pass |
| TC-021 | POST /auth/google › không bao giờ để lọt mã định danh hay mật khẩu ra response | Pass |
| TC-022 | POST /auth/google › trả 503 khi chưa cấu hình GOOGLE_CLIENT_ID | Pass |
| TC-023 | POST /auth/facebook › tạo tài khoản mới và lưu mã định danh Facebook | Pass |
| TC-024 | POST /auth/facebook › một người gắn được cả Google lẫn Facebook vào cùng tài khoản | Pass |
| TC-025 | POST /auth/facebook › trả 503 khi thiếu FACEBOOK_APP_SECRET | Pass |
| TC-026 | đăng nhập bằng mật khẩu khi tài khoản không có mật khẩu › trả 401 chứ không phải 500 | Pass |
| TC-027 | đăng nhập bằng mật khẩu khi tài khoản không có mật khẩu › vẫn dùng chung một thông báo với trường hợp sai mật khẩu | Pass |
| TC-028 | GET /auth/providers › cho front-end biết nên vẽ nút nào | Pass |
| TC-029 | GET /auth/providers › báo false cho nhà cung cấp chưa cấu hình | Pass |

### Kiểm aud của ID token Google (web, iOS, Android)

| Mã | Test case | Kết quả |
|---|---|---|
| TC-030 | danh sách aud được chấp nhận › gửi xuống cả ba mã khi khai đủ | Pass |
| TC-031 | danh sách aud được chấp nhận › bỏ qua mã chưa khai, web vẫn chạy một mình | Pass |
| TC-032 | danh sách aud được chấp nhận › bỏ qua cả chuỗi rỗng chứ không chỉ biến thiếu hẳn | Pass |
| TC-033 | danh sách aud được chấp nhận › không hề gọi thư viện khi chưa khai mã nào | Pass |
| TC-034 | danh sách aud được chấp nhận › không bao giờ truyền undefined hay null xuống thư viện | Pass |
| TC-035 | danh sách aud được chấp nhận › báo đúng là lỗi cấu hình, không đổ cho token | Pass |
| TC-036 | danh sách aud được chấp nhận › vẫn chặn khi thiếu token, trước cả khi xét cấu hình | Pass |
| TC-037 | danh sách aud được chấp nhận › trả về hồ sơ đã chuẩn hoá khi token hợp lệ | Pass |

### Trang quản trị và phân quyền

| Mã | Test case | Kết quả |
|---|---|---|
| TC-038 | Phân quyền quản trị › chưa đăng nhập thì trả 401 | Pass |
| TC-039 | Phân quyền quản trị › người dùng thường trả 403 | Pass |
| TC-040 | Phân quyền quản trị › email trong ADMIN_EMAILS được cấp quyền admin | Pass |
| TC-041 | Phân quyền quản trị › không phân biệt hoa thường và khoảng trắng trong ADMIN_EMAILS | Pass |
| TC-042 | Phân quyền quản trị › nâng quyền ngay ở lần đăng nhập kế tiếp khi email được thêm vào danh sách | Pass |
| TC-043 | GET /admin/stats › đếm đúng theo loại và trạng thái | Pass |
| TC-044 | GET /admin/stats › không chia cho 0 khi chưa có tin nào | Pass |
| TC-045 | GET /admin/stats › xếp hạng khu vực nhiều tin nhất | Pass |
| TC-046 | GET /admin/pets › trả về mọi tin, mới nhất trước | Pass |
| TC-047 | GET /admin/pets › lọc theo loại và trạng thái | Pass |
| TC-048 | GET /admin/pets › tìm theo từ khoá, ký tự đặc biệt không làm vỡ truy vấn | Pass |
| TC-049 | DELETE /admin/pets/:petId › quản trị viên xoá được tin của người khác mà không cần mã | Pass |
| TC-050 | DELETE /admin/pets/:petId › người dùng thường không xoá được qua đường admin | Pass |
| TC-051 | DELETE /admin/pets/:petId › id sai định dạng trả 404 chứ không phải 500 | Pass |

### Danh sách tin của chính mình

| Mã | Test case | Kết quả |
|---|---|---|
| TC-052 | Tin gắn với tài khoản › đăng tin khi đã đăng nhập thì tin thuộc về mình | Pass |
| TC-053 | Tin gắn với tài khoản › chủ tin sửa được mà không cần mã xác nhận | Pass |
| TC-054 | Tin gắn với tài khoản › chủ tin xoá được mà không cần mã xác nhận | Pass |
| TC-055 | Tin gắn với tài khoản › người khác không sửa được tin của mình | Pass |
| TC-056 | Tin gắn với tài khoản › khách vãng lai không sửa được tin đã có chủ | Pass |
| TC-057 | Tin gắn với tài khoản › chỉ thấy tin của mình, không thấy tin người khác | Pass |
| TC-058 | Tin gắn với tài khoản › chưa đăng nhập thì /pets/mine trả 401 | Pass |
| TC-059 | Tin gắn với tài khoản › khách vãng lai đăng tin thì vẫn dùng mã xác nhận như cũ | Pass |
| TC-060 | Tin gắn với tài khoản › danh sách chung vẫn hiện tin của mọi người | Pass |

### Đặc điểm nhận dạng giữ kín

| Mã | Test case | Kết quả |
|---|---|---|
| TC-061 | Đặc điểm bí mật › người xem tin không thấy đặc điểm bí mật | Pass |
| TC-062 | Đặc điểm bí mật › không lọt ra ở danh sách chung | Pass |
| TC-063 | Đặc điểm bí mật › không lọt ra ngay khi vừa tạo tin | Pass |
| TC-064 | Đặc điểm bí mật › chủ tin đăng nhập thì đọc được | Pass |
| TC-065 | Đặc điểm bí mật › người cầm mã xác nhận thì đọc được | Pass |
| TC-066 | Đặc điểm bí mật › mã sai thì không đọc được | Pass |
| TC-067 | Đặc điểm bí mật › tài khoản khác không đọc được | Pass |
| TC-068 | Đặc điểm bí mật › chủ tin sửa được đặc điểm bí mật | Pass |
| TC-069 | Đặc điểm bí mật › bản băm mã xác nhận vẫn không bao giờ lọt ra | Pass |

### Chặn tần suất gọi API

| Mã | Test case | Kết quả |
|---|---|---|
| TC-070 | Giới hạn tần suất › chặn khi gọi AI quá nhiều lần trong thời gian ngắn | Pass |
| TC-071 | Giới hạn tần suất › trả kèm Retry-After để client biết chờ bao lâu | Pass |
| TC-072 | Giới hạn tần suất › mỗi endpoint đếm riêng, chặn chat không chặn luôn match | Pass |
| TC-073 | Giới hạn tần suất › chặn tạo tài khoản hàng loạt | Pass |

### Giới hạn nguồn gọi API (CORS)

| Mã | Test case | Kết quả |
|---|---|---|
| TC-074 | CORS › cho qua domain nằm trong FRONTEND_URL | Pass |
| TC-075 | CORS › chặn domain lạ | Pass |
| TC-076 | CORS › request không có Origin vẫn chạy bình thường | Pass |
| TC-077 | CORS › không lộ header x-powered-by | Pass |

### Xử lý lỗi toàn cục

| Mã | Test case | Kết quả |
|---|---|---|
| TC-078 | Ảnh vượt giới hạn dung lượng › trả 413 thay vì 500 | Pass |
| TC-079 | Ảnh vượt giới hạn dung lượng › trả JSON chứ không phải trang HTML | Pass |
| TC-080 | Ảnh vượt giới hạn dung lượng › không lộ dấu vết ngăn xếp hay đường dẫn máy chủ | Pass |
| TC-081 | Tệp không phải ảnh › trả 400 kèm JSON | Pass |
| TC-082 | Domain không được phép › trả 403 kèm JSON chứ không phải 500 | Pass |
| TC-083 | Domain không được phép › domain hợp lệ vẫn đi qua bình thường | Pass |

### Tạo, đọc, sửa, xoá tin đăng

| Mã | Test case | Kết quả |
|---|---|---|
| TC-084 | GET /pets › trả về { pets, total } | Pass |
| TC-085 | GET /pets › total = 0 khi chưa có data | Pass |
| TC-086 | POST /pets › trả về 400 nếu thiếu field bắt buộc | Pass |
| TC-087 | POST /pets › tạo pet thành công | Pass |
| TC-088 | GET /pets/:petId › trả về 404 nếu không tồn tại | Pass |
| TC-089 | GET /pets/:petId › trả về pet đúng nếu tồn tại | Pass |
| TC-090 | PUT /pets/:petId › cập nhật resolved thành công | Pass |
| TC-091 | DELETE /pets/:petId › xóa pet thành công | Pass |
| TC-092 | Mã xác nhận › trả về claimCode một lần khi tạo tin | Pass |
| TC-093 | Mã xác nhận › không đọc lại được claimCode qua GET | Pass |
| TC-094 | Mã xác nhận › từ chối sửa khi không có mã | Pass |
| TC-095 | Mã xác nhận › từ chối xoá khi mã sai | Pass |
| TC-096 | Mã xác nhận › tin cũ chưa có mã thì vẫn sửa được | Pass |
| TC-097 | Tham số lọc không hợp lệ › không làm sập server với days=abc (chữ thay vì số) | Pass |
| TC-098 | Tham số lọc không hợp lệ › không làm sập server với days=999999999 (số quá lớn) | Pass |
| TC-099 | Tham số lọc không hợp lệ › không làm sập server với days=-5 (số âm) | Pass |
| TC-100 | Tham số lọc không hợp lệ › không làm sập server với skip=-5 (skip âm) | Pass |
| TC-101 | Tham số lọc không hợp lệ › không làm sập server với limit=-3 (limit âm) | Pass |
| TC-102 | Tham số lọc không hợp lệ › không làm sập server với limit=abc (limit là chữ) | Pass |
| TC-103 | Tham số lọc không hợp lệ › limit vẫn bị chặn ở 50 | Pass |
| TC-104 | Giới hạn file khi đăng tin › từ chối file không phải ảnh | Pass |
| TC-105 | Chỉ sửa được những trường cho phép › không đổi được chủ sở hữu qua PUT | Pass |
| TC-106 | Chỉ sửa được những trường cho phép › không đổi được claimHash, tránh chiếm quyền tin của người khác | Pass |
| TC-107 | Chỉ sửa được những trường cho phép › không đổi được postId | Pass |
| TC-108 | Chỉ sửa được những trường cho phép › không đổi được ngày đăng để nhảy lên đầu danh sách | Pass |
| TC-109 | Chỉ sửa được những trường cho phép › vẫn sửa được những trường bình thường | Pass |

### Toạ độ và làm nhiễu vị trí

| Mã | Test case | Kết quả |
|---|---|---|
| TC-110 | Toạ độ trên bản đồ › lưu được toạ độ khi đăng tin | Pass |
| TC-111 | Toạ độ trên bản đồ › không có toạ độ thì để null, tin vẫn đăng được | Pass |
| TC-112 | Toạ độ trên bản đồ › bỏ qua toạ độ không phải số thay vì làm hỏng bản ghi | Pass |
| TC-113 | Toạ độ trên bản đồ › bỏ qua toạ độ ngoài khoảng hợp lệ | Pass |
| TC-114 | Toạ độ trên bản đồ › chỉ có một trong hai thì bỏ cả hai | Pass |
| TC-115 | Toạ độ trên bản đồ › sửa được toạ độ của tin đã đăng | Pass |
| TC-116 | Toạ độ trên bản đồ › toạ độ rác khi sửa thì bị bỏ qua, các trường khác vẫn lưu | Pass |
| TC-117 | Toạ độ trên bản đồ › toạ độ hiện trong danh sách chung để vẽ lên bản đồ | Pass |
| TC-118 | Xoá vị trí › gửi null thì xoá hẳn chứ không thành toạ độ 0,0 | Pass |
| TC-119 | Xoá vị trí › đăng tin không chọn vị trí, form gửi chuỗi "null" cũng ra null | Pass |
| TC-120 | Làm mờ toạ độ › không lưu toạ độ chính xác, làm tròn về lưới 0,005 độ | Pass |
| TC-121 | Làm mờ toạ độ › điểm sau khi làm mờ vẫn nằm trong khoảng 600m so với điểm gốc | Pass |
| TC-122 | Làm mờ toạ độ › hai tin đăng ở hai điểm cách nhau vài chục mét thì trùng vị trí | Pass |

### Bản đồ và gom nhóm ghim

| Mã | Test case | Kết quả |
|---|---|---|
| TC-123 | GET /pets/map › chỉ trả về tin đã ghim vị trí | Pass |
| TC-124 | GET /pets/map › đếm riêng số tin khớp bộ lọc nhưng thiếu toạ độ | Pass |
| TC-125 | GET /pets/map › không nhầm "map" thành mã tin của GET /pets/:petId | Pass |
| TC-126 | GET /pets/map › bộ lọc loại tin vẫn chặn như ở danh sách | Pass |
| TC-127 | GET /pets/map › bộ lọc loài và khu vực vẫn chặn như ở danh sách | Pass |
| TC-128 | GET /pets/map › bộ lọc số ngày vẫn chặn như ở danh sách | Pass |
| TC-129 | GET /pets/map › chỉ gửi những trường bản đồ vẽ ra, không gửi kèm mô tả hay liên hệ | Pass |
| TC-130 | GET /pets/map › không bao giờ để lọt vector hay bí mật của tin | Pass |
| TC-131 | GET /pets/map › báo capped = false khi còn xa ngưỡng 500 tin | Pass |
| TC-132 | GET /pets/map › khi có ô tìm kiếm › lọc theo nghĩa rồi mới bỏ tin thiếu toạ độ | Pass |
| TC-133 | GET /pets/map › khi có ô tìm kiếm › bộ lọc cứng vẫn chặn trước cả khi xếp hạng | Pass |
| TC-134 | GET /pets/map › khi có ô tìm kiếm › nhúng hỏng thì lui về khớp nguyên văn, không trả danh sách xếp bừa | Pass |

### Ảnh tin đăng và đường lui khi ảnh hỏng

| Mã | Test case | Kết quả |
|---|---|---|
| TC-135 | Đăng tin kèm ảnh › lưu cả URL và public_id của ảnh | Pass |
| TC-136 | Đăng tin kèm ảnh › không trả public_id ra ngoài, đó là chi tiết nội bộ | Pass |
| TC-137 | Đổi ảnh khi sửa tin › thay URL ảnh bằng ảnh mới vừa tải lên | Pass |
| TC-138 | Đổi ảnh khi sửa tin › xoá ảnh cũ trên Cloudinary để không bỏ lại file rác | Pass |
| TC-139 | Đổi ảnh khi sửa tin › vẫn sửa được các trường khác trong cùng lượt đổi ảnh | Pass |
| TC-140 | Đổi ảnh khi sửa tin › sửa tin mà không đụng tới ảnh thì giữ nguyên ảnh cũ | Pass |
| TC-141 | Đổi ảnh khi sửa tin › ảnh vượt 5MB nhận 413 kèm JSON chứ không phải 500 | Pass |
| TC-142 | Đổi ảnh khi sửa tin › tệp không phải ảnh bị từ chối | Pass |
| TC-143 | Đổi ảnh khi sửa tin › sai mã xác nhận thì không đổi được ảnh | Pass |
| TC-144 | Xoá ảnh khỏi tin › removeImage làm trống ảnh và dọn file trên Cloudinary | Pass |
| TC-145 | Xoá ảnh khỏi tin › nhận cả boolean khi gửi JSON | Pass |
| TC-146 | Xoá ảnh khỏi tin › tin vốn không có ảnh thì không gọi xoá vô ích | Pass |
| TC-147 | Xoá ảnh khỏi tin › có ảnh mới thì ưu tiên ảnh mới, bỏ qua removeImage | Pass |
| TC-148 | Ảnh không đổi được bằng cách gửi URL › bỏ qua trường image dạng chuỗi trong body | Pass |
| TC-149 | Ảnh không đổi được bằng cách gửi URL › bỏ qua cả imageId gửi kèm, tránh dọn mất ảnh của tin khác | Pass |
| TC-150 | Tin cũ chỉ có URL, chưa có public_id › moi public_id từ URL ra để vẫn dọn được ảnh cũ | Pass |
| TC-151 | Tin cũ chỉ có URL, chưa có public_id › URL lạ không phải của Cloudinary thì bỏ qua, không gọi xoá bừa | Pass |
| TC-152 | Xoá tin › dọn luôn ảnh của tin đó | Pass |
| TC-153 | Cloudinary lỗi › trả 502 với lời nhắn rõ ràng, không phải Server error chung chung | Pass |
| TC-154 | Cloudinary lỗi › ảnh cũ không bị xoá khi ảnh mới chưa lên được | Pass |

### Báo cáo tin xấu

| Mã | Test case | Kết quả |
|---|---|---|
| TC-155 | POST /pets/:petId/report › ai cũng gửi được, không cần đăng nhập | Pass |
| TC-156 | POST /pets/:petId/report › lưu được cả ghi chú kèm theo | Pass |
| TC-157 | POST /pets/:petId/report › từ chối lý do không có trong danh sách | Pass |
| TC-158 | POST /pets/:petId/report › từ chối báo cáo thiếu lý do | Pass |
| TC-159 | POST /pets/:petId/report › trả 404 cho tin không tồn tại, không tạo báo cáo mồ côi | Pass |
| TC-160 | POST /pets/:petId/report › trả 404 khi id sai định dạng thay vì ném lỗi ép kiểu | Pass |
| TC-161 | POST /pets/:petId/report › cắt ghi chú quá dài thay vì từ chối cả báo cáo | Pass |
| TC-162 | POST /pets/:petId/report › không nói cho người gửi biết tin đã bị báo cáo bao nhiêu lần | Pass |
| TC-163 | POST /pets/:petId/report › một người báo cáo được nhiều tin khác nhau | Pass |
| TC-164 | POST /pets/:petId/report › chặn tần suất tính chung mọi tin, không phải mỗi tin một hạn mức | Pass |
| TC-165 | hàng chờ báo cáo ở trang quản trị › khách vãng lai không xem được | Pass |
| TC-166 | hàng chờ báo cáo ở trang quản trị › quản trị viên xem được, kèm thông tin tin bị báo cáo | Pass |
| TC-167 | hàng chờ báo cáo ở trang quản trị › bỏ qua một báo cáo thì tin vẫn còn nguyên | Pass |
| TC-168 | hàng chờ báo cáo ở trang quản trị › xoá tin thì mọi báo cáo về tin đó biến mất theo | Pass |
| TC-169 | hàng chờ báo cáo ở trang quản trị › xoá tin cũng dọn luôn ảnh trên Cloudinary | Pass |
| TC-170 | hàng chờ báo cáo ở trang quản trị › báo cáo của tin đã bị chủ tin tự xoá vẫn hiện, không làm sập hàng chờ | Pass |
| TC-171 | hàng chờ báo cáo ở trang quản trị › số báo cáo chờ xử lý hiện trong thống kê | Pass |
| TC-172 | hàng chờ báo cáo ở trang quản trị › bỏ qua báo cáo không tồn tại trả 404 | Pass |
| TC-173 | hàng chờ báo cáo ở trang quản trị › không có quy tắc nào tự ẩn tin theo số lượt báo cáo | Pass |

### Tự động xoá tin đã giải quyết

| Mã | Test case | Kết quả |
|---|---|---|
| TC-174 | Quyền gọi đợt dọn dẹp › mã cron đúng thì chạy được dù không đăng nhập | Pass |
| TC-175 | Quyền gọi đợt dọn dẹp › mã cron sai trả 401 | Pass |
| TC-176 | Quyền gọi đợt dọn dẹp › không gửi mã và không đăng nhập thì trả 401 | Pass |
| TC-177 | Quyền gọi đợt dọn dẹp › người dùng thường trả 403 | Pass |
| TC-178 | Quyền gọi đợt dọn dẹp › quản trị viên bấm tay thì chạy được, không cần mã cron | Pass |
| TC-179 | Quyền gọi đợt dọn dẹp › chưa đặt CLEANUP_TOKEN thì đường vào bằng mã đóng hẳn | Pass |
| TC-180 | Chọn tin để xoá › xoá tin đã đoàn tụ quá hạn giữ lại | Pass |
| TC-181 | Chọn tin để xoá › giữ lại tin đoàn tụ còn trong hạn | Pass |
| TC-182 | Chọn tin để xoá › không đụng tới tin chưa đoàn tụ dù đăng đã rất lâu | Pass |
| TC-183 | Chọn tin để xoá › tin đoàn tụ cũ chưa có mốc thời gian thì được đóng dấu, không xoá ngay | Pass |
| TC-184 | Chọn tin để xoá › đổi CLEANUP_AFTER_DAYS thì đổi theo hạn giữ lại | Pass |
| TC-185 | Chọn tin để xoá › giá trị CLEANUP_AFTER_DAYS vô nghĩa thì quay về mặc định 30 ngày | Pass |
| TC-186 | Chọn tin để xoá › xoá nhiều tin trong một lượt và bỏ qua tin không đủ điều kiện | Pass |
| TC-187 | Dọn ảnh kèm theo › xoá tin thì xoá luôn ảnh trên Cloudinary theo imageId | Pass |
| TC-188 | Dọn ảnh kèm theo › tin cũ chỉ có URL vẫn moi được public_id để xoá ảnh | Pass |
| TC-189 | Dọn ảnh kèm theo › tin không có ảnh thì không gọi Cloudinary | Pass |
| TC-190 | Dọn ảnh kèm theo › Cloudinary lỗi thì tin vẫn xoá xong, đợt dọn không thất bại | Pass |
| TC-191 | Đồng hồ đếm ngược resolvedAt › bấm "đã tìm thấy" thì đóng dấu thời điểm | Pass |
| TC-192 | Đồng hồ đếm ngược resolvedAt › bỏ đánh dấu đoàn tụ thì đồng hồ dừng lại | Pass |
| TC-193 | Đồng hồ đếm ngược resolvedAt › gửi chuỗi "false" qua form vẫn hiểu là bỏ đoàn tụ | Pass |
| TC-194 | Đồng hồ đếm ngược resolvedAt › sửa nội dung tin đã đoàn tụ không đẩy lùi hạn xoá | Pass |
| TC-195 | Đồng hồ đếm ngược resolvedAt › client không tự đặt được resolvedAt để né đợt dọn | Pass |
| TC-196 | Thống kê báo trước số tin sắp bị xoá › đếm đúng số tin đã quá hạn | Pass |

### Phân tích ảnh bằng AI

| Mã | Test case | Kết quả |
|---|---|---|
| TC-197 | POST /ai/analyze-image › trả về 503 khi chưa cấu hình GEMINI_API_KEY | Pass |
| TC-198 | POST /ai/analyze-image › trả về 400 khi không gửi ảnh | Pass |
| TC-199 | POST /ai/analyze-image › trả về 400 khi file không phải ảnh | Pass |
| TC-200 | GET /ai/match/:petId › trả về 503 khi chưa cấu hình GEMINI_API_KEY | Pass |
| TC-201 | Timeout khi AI quá chậm › trả 504 thay vì treo tới khi proxy cắt | Pass |

### So khớp Lost↔Found đầu-cuối

| Mã | Test case | Kết quả |
|---|---|---|
| TC-202 | GET /ai/match/:petId — các tình huống hỏng › id sai định dạng trả 404 chứ không phải 500 | Pass |
| TC-203 | GET /ai/match/:petId — các tình huống hỏng › id đúng định dạng nhưng không tồn tại trả 404 | Pass |
| TC-204 | GET /ai/match/:petId — các tình huống hỏng › không có ứng viên nào thì trả mảng rỗng chứ không lỗi | Pass |
| TC-205 | GET /ai/match/:petId — các tình huống hỏng › ảnh tải không được thì vẫn đối chiếu bằng mô tả | Pass |
| TC-206 | GET /ai/match/:petId — các tình huống hỏng › Gemini từ chối vì ảnh thì thử lại bằng chữ và vẫn trả kết quả | Pass |
| TC-207 | GET /ai/match/:petId — các tình huống hỏng › bỏ qua ứng viên AI chấm dưới ngưỡng | Pass |
| TC-208 | GET /ai/match/:petId — các tình huống hỏng › bỏ qua index AI bịa ra ngoài danh sách ứng viên | Pass |
| TC-209 | GET /ai/match/:petId — các tình huống hỏng › AI trả về chuỗi không phải JSON thì báo 502 chứ không sập | Pass |
| TC-210 | GET /ai/match/:petId — các tình huống hỏng › cả hai lần gọi đều hỏng thì trả 500 có thông báo | Pass |
| TC-211 | GET /ai/match/:petId — các tình huống hỏng › AI quá chậm thì trả 504 | Pass |

### Tầng truy hồi ứng viên so khớp

| Mã | Test case | Kết quả |
|---|---|---|
| TC-212 | oppositeType › đổi lost thành found và ngược lại | Pass |
| TC-213 | candidateFilter › chỉ nhận tin ngược loại, cùng loài, chưa giải quyết | Pass |
| TC-214 | findCandidates › loại tin cùng loại, khác loài, đã giải quyết và quá cũ | Pass |
| TC-215 | findCandidates › xếp theo độ giống chứ không theo ngày khi tin gốc có vector | Pass |
| TC-216 | findCandidates › rơi về xếp theo ngày khi tin gốc chưa có vector | Pass |
| TC-217 | findCandidates › đẩy tin chưa nhúng xuống cuối thay vì bỏ hẳn | Pass |
| TC-218 | findCandidates › cắt đúng số lượng yêu cầu | Pass |

### Tìm kiếm theo nghĩa

| Mã | Test case | Kết quả |
|---|---|---|
| TC-219 | Xếp hạng theo nghĩa › tin gần câu hỏi nhất đứng đầu | Pass |
| TC-220 | Xếp hạng theo nghĩa › đổi câu hỏi thì đổi thứ tự | Pass |
| TC-221 | Xếp hạng theo nghĩa › trả về mọi tin chứ không cắt theo ngưỡng điểm | Pass |
| TC-222 | Xếp hạng theo nghĩa › không có câu hỏi thì vẫn sắp theo ngày như cũ | Pass |
| TC-223 | Khớp nguyên văn luôn đứng trên › gõ mã tin thì ra đúng tin đó dù điểm ngữ nghĩa bằng 0 | Pass |
| TC-224 | Khớp nguyên văn luôn đứng trên › khớp chữ trong mô tả cũng được ưu tiên | Pass |
| TC-225 | Khớp nguyên văn luôn đứng trên › không phân biệt hoa thường | Pass |
| TC-226 | Bộ lọc cứng vẫn chặn trước › lọc loài thì câu hỏi không kéo tin loài khác vào | Pass |
| TC-227 | Bộ lọc cứng vẫn chặn trước › lọc loại tin vẫn áp dụng | Pass |
| TC-228 | Bộ lọc cứng vẫn chặn trước › phân trang chạy trên kết quả đã xếp hạng | Pass |
| TC-229 | Khi nhúng hỏng › nhúng câu hỏi thất bại thì lui về lọc theo chữ | Pass |
| TC-230 | Khi nhúng hỏng › nhúng hỏng và không khớp chữ nào thì trả danh sách rỗng, không xếp bừa | Pass |
| TC-231 | Khi nhúng hỏng › tin chưa kịp nhúng vẫn hiện, chỉ là xếp sau | Pass |
| TC-232 | Vector không lọt ra ngoài API › danh sách không kèm embedding | Pass |
| TC-233 | Vector không lọt ra ngoài API › danh sách không có câu hỏi cũng không kèm embedding | Pass |
| TC-234 | Vector không lọt ra ngoài API › xem chi tiết tin không kèm embedding | Pass |
| TC-235 | Nhúng ngầm lúc đăng và sửa tin › đăng tin xong thì nhúng chạy ngầm | Pass |
| TC-236 | Nhúng ngầm lúc đăng và sửa tin › nhúng hỏng thì tin vẫn đăng được bình thường | Pass |
| TC-237 | Nhúng ngầm lúc đăng và sửa tin › sửa mô tả thì nhúng lại | Pass |
| TC-238 | Nhúng ngầm lúc đăng và sửa tin › bấm "đã tìm thấy" thì KHÔNG nhúng lại, khỏi đốt quota | Pass |
| TC-239 | Câu hỏi bất thường › câu hỏi toàn khoảng trắng thì coi như không tìm | Pass |
| TC-240 | Câu hỏi bất thường › câu hỏi dài quá bị cắt chứ không làm sập server | Pass |

### Tái xếp hạng kết quả tìm kiếm

| Mã | Test case | Kết quả |
|---|---|---|
| TC-241 | shouldRerank › bỏ qua câu quá ngắn — tra từ khoá thì vector đã đủ | Pass |
| TC-242 | shouldRerank › nhận câu đủ dài để coi là mô tả | Pass |
| TC-243 | shouldRerank › tắt hẳn khi SEARCH_RERANK không phải on | Pass |
| TC-244 | shouldRerank › mặc định tắt khi không khai biến | Pass |
| TC-245 | rerank › sắp lại theo điểm model chấm | Pass |
| TC-246 | rerank › không bao giờ làm mất tin, kể cả tin bị chấm 0 điểm | Pass |
| TC-247 | rerank › giữ nguyên thứ tự cũ cho tin model quên chấm | Pass |
| TC-248 | rerank › trả nguyên thứ tự cũ khi model hỏng | Pass |
| TC-249 | rerank › trả nguyên thứ tự cũ khi model trả rác | Pass |
| TC-250 | rerank › không gọi model khi chỉ có một tin | Pass |

### Trợ lý hỗ trợ kỹ thuật

| Mã | Test case | Kết quả |
|---|---|---|
| TC-251 | POST /ai/chat › trả 503 khi chưa cấu hình GEMINI_API_KEY | Pass |
| TC-252 | POST /ai/chat › trả lời khi hỏi bình thường | Pass |
| TC-253 | POST /ai/chat › gửi cả hội thoại trước đó để trợ lý hiểu ngữ cảnh | Pass |
| TC-254 | POST /ai/chat › từ chối khi không có nội dung | Pass |
| TC-255 | POST /ai/chat › từ chối khi messages không phải mảng | Pass |
| TC-256 | POST /ai/chat › từ chối hội thoại quá dài | Pass |
| TC-257 | POST /ai/chat › từ chối tin nhắn quá dài | Pass |
| TC-258 | POST /ai/chat › bỏ qua tin nhắn rỗng, chỉ toàn rỗng thì báo lỗi | Pass |
| TC-259 | POST /ai/chat › trả 502 khi trợ lý trả về chuỗi rỗng | Pass |
| TC-260 | POST /ai/chat › trả 504 khi trợ lý quá chậm | Pass |
| TC-261 | POST /ai/chat › trả 500 kèm thông báo khi dịch vụ hỏng | Pass |

