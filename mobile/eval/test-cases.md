# Bảng test case chức năng — app điện thoại LostPets

Chạy ngày 2026-11-04 · sinh tự động bởi `npm run test:report`

## Tổng hợp

| | |
|---|---|
| Tổng số test case | 173 |
| Pass | 173 |
| Fail | 0 |
| Tỉ lệ pass | **100%** |
| Tiêu chí Objective 5 | ≥ 90% |
| Kết luận | **Đạt** |

Môi trường: Jest 6 bộ test, chạy trên Node với bản giả của phần native (bộ nhớ máy, vị trí, WebView, bộ icon). Không gọi mạng ra ngoài.

## Theo nhóm chức năng

| Nhóm | Mục tiêu | Số case | Pass | Fail |
|---|---|---|---|---|
| Bản đồ: toạ độ và trang Leaflet nhúng | Obj 4 | 31 | 31 | 0 |
| Tương phản màu WCAG 2.1 AA, hai chế độ sáng/tối | Obj 5 / LSEPI | 68 | 68 | 0 |
| Giao diện song ngữ Việt/Anh | Obj 4 | 7 | 7 | 0 |
| Quy tắc giao diện: vùng chạm, icon, API đã bị bỏ | Obj 5 / LSEPI | 42 | 42 | 0 |
| Các hàm thuần: thời gian, bộ lọc, đọc mã lỗi | Obj 4 | 14 | 14 | 0 |
| Thẻ tin đăng — vẽ thật và tương tác | Obj 4 | 11 | 11 | 0 |

## Chi tiết từng test case

### Bản đồ: toạ độ và trang Leaflet nhúng

| Mã | Test case | Kết quả |
|---|---|---|
| TC-M001 | hasPoint — chưa chọn vị trí thì phải trả về false › null không phải là toạ độ | Pass |
| TC-M002 | hasPoint — chưa chọn vị trí thì phải trả về false › undefined không phải là toạ độ | Pass |
| TC-M003 | hasPoint — chưa chọn vị trí thì phải trả về false › chuỗi rỗng không phải là toạ độ — dữ liệu qua FormData hay ra thế này | Pass |
| TC-M004 | hasPoint — chưa chọn vị trí thì phải trả về false › thiếu một nửa cũng không tính | Pass |
| TC-M005 | hasPoint — chưa chọn vị trí thì phải trả về false › không có object thì false, không ném lỗi | Pass |
| TC-M006 | hasPoint — chưa chọn vị trí thì phải trả về false › toạ độ thật thì true | Pass |
| TC-M007 | hasPoint — chưa chọn vị trí thì phải trả về false › chuỗi số vẫn tính — dữ liệu đi qua FormData thành chuỗi hết | Pass |
| TC-M008 | hasPoint — chưa chọn vị trí thì phải trả về false › số 0 THẬT SỰ thì vẫn là toạ độ hợp lệ | Pass |
| TC-M009 | hasPoint — chưa chọn vị trí thì phải trả về false › chữ không phải số thì false | Pass |
| TC-M010 | directionsUrl › dựng đúng link chung của Google Maps | Pass |
| TC-M011 | mapHtml — trang Leaflet nhúng vào WebView › mã JavaScript bên trong hợp lệ ({ pick: false, interactive: false, isDark: false }) | Pass |
| TC-M012 | mapHtml — trang Leaflet nhúng vào WebView › mã JavaScript bên trong hợp lệ ({ pick: false, interactive: false, isDark: true }) | Pass |
| TC-M013 | mapHtml — trang Leaflet nhúng vào WebView › mã JavaScript bên trong hợp lệ ({ pick: false, interactive: true, isDark: false }) | Pass |
| TC-M014 | mapHtml — trang Leaflet nhúng vào WebView › mã JavaScript bên trong hợp lệ ({ pick: false, interactive: true, isDark: true }) | Pass |
| TC-M015 | mapHtml — trang Leaflet nhúng vào WebView › mã JavaScript bên trong hợp lệ ({ pick: true, interactive: false, isDark: false }) | Pass |
| TC-M016 | mapHtml — trang Leaflet nhúng vào WebView › mã JavaScript bên trong hợp lệ ({ pick: true, interactive: false, isDark: true }) | Pass |
| TC-M017 | mapHtml — trang Leaflet nhúng vào WebView › mã JavaScript bên trong hợp lệ ({ pick: true, interactive: true, isDark: false }) | Pass |
| TC-M018 | mapHtml — trang Leaflet nhúng vào WebView › mã JavaScript bên trong hợp lệ ({ pick: true, interactive: true, isDark: true }) | Pass |
| TC-M019 | mapHtml — trang Leaflet nhúng vào WebView › luôn ghi nguồn OpenStreetMap ({ pick: false, interactive: false, isDark: false }) | Pass |
| TC-M020 | mapHtml — trang Leaflet nhúng vào WebView › luôn ghi nguồn OpenStreetMap ({ pick: false, interactive: false, isDark: true }) | Pass |
| TC-M021 | mapHtml — trang Leaflet nhúng vào WebView › luôn ghi nguồn OpenStreetMap ({ pick: false, interactive: true, isDark: false }) | Pass |
| TC-M022 | mapHtml — trang Leaflet nhúng vào WebView › luôn ghi nguồn OpenStreetMap ({ pick: false, interactive: true, isDark: true }) | Pass |
| TC-M023 | mapHtml — trang Leaflet nhúng vào WebView › luôn ghi nguồn OpenStreetMap ({ pick: true, interactive: false, isDark: false }) | Pass |
| TC-M024 | mapHtml — trang Leaflet nhúng vào WebView › luôn ghi nguồn OpenStreetMap ({ pick: true, interactive: false, isDark: true }) | Pass |
| TC-M025 | mapHtml — trang Leaflet nhúng vào WebView › luôn ghi nguồn OpenStreetMap ({ pick: true, interactive: true, isDark: false }) | Pass |
| TC-M026 | mapHtml — trang Leaflet nhúng vào WebView › luôn ghi nguồn OpenStreetMap ({ pick: true, interactive: true, isDark: true }) | Pass |
| TC-M027 | mapHtml — trang Leaflet nhúng vào WebView › chế độ tối đảo màu TỪNG ảnh ô bản đồ, không đảo cả khung | Pass |
| TC-M028 | mapHtml — trang Leaflet nhúng vào WebView › chế độ sáng không có bộ lọc màu nào | Pass |
| TC-M029 | mapHtml — trang Leaflet nhúng vào WebView › chế độ tĩnh khoá hết thao tác | Pass |
| TC-M030 | mapHtml — trang Leaflet nhúng vào WebView › mặc định nhìn về TP.HCM | Pass |
| TC-M031 | mapHtml — trang Leaflet nhúng vào WebView › vẽ vùng tròn đúng bán kính back-end làm tròn tới | Pass |

### Tương phản màu WCAG 2.1 AA, hai chế độ sáng/tối

| Mã | Test case | Kết quả |
|---|---|---|
| TC-M032 | tương phản WCAG — chế độ sáng › Chữ chính trên nền trang đạt ngưỡng | Pass |
| TC-M033 | tương phản WCAG — chế độ sáng › Chữ chính trên thẻ đạt ngưỡng | Pass |
| TC-M034 | tương phản WCAG — chế độ sáng › Chữ phụ trên nền trang đạt ngưỡng | Pass |
| TC-M035 | tương phản WCAG — chế độ sáng › Chữ phụ trên thẻ đạt ngưỡng | Pass |
| TC-M036 | tương phản WCAG — chế độ sáng › Chữ mờ trên nền trang đạt ngưỡng | Pass |
| TC-M037 | tương phản WCAG — chế độ sáng › Chữ mờ trên thẻ đạt ngưỡng | Pass |
| TC-M038 | tương phản WCAG — chế độ sáng › Chữ mờ trên lớp nổi đạt ngưỡng | Pass |
| TC-M039 | tương phản WCAG — chế độ sáng › Chữ trên nút chính đạt ngưỡng | Pass |
| TC-M040 | tương phản WCAG — chế độ sáng › Chữ trên nhãn Bị mất đạt ngưỡng | Pass |
| TC-M041 | tương phản WCAG — chế độ sáng › Chữ trên nhãn Tìm thấy đạt ngưỡng | Pass |
| TC-M042 | tương phản WCAG — chế độ sáng › Chữ trên nhãn Đã đoàn tụ đạt ngưỡng | Pass |
| TC-M043 | tương phản WCAG — chế độ sáng › Chữ xanh chủ đạo trên nền đạt ngưỡng | Pass |
| TC-M044 | tương phản WCAG — chế độ sáng › Chữ xanh chủ đạo trên thẻ đạt ngưỡng | Pass |
| TC-M045 | tương phản WCAG — chế độ sáng › Chữ đỏ nút xoá trên nền đạt ngưỡng | Pass |
| TC-M046 | tương phản WCAG — chế độ sáng › Chữ đỏ nút xoá trên thẻ đạt ngưỡng | Pass |
| TC-M047 | tương phản WCAG — chế độ sáng › Chữ nút Đã đoàn tụ đạt ngưỡng | Pass |
| TC-M048 | tương phản WCAG — chế độ sáng › Cảnh báo lừa đảo đạt ngưỡng | Pass |
| TC-M049 | tương phản WCAG — chế độ sáng › Đặc điểm bí mật đạt ngưỡng | Pass |
| TC-M050 | tương phản WCAG — chế độ sáng › Chữ AI trên nền AI đạt ngưỡng | Pass |
| TC-M051 | tương phản WCAG — chế độ sáng › Chữ trên nút AI đạt ngưỡng | Pass |
| TC-M052 | tương phản WCAG — chế độ sáng › Chữ trên khung liên hệ đạt ngưỡng | Pass |
| TC-M053 | tương phản WCAG — chế độ sáng › Tên app ở đầu trang đạt ngưỡng | Pass |
| TC-M054 | tương phản WCAG — chế độ sáng › Nhãn TIN MỚI NHẤT đạt ngưỡng | Pass |
| TC-M055 | tương phản WCAG — chế độ sáng › Nhãn LIÊN HỆ đạt ngưỡng | Pass |
| TC-M056 | tương phản WCAG — chế độ sáng › Nhãn ADMIN đạt ngưỡng | Pass |
| TC-M057 | tương phản WCAG — chế độ sáng › Chữ trên nút Google đạt ngưỡng | Pass |
| TC-M058 | tương phản WCAG — chế độ sáng › Viền nút Google đạt ngưỡng | Pass |
| TC-M059 | tương phản WCAG — chế độ sáng › Chữ trên nút Facebook đạt ngưỡng | Pass |
| TC-M060 | tương phản WCAG — chế độ sáng › Viền nút bấm so với nền đạt ngưỡng | Pass |
| TC-M061 | tương phản WCAG — chế độ sáng › Viền nút bấm so với thẻ đạt ngưỡng | Pass |
| TC-M062 | tương phản WCAG — chế độ sáng › Viền nút bấm trên lớp nổi đạt ngưỡng | Pass |
| TC-M063 | tương phản WCAG — chế độ tối › Chữ chính trên nền trang đạt ngưỡng | Pass |
| TC-M064 | tương phản WCAG — chế độ tối › Chữ chính trên thẻ đạt ngưỡng | Pass |
| TC-M065 | tương phản WCAG — chế độ tối › Chữ phụ trên nền trang đạt ngưỡng | Pass |
| TC-M066 | tương phản WCAG — chế độ tối › Chữ phụ trên thẻ đạt ngưỡng | Pass |
| TC-M067 | tương phản WCAG — chế độ tối › Chữ mờ trên nền trang đạt ngưỡng | Pass |
| TC-M068 | tương phản WCAG — chế độ tối › Chữ mờ trên thẻ đạt ngưỡng | Pass |
| TC-M069 | tương phản WCAG — chế độ tối › Chữ mờ trên lớp nổi đạt ngưỡng | Pass |
| TC-M070 | tương phản WCAG — chế độ tối › Chữ trên nút chính đạt ngưỡng | Pass |
| TC-M071 | tương phản WCAG — chế độ tối › Chữ trên nhãn Bị mất đạt ngưỡng | Pass |
| TC-M072 | tương phản WCAG — chế độ tối › Chữ trên nhãn Tìm thấy đạt ngưỡng | Pass |
| TC-M073 | tương phản WCAG — chế độ tối › Chữ trên nhãn Đã đoàn tụ đạt ngưỡng | Pass |
| TC-M074 | tương phản WCAG — chế độ tối › Chữ xanh chủ đạo trên nền đạt ngưỡng | Pass |
| TC-M075 | tương phản WCAG — chế độ tối › Chữ xanh chủ đạo trên thẻ đạt ngưỡng | Pass |
| TC-M076 | tương phản WCAG — chế độ tối › Chữ đỏ nút xoá trên nền đạt ngưỡng | Pass |
| TC-M077 | tương phản WCAG — chế độ tối › Chữ đỏ nút xoá trên thẻ đạt ngưỡng | Pass |
| TC-M078 | tương phản WCAG — chế độ tối › Chữ nút Đã đoàn tụ đạt ngưỡng | Pass |
| TC-M079 | tương phản WCAG — chế độ tối › Cảnh báo lừa đảo đạt ngưỡng | Pass |
| TC-M080 | tương phản WCAG — chế độ tối › Đặc điểm bí mật đạt ngưỡng | Pass |
| TC-M081 | tương phản WCAG — chế độ tối › Chữ AI trên nền AI đạt ngưỡng | Pass |
| TC-M082 | tương phản WCAG — chế độ tối › Chữ trên nút AI đạt ngưỡng | Pass |
| TC-M083 | tương phản WCAG — chế độ tối › Chữ trên khung liên hệ đạt ngưỡng | Pass |
| TC-M084 | tương phản WCAG — chế độ tối › Tên app ở đầu trang đạt ngưỡng | Pass |
| TC-M085 | tương phản WCAG — chế độ tối › Nhãn TIN MỚI NHẤT đạt ngưỡng | Pass |
| TC-M086 | tương phản WCAG — chế độ tối › Nhãn LIÊN HỆ đạt ngưỡng | Pass |
| TC-M087 | tương phản WCAG — chế độ tối › Nhãn ADMIN đạt ngưỡng | Pass |
| TC-M088 | tương phản WCAG — chế độ tối › Chữ trên nút Google đạt ngưỡng | Pass |
| TC-M089 | tương phản WCAG — chế độ tối › Viền nút Google đạt ngưỡng | Pass |
| TC-M090 | tương phản WCAG — chế độ tối › Chữ trên nút Facebook đạt ngưỡng | Pass |
| TC-M091 | tương phản WCAG — chế độ tối › Viền nút bấm so với nền đạt ngưỡng | Pass |
| TC-M092 | tương phản WCAG — chế độ tối › Viền nút bấm so với thẻ đạt ngưỡng | Pass |
| TC-M093 | tương phản WCAG — chế độ tối › Viền nút bấm trên lớp nổi đạt ngưỡng | Pass |
| TC-M094 | hai bảng màu phải có đúng từng ấy màu › cùng số lượng và cùng tên | Pass |
| TC-M095 | hai bảng màu phải có đúng từng ấy màu › mọi giá trị đều là mã màu hợp lệ hoặc rgba | Pass |
| TC-M096 | statusStyle — nhãn trạng thái › tin đã đoàn tụ thắng mọi thứ khác | Pass |
| TC-M097 | statusStyle — nhãn trạng thái › tin báo mất | Pass |
| TC-M098 | statusStyle — nhãn trạng thái › tin nhặt được | Pass |
| TC-M099 | statusStyle — nhãn trạng thái › trả về cả màu chữ, không để nơi gọi tự nghĩ | Pass |

### Giao diện song ngữ Việt/Anh

| Mã | Test case | Kết quả |
|---|---|---|
| TC-M100 | hai thứ tiếng › có cùng bộ tên câu | Pass |
| TC-M101 | hai thứ tiếng › không có câu nào bỏ trống | Pass |
| TC-M102 | hai thứ tiếng › chỗ nội suy {..} khớp nhau giữa hai bản | Pass |
| TC-M103 | quy ước đặt tên › mọi tên câu đều có dạng khu-vuc.ten-cu-the | Pass |
| TC-M104 | quy ước đặt tên › không có tên câu nào trùng nhau | Pass |
| TC-M105 | không còn ký tự dùng làm icon trong chữ › bản vi | Pass |
| TC-M106 | không còn ký tự dùng làm icon trong chữ › bản en | Pass |

### Quy tắc giao diện: vùng chạm, icon, API đã bị bỏ

| Mã | Test case | Kết quả |
|---|---|---|
| TC-M107 | vùng chạm tối thiểu 44pt › AdminScreen.tsx | Pass |
| TC-M108 | vùng chạm tối thiểu 44pt › AuthScreen.tsx | Pass |
| TC-M109 | vùng chạm tối thiểu 44pt › ChatScreen.tsx | Pass |
| TC-M110 | vùng chạm tối thiểu 44pt › DetailScreen.tsx | Pass |
| TC-M111 | vùng chạm tối thiểu 44pt › FormScreen.tsx | Pass |
| TC-M112 | vùng chạm tối thiểu 44pt › HomeScreen.tsx | Pass |
| TC-M113 | vùng chạm tối thiểu 44pt › MyPetsScreen.tsx | Pass |
| TC-M114 | vùng chạm tối thiểu 44pt › SettingsScreen.tsx | Pass |
| TC-M115 | vùng chạm tối thiểu 44pt › SplashScreen.tsx | Pass |
| TC-M116 | vùng chạm tối thiểu 44pt › ClaimCodeModal.tsx | Pass |
| TC-M117 | vùng chạm tối thiểu 44pt › PetCard.tsx | Pass |
| TC-M118 | vùng chạm tối thiểu 44pt › PetFilters.tsx | Pass |
| TC-M119 | vùng chạm tối thiểu 44pt › PetMap.tsx | Pass |
| TC-M120 | vùng chạm tối thiểu 44pt › SocialLogin.tsx | Pass |
| TC-M121 | không dùng ký tự làm icon › AdminScreen.tsx | Pass |
| TC-M122 | không dùng ký tự làm icon › AuthScreen.tsx | Pass |
| TC-M123 | không dùng ký tự làm icon › ChatScreen.tsx | Pass |
| TC-M124 | không dùng ký tự làm icon › DetailScreen.tsx | Pass |
| TC-M125 | không dùng ký tự làm icon › FormScreen.tsx | Pass |
| TC-M126 | không dùng ký tự làm icon › HomeScreen.tsx | Pass |
| TC-M127 | không dùng ký tự làm icon › MyPetsScreen.tsx | Pass |
| TC-M128 | không dùng ký tự làm icon › SettingsScreen.tsx | Pass |
| TC-M129 | không dùng ký tự làm icon › SplashScreen.tsx | Pass |
| TC-M130 | không dùng ký tự làm icon › ClaimCodeModal.tsx | Pass |
| TC-M131 | không dùng ký tự làm icon › PetCard.tsx | Pass |
| TC-M132 | không dùng ký tự làm icon › PetFilters.tsx | Pass |
| TC-M133 | không dùng ký tự làm icon › PetMap.tsx | Pass |
| TC-M134 | không dùng ký tự làm icon › SocialLogin.tsx | Pass |
| TC-M135 | không dùng StyleSheet.absoluteFillObject › AdminScreen.tsx | Pass |
| TC-M136 | không dùng StyleSheet.absoluteFillObject › AuthScreen.tsx | Pass |
| TC-M137 | không dùng StyleSheet.absoluteFillObject › ChatScreen.tsx | Pass |
| TC-M138 | không dùng StyleSheet.absoluteFillObject › DetailScreen.tsx | Pass |
| TC-M139 | không dùng StyleSheet.absoluteFillObject › FormScreen.tsx | Pass |
| TC-M140 | không dùng StyleSheet.absoluteFillObject › HomeScreen.tsx | Pass |
| TC-M141 | không dùng StyleSheet.absoluteFillObject › MyPetsScreen.tsx | Pass |
| TC-M142 | không dùng StyleSheet.absoluteFillObject › SettingsScreen.tsx | Pass |
| TC-M143 | không dùng StyleSheet.absoluteFillObject › SplashScreen.tsx | Pass |
| TC-M144 | không dùng StyleSheet.absoluteFillObject › ClaimCodeModal.tsx | Pass |
| TC-M145 | không dùng StyleSheet.absoluteFillObject › PetCard.tsx | Pass |
| TC-M146 | không dùng StyleSheet.absoluteFillObject › PetFilters.tsx | Pass |
| TC-M147 | không dùng StyleSheet.absoluteFillObject › PetMap.tsx | Pass |
| TC-M148 | không dùng StyleSheet.absoluteFillObject › SocialLogin.tsx | Pass |

### Các hàm thuần: thời gian, bộ lọc, đọc mã lỗi

| Mã | Test case | Kết quả |
|---|---|---|
| TC-M149 | timeAgo — các đường ranh giới › chưa tới một phút thì ghi "Vừa xong" | Pass |
| TC-M150 | timeAgo — các đường ranh giới › đúng một phút thì chuyển sang đếm phút | Pass |
| TC-M151 | timeAgo — các đường ranh giới › 59 phút vẫn là phút, 60 phút thành giờ | Pass |
| TC-M152 | timeAgo — các đường ranh giới › 23 giờ vẫn là giờ, 24 giờ thành ngày | Pass |
| TC-M153 | timeAgo — các đường ranh giới › 29 ngày vẫn đếm ngày, 30 ngày thì quay về ngày tháng | Pass |
| TC-M154 | timeAgo — các đường ranh giới › tháng viết tắt đổi theo ngôn ngữ | Pass |
| TC-M155 | timeAgo — các đường ranh giới › bản tiếng Anh dùng đúng kho chữ tiếng Anh | Pass |
| TC-M156 | countActiveFilters — đếm số điều kiện lọc đang bật › mặc định thì không có điều kiện nào | Pass |
| TC-M157 | countActiveFilters — đếm số điều kiện lọc đang bật › "newest" là mặc định nên KHÔNG tính là một điều kiện | Pass |
| TC-M158 | countActiveFilters — đếm số điều kiện lọc đang bật › khu vực chỉ toàn khoảng trắng thì không tính | Pass |
| TC-M159 | countActiveFilters — đếm số điều kiện lọc đang bật › cộng dồn được | Pass |
| TC-M160 | errorStatus — lấy mã HTTP ra từ một lỗi bắt được › lấy được mã từ lỗi của axios | Pass |
| TC-M161 | errorStatus — lấy mã HTTP ra từ một lỗi bắt được › lỗi mạng của axios thì không có mã, trả undefined | Pass |
| TC-M162 | errorStatus — lấy mã HTTP ra từ một lỗi bắt được › lỗi thường không phải của axios thì cũng không ném | Pass |

### Thẻ tin đăng — vẽ thật và tương tác

| Mã | Test case | Kết quả |
|---|---|---|
| TC-M163 | PetCard vẽ ra được › không nổ, và hiện tên con vật | Pass |
| TC-M164 | PetCard vẽ ra được › không có tên thì lấy giống thay thế | Pass |
| TC-M165 | PetCard vẽ ra được › hiện khu vực và mã tin | Pass |
| TC-M166 | PetCard vẽ ra được › bấm vào thì gọi onPress đúng một lần | Pass |
| TC-M167 | nhãn trạng thái › tin báo mất | Pass |
| TC-M168 | nhãn trạng thái › tin nhặt được | Pass |
| TC-M169 | nhãn trạng thái › đã đoàn tụ thì thắng cả type | Pass |
| TC-M170 | nhãn trạng thái › chữ trên nhãn dùng màu riêng của nhãn đó, không phải màu cố định | Pass |
| TC-M171 | ảnh › có ảnh thì vẽ đúng ảnh đó | Pass |
| TC-M172 | ảnh › không có ảnh thì vẽ logo thay thế, không để trống | Pass |
| TC-M173 | ghim địa chỉ vẽ bằng icon › dùng icon location chứ không phải ký tự 📍 | Pass |

