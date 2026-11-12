# Bảng test case chức năng — app điện thoại LostPets

Chạy ngày 2026-11-08 · sinh tự động bởi `npm run test:report`

## Tổng hợp

| | |
|---|---|
| Tổng số test case | 238 |
| Pass | 238 |
| Fail | 0 |
| Tỉ lệ pass | **100%** |
| Tiêu chí Objective 5 | ≥ 90% |
| Kết luận | **Đạt** |

Môi trường: Jest 6 bộ test, chạy trên Node với bản giả của phần native (bộ nhớ máy, vị trí, WebView, bộ icon). Không gọi mạng ra ngoài.

## Theo nhóm chức năng

| Nhóm | Mục tiêu | Số case | Pass | Fail |
|---|---|---|---|---|
| Bản đồ: toạ độ và trang Leaflet nhúng | Obj 4 | 45 | 45 | 0 |
| Tương phản màu WCAG 2.1 AA, hai chế độ sáng/tối | Obj 5 / LSEPI | 68 | 68 | 0 |
| Giao diện song ngữ Việt/Anh | Obj 4 | 7 | 7 | 0 |
| Quy tắc giao diện: vùng chạm, icon, API đã bị bỏ | Obj 5 / LSEPI | 60 | 60 | 0 |
| Các hàm thuần: thời gian, bộ lọc, đọc mã lỗi | Obj 4 | 41 | 41 | 0 |
| Thẻ tin đăng — vẽ thật và tương tác | Obj 4 | 17 | 17 | 0 |

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
| TC-M032 | distanceKm — khoảng cách trên mặt đất › cùng một điểm thì bằng 0 | Pass |
| TC-M033 | distanceKm — khoảng cách trên mặt đất › 1 độ vĩ tuyến ra khoảng 111km | Pass |
| TC-M034 | distanceKm — khoảng cách trên mặt đất › 1 độ kinh tuyến ngắn dần khi lên vĩ độ cao | Pass |
| TC-M035 | distanceKm — khoảng cách trên mặt đất › đo chiều nào cũng ra một kết quả | Pass |
| TC-M036 | distanceKm — khoảng cách trên mặt đất › hai điểm cách 0.01 độ vĩ ra khoảng 1.1km | Pass |
| TC-M037 | formatDistanceKm — khoảng cách thành chữ › dưới 1km thì làm tròn về trăm mét | Pass |
| TC-M038 | formatDistanceKm — khoảng cách thành chữ › không bao giờ in nhỏ hơn 100m | Pass |
| TC-M039 | formatDistanceKm — khoảng cách thành chữ › từ 1 đến dưới 10km lấy một chữ số thập phân | Pass |
| TC-M040 | formatDistanceKm — khoảng cách thành chữ › từ 10km trở lên thì lấy số nguyên | Pass |
| TC-M041 | formatDistanceKm — khoảng cách thành chữ › luôn kèm dấu ngã, vì toạ độ vốn đã được làm nhiễu | Pass |
| TC-M042 | formatDistanceKm — khoảng cách thành chữ › số không hợp lệ thì trả chuỗi rỗng | Pass |
| TC-M043 | màu nền bản đồ lấy từ bảng màu, không chép tay › chế độ sáng dùng đúng surfaceTint | Pass |
| TC-M044 | màu nền bản đồ lấy từ bảng màu, không chép tay › chế độ tối dùng đúng surface | Pass |
| TC-M045 | màu nền bản đồ lấy từ bảng màu, không chép tay › hai chế độ ra hai màu khác nhau | Pass |

### Tương phản màu WCAG 2.1 AA, hai chế độ sáng/tối

| Mã | Test case | Kết quả |
|---|---|---|
| TC-M046 | tương phản WCAG — chế độ sáng › Chữ chính trên nền trang đạt ngưỡng | Pass |
| TC-M047 | tương phản WCAG — chế độ sáng › Chữ chính trên thẻ đạt ngưỡng | Pass |
| TC-M048 | tương phản WCAG — chế độ sáng › Chữ phụ trên nền trang đạt ngưỡng | Pass |
| TC-M049 | tương phản WCAG — chế độ sáng › Chữ phụ trên thẻ đạt ngưỡng | Pass |
| TC-M050 | tương phản WCAG — chế độ sáng › Chữ mờ trên nền trang đạt ngưỡng | Pass |
| TC-M051 | tương phản WCAG — chế độ sáng › Chữ mờ trên thẻ đạt ngưỡng | Pass |
| TC-M052 | tương phản WCAG — chế độ sáng › Chữ mờ trên lớp nổi đạt ngưỡng | Pass |
| TC-M053 | tương phản WCAG — chế độ sáng › Chữ trên nút chính đạt ngưỡng | Pass |
| TC-M054 | tương phản WCAG — chế độ sáng › Chữ trên nhãn Bị mất đạt ngưỡng | Pass |
| TC-M055 | tương phản WCAG — chế độ sáng › Chữ trên nhãn Tìm thấy đạt ngưỡng | Pass |
| TC-M056 | tương phản WCAG — chế độ sáng › Chữ trên nhãn Đã đoàn tụ đạt ngưỡng | Pass |
| TC-M057 | tương phản WCAG — chế độ sáng › Chữ xanh chủ đạo trên nền đạt ngưỡng | Pass |
| TC-M058 | tương phản WCAG — chế độ sáng › Chữ xanh chủ đạo trên thẻ đạt ngưỡng | Pass |
| TC-M059 | tương phản WCAG — chế độ sáng › Chữ đỏ nút xoá trên nền đạt ngưỡng | Pass |
| TC-M060 | tương phản WCAG — chế độ sáng › Chữ đỏ nút xoá trên thẻ đạt ngưỡng | Pass |
| TC-M061 | tương phản WCAG — chế độ sáng › Chữ nút Đã đoàn tụ đạt ngưỡng | Pass |
| TC-M062 | tương phản WCAG — chế độ sáng › Cảnh báo lừa đảo đạt ngưỡng | Pass |
| TC-M063 | tương phản WCAG — chế độ sáng › Đặc điểm bí mật đạt ngưỡng | Pass |
| TC-M064 | tương phản WCAG — chế độ sáng › Chữ AI trên nền AI đạt ngưỡng | Pass |
| TC-M065 | tương phản WCAG — chế độ sáng › Chữ trên nút AI đạt ngưỡng | Pass |
| TC-M066 | tương phản WCAG — chế độ sáng › Chữ trên khung liên hệ đạt ngưỡng | Pass |
| TC-M067 | tương phản WCAG — chế độ sáng › Tên app ở đầu trang đạt ngưỡng | Pass |
| TC-M068 | tương phản WCAG — chế độ sáng › Nhãn TIN MỚI NHẤT đạt ngưỡng | Pass |
| TC-M069 | tương phản WCAG — chế độ sáng › Nhãn LIÊN HỆ đạt ngưỡng | Pass |
| TC-M070 | tương phản WCAG — chế độ sáng › Nhãn ADMIN đạt ngưỡng | Pass |
| TC-M071 | tương phản WCAG — chế độ sáng › Chữ trên nút Google đạt ngưỡng | Pass |
| TC-M072 | tương phản WCAG — chế độ sáng › Viền nút Google đạt ngưỡng | Pass |
| TC-M073 | tương phản WCAG — chế độ sáng › Chữ trên nút Facebook đạt ngưỡng | Pass |
| TC-M074 | tương phản WCAG — chế độ sáng › Viền nút bấm so với nền đạt ngưỡng | Pass |
| TC-M075 | tương phản WCAG — chế độ sáng › Viền nút bấm so với thẻ đạt ngưỡng | Pass |
| TC-M076 | tương phản WCAG — chế độ sáng › Viền nút bấm trên lớp nổi đạt ngưỡng | Pass |
| TC-M077 | tương phản WCAG — chế độ tối › Chữ chính trên nền trang đạt ngưỡng | Pass |
| TC-M078 | tương phản WCAG — chế độ tối › Chữ chính trên thẻ đạt ngưỡng | Pass |
| TC-M079 | tương phản WCAG — chế độ tối › Chữ phụ trên nền trang đạt ngưỡng | Pass |
| TC-M080 | tương phản WCAG — chế độ tối › Chữ phụ trên thẻ đạt ngưỡng | Pass |
| TC-M081 | tương phản WCAG — chế độ tối › Chữ mờ trên nền trang đạt ngưỡng | Pass |
| TC-M082 | tương phản WCAG — chế độ tối › Chữ mờ trên thẻ đạt ngưỡng | Pass |
| TC-M083 | tương phản WCAG — chế độ tối › Chữ mờ trên lớp nổi đạt ngưỡng | Pass |
| TC-M084 | tương phản WCAG — chế độ tối › Chữ trên nút chính đạt ngưỡng | Pass |
| TC-M085 | tương phản WCAG — chế độ tối › Chữ trên nhãn Bị mất đạt ngưỡng | Pass |
| TC-M086 | tương phản WCAG — chế độ tối › Chữ trên nhãn Tìm thấy đạt ngưỡng | Pass |
| TC-M087 | tương phản WCAG — chế độ tối › Chữ trên nhãn Đã đoàn tụ đạt ngưỡng | Pass |
| TC-M088 | tương phản WCAG — chế độ tối › Chữ xanh chủ đạo trên nền đạt ngưỡng | Pass |
| TC-M089 | tương phản WCAG — chế độ tối › Chữ xanh chủ đạo trên thẻ đạt ngưỡng | Pass |
| TC-M090 | tương phản WCAG — chế độ tối › Chữ đỏ nút xoá trên nền đạt ngưỡng | Pass |
| TC-M091 | tương phản WCAG — chế độ tối › Chữ đỏ nút xoá trên thẻ đạt ngưỡng | Pass |
| TC-M092 | tương phản WCAG — chế độ tối › Chữ nút Đã đoàn tụ đạt ngưỡng | Pass |
| TC-M093 | tương phản WCAG — chế độ tối › Cảnh báo lừa đảo đạt ngưỡng | Pass |
| TC-M094 | tương phản WCAG — chế độ tối › Đặc điểm bí mật đạt ngưỡng | Pass |
| TC-M095 | tương phản WCAG — chế độ tối › Chữ AI trên nền AI đạt ngưỡng | Pass |
| TC-M096 | tương phản WCAG — chế độ tối › Chữ trên nút AI đạt ngưỡng | Pass |
| TC-M097 | tương phản WCAG — chế độ tối › Chữ trên khung liên hệ đạt ngưỡng | Pass |
| TC-M098 | tương phản WCAG — chế độ tối › Tên app ở đầu trang đạt ngưỡng | Pass |
| TC-M099 | tương phản WCAG — chế độ tối › Nhãn TIN MỚI NHẤT đạt ngưỡng | Pass |
| TC-M100 | tương phản WCAG — chế độ tối › Nhãn LIÊN HỆ đạt ngưỡng | Pass |
| TC-M101 | tương phản WCAG — chế độ tối › Nhãn ADMIN đạt ngưỡng | Pass |
| TC-M102 | tương phản WCAG — chế độ tối › Chữ trên nút Google đạt ngưỡng | Pass |
| TC-M103 | tương phản WCAG — chế độ tối › Viền nút Google đạt ngưỡng | Pass |
| TC-M104 | tương phản WCAG — chế độ tối › Chữ trên nút Facebook đạt ngưỡng | Pass |
| TC-M105 | tương phản WCAG — chế độ tối › Viền nút bấm so với nền đạt ngưỡng | Pass |
| TC-M106 | tương phản WCAG — chế độ tối › Viền nút bấm so với thẻ đạt ngưỡng | Pass |
| TC-M107 | tương phản WCAG — chế độ tối › Viền nút bấm trên lớp nổi đạt ngưỡng | Pass |
| TC-M108 | hai bảng màu phải có đúng từng ấy màu › cùng số lượng và cùng tên | Pass |
| TC-M109 | hai bảng màu phải có đúng từng ấy màu › mọi giá trị đều là mã màu hợp lệ hoặc rgba | Pass |
| TC-M110 | statusStyle — nhãn trạng thái › tin đã đoàn tụ thắng mọi thứ khác | Pass |
| TC-M111 | statusStyle — nhãn trạng thái › tin báo mất | Pass |
| TC-M112 | statusStyle — nhãn trạng thái › tin nhặt được | Pass |
| TC-M113 | statusStyle — nhãn trạng thái › trả về cả màu chữ, không để nơi gọi tự nghĩ | Pass |

### Giao diện song ngữ Việt/Anh

| Mã | Test case | Kết quả |
|---|---|---|
| TC-M114 | hai thứ tiếng › có cùng bộ tên câu | Pass |
| TC-M115 | hai thứ tiếng › không có câu nào bỏ trống | Pass |
| TC-M116 | hai thứ tiếng › chỗ nội suy {..} khớp nhau giữa hai bản | Pass |
| TC-M117 | quy ước đặt tên › mọi tên câu đều có dạng khu-vuc.ten-cu-the | Pass |
| TC-M118 | quy ước đặt tên › không có tên câu nào trùng nhau | Pass |
| TC-M119 | không còn ký tự dùng làm icon trong chữ › bản vi | Pass |
| TC-M120 | không còn ký tự dùng làm icon trong chữ › bản en | Pass |

### Quy tắc giao diện: vùng chạm, icon, API đã bị bỏ

| Mã | Test case | Kết quả |
|---|---|---|
| TC-M121 | vùng chạm tối thiểu 44pt › AdminScreen.tsx | Pass |
| TC-M122 | vùng chạm tối thiểu 44pt › AuthScreen.tsx | Pass |
| TC-M123 | vùng chạm tối thiểu 44pt › ChatScreen.tsx | Pass |
| TC-M124 | vùng chạm tối thiểu 44pt › DetailScreen.tsx | Pass |
| TC-M125 | vùng chạm tối thiểu 44pt › FormScreen.tsx | Pass |
| TC-M126 | vùng chạm tối thiểu 44pt › HomeScreen.tsx | Pass |
| TC-M127 | vùng chạm tối thiểu 44pt › MyPetsScreen.tsx | Pass |
| TC-M128 | vùng chạm tối thiểu 44pt › PrivacyScreen.tsx | Pass |
| TC-M129 | vùng chạm tối thiểu 44pt › SettingsScreen.tsx | Pass |
| TC-M130 | vùng chạm tối thiểu 44pt › SplashScreen.tsx | Pass |
| TC-M131 | vùng chạm tối thiểu 44pt › AdminReports.tsx | Pass |
| TC-M132 | vùng chạm tối thiểu 44pt › ClaimCodeModal.tsx | Pass |
| TC-M133 | vùng chạm tối thiểu 44pt › PetCard.tsx | Pass |
| TC-M134 | vùng chạm tối thiểu 44pt › PetFilters.tsx | Pass |
| TC-M135 | vùng chạm tối thiểu 44pt › PetMap.tsx | Pass |
| TC-M136 | vùng chạm tối thiểu 44pt › PetMapView.tsx | Pass |
| TC-M137 | vùng chạm tối thiểu 44pt › ReportModal.tsx | Pass |
| TC-M138 | vùng chạm tối thiểu 44pt › ResolveNudge.tsx | Pass |
| TC-M139 | vùng chạm tối thiểu 44pt › SocialLogin.tsx | Pass |
| TC-M140 | không dùng ký tự làm icon › AdminScreen.tsx | Pass |
| TC-M141 | không dùng ký tự làm icon › AuthScreen.tsx | Pass |
| TC-M142 | không dùng ký tự làm icon › ChatScreen.tsx | Pass |
| TC-M143 | không dùng ký tự làm icon › DetailScreen.tsx | Pass |
| TC-M144 | không dùng ký tự làm icon › FormScreen.tsx | Pass |
| TC-M145 | không dùng ký tự làm icon › HomeScreen.tsx | Pass |
| TC-M146 | không dùng ký tự làm icon › MyPetsScreen.tsx | Pass |
| TC-M147 | không dùng ký tự làm icon › PrivacyScreen.tsx | Pass |
| TC-M148 | không dùng ký tự làm icon › SettingsScreen.tsx | Pass |
| TC-M149 | không dùng ký tự làm icon › SplashScreen.tsx | Pass |
| TC-M150 | không dùng ký tự làm icon › AdminReports.tsx | Pass |
| TC-M151 | không dùng ký tự làm icon › ClaimCodeModal.tsx | Pass |
| TC-M152 | không dùng ký tự làm icon › PetCard.tsx | Pass |
| TC-M153 | không dùng ký tự làm icon › PetFilters.tsx | Pass |
| TC-M154 | không dùng ký tự làm icon › PetMap.tsx | Pass |
| TC-M155 | không dùng ký tự làm icon › PetMapView.tsx | Pass |
| TC-M156 | không dùng ký tự làm icon › ReportModal.tsx | Pass |
| TC-M157 | không dùng ký tự làm icon › ResolveNudge.tsx | Pass |
| TC-M158 | không dùng ký tự làm icon › SocialLogin.tsx | Pass |
| TC-M159 | không dùng StyleSheet.absoluteFillObject › AdminScreen.tsx | Pass |
| TC-M160 | không dùng StyleSheet.absoluteFillObject › AuthScreen.tsx | Pass |
| TC-M161 | không dùng StyleSheet.absoluteFillObject › ChatScreen.tsx | Pass |
| TC-M162 | không dùng StyleSheet.absoluteFillObject › DetailScreen.tsx | Pass |
| TC-M163 | không dùng StyleSheet.absoluteFillObject › FormScreen.tsx | Pass |
| TC-M164 | không dùng StyleSheet.absoluteFillObject › HomeScreen.tsx | Pass |
| TC-M165 | không dùng StyleSheet.absoluteFillObject › MyPetsScreen.tsx | Pass |
| TC-M166 | không dùng StyleSheet.absoluteFillObject › PrivacyScreen.tsx | Pass |
| TC-M167 | không dùng StyleSheet.absoluteFillObject › SettingsScreen.tsx | Pass |
| TC-M168 | không dùng StyleSheet.absoluteFillObject › SplashScreen.tsx | Pass |
| TC-M169 | không dùng StyleSheet.absoluteFillObject › AdminReports.tsx | Pass |
| TC-M170 | không dùng StyleSheet.absoluteFillObject › ClaimCodeModal.tsx | Pass |
| TC-M171 | không dùng StyleSheet.absoluteFillObject › PetCard.tsx | Pass |
| TC-M172 | không dùng StyleSheet.absoluteFillObject › PetFilters.tsx | Pass |
| TC-M173 | không dùng StyleSheet.absoluteFillObject › PetMap.tsx | Pass |
| TC-M174 | không dùng StyleSheet.absoluteFillObject › PetMapView.tsx | Pass |
| TC-M175 | không dùng StyleSheet.absoluteFillObject › ReportModal.tsx | Pass |
| TC-M176 | không dùng StyleSheet.absoluteFillObject › ResolveNudge.tsx | Pass |
| TC-M177 | không dùng StyleSheet.absoluteFillObject › SocialLogin.tsx | Pass |
| TC-M178 | Tailwind khớp với theme.ts › thang khoảng cách giống hệt nhau | Pass |
| TC-M179 | Tailwind khớp với theme.ts › bo góc giống nhau, trừ full vốn chỉ cần đủ lớn | Pass |
| TC-M180 | Tailwind khớp với theme.ts › global.css đã chạy lại sau lần đổi màu gần nhất | Pass |

### Các hàm thuần: thời gian, bộ lọc, đọc mã lỗi

| Mã | Test case | Kết quả |
|---|---|---|
| TC-M181 | timeAgo — các đường ranh giới › chưa tới một phút thì ghi "Vừa xong" | Pass |
| TC-M182 | timeAgo — các đường ranh giới › đúng một phút thì chuyển sang đếm phút | Pass |
| TC-M183 | timeAgo — các đường ranh giới › 59 phút vẫn là phút, 60 phút thành giờ | Pass |
| TC-M184 | timeAgo — các đường ranh giới › 23 giờ vẫn là giờ, 24 giờ thành ngày | Pass |
| TC-M185 | timeAgo — các đường ranh giới › 29 ngày vẫn đếm ngày, 30 ngày thì quay về ngày tháng | Pass |
| TC-M186 | timeAgo — các đường ranh giới › tháng viết tắt đổi theo ngôn ngữ | Pass |
| TC-M187 | timeAgo — các đường ranh giới › bản tiếng Anh dùng đúng kho chữ tiếng Anh | Pass |
| TC-M188 | countActiveFilters — đếm số điều kiện lọc đang bật › mặc định thì không có điều kiện nào | Pass |
| TC-M189 | countActiveFilters — đếm số điều kiện lọc đang bật › "newest" là mặc định nên KHÔNG tính là một điều kiện | Pass |
| TC-M190 | countActiveFilters — đếm số điều kiện lọc đang bật › khu vực chỉ toàn khoảng trắng thì không tính | Pass |
| TC-M191 | countActiveFilters — đếm số điều kiện lọc đang bật › cộng dồn được | Pass |
| TC-M192 | errorStatus — lấy mã HTTP ra từ một lỗi bắt được › lấy được mã từ lỗi của axios | Pass |
| TC-M193 | errorStatus — lấy mã HTTP ra từ một lỗi bắt được › lỗi mạng của axios thì không có mã, trả undefined | Pass |
| TC-M194 | errorStatus — lấy mã HTTP ra từ một lỗi bắt được › lỗi thường không phải của axios thì cũng không ném | Pass |
| TC-M195 | report — nhớ tin đã báo cáo › chưa báo cáo thì trả về false | Pass |
| TC-M196 | report — nhớ tin đã báo cáo › đánh dấu rồi thì nhớ | Pass |
| TC-M197 | report — nhớ tin đã báo cáo › mỗi tin một chỗ nhớ riêng, không lẫn sang tin khác | Pass |
| TC-M198 | report — nhớ tin đã báo cáo › id rỗng thì không ghi và không nhận nhầm | Pass |
| TC-M199 | report — nhớ tin đã báo cáo › lưu kèm mốc thời gian chứ không chỉ lưu cờ có/không | Pass |
| TC-M200 | buildParams — tham số gửi lên máy chủ › không lọc gì thì chỉ gửi ba tham số bắt buộc | Pass |
| TC-M201 | buildParams — tham số gửi lên máy chủ › câu tìm kiếm rỗng thì không gửi q | Pass |
| TC-M202 | buildParams — tham số gửi lên máy chủ › cắt khoảng trắng thừa quanh câu tìm kiếm | Pass |
| TC-M203 | buildParams — tham số gửi lên máy chủ › giữ nguyên dấu tiếng Việt, không bỏ dấu | Pass |
| TC-M204 | buildParams — tham số gửi lên máy chủ › skip đi thẳng vào tham số, không nhân chia gì | Pass |
| TC-M205 | buildParams — tham số gửi lên máy chủ › lọc và tìm kiếm dùng được cùng lúc | Pass |
| TC-M206 | thumbnail — xin Cloudinary thu nhỏ ảnh › chèn lệnh thu nhỏ vào ngay sau /upload/ | Pass |
| TC-M207 | thumbnail — xin Cloudinary thu nhỏ ảnh › giữ nguyên si phần đuôi chứa mã ảnh | Pass |
| TC-M208 | thumbnail — xin Cloudinary thu nhỏ ảnh › bề ngang truyền vào bao nhiêu thì xin bấy nhiêu | Pass |
| TC-M209 | thumbnail — xin Cloudinary thu nhỏ ảnh › địa chỉ không phải Cloudinary thì trả nguyên si | Pass |
| TC-M210 | thumbnail — xin Cloudinary thu nhỏ ảnh › đã có sẵn lệnh biến đổi thì không chèn chồng lên | Pass |
| TC-M211 | thumbnail — xin Cloudinary thu nhỏ ảnh › không có ảnh thì trả chuỗi rỗng, không trả undefined | Pass |
| TC-M212 | nudge — giữ nhịp hỏi › lần đầu thì được phép dò và được phép hỏi | Pass |
| TC-M213 | nudge — giữ nhịp hỏi › dò xong thì im trong 12 tiếng | Pass |
| TC-M214 | nudge — giữ nhịp hỏi › hoãn rồi thì không hỏi lại tin đó nữa | Pass |
| TC-M215 | nudge — giữ nhịp hỏi › hoãn tin này không làm im tin khác | Pass |
| TC-M216 | nudge — giữ nhịp hỏi › quên rồi thì lại được phép hỏi | Pass |
| TC-M217 | nudge — giữ nhịp hỏi › dữ liệu hỏng thì vẫn cho hỏi, không im luôn | Pass |
| TC-M218 | nudge — giữ nhịp hỏi › hoãn 0 ngày thì hỏi lại được ngay | Pass |
| TC-M219 | claim.list — tin của máy này › chưa đăng tin nào thì trả mảng rỗng | Pass |
| TC-M220 | claim.list — tin của máy này › trả về đúng id, đã bỏ tiền tố | Pass |
| TC-M221 | claim.list — tin của máy này › không lẫn khoá của thứ khác | Pass |

### Thẻ tin đăng — vẽ thật và tương tác

| Mã | Test case | Kết quả |
|---|---|---|
| TC-M222 | PetCard vẽ ra được › không nổ, và hiện tên con vật | Pass |
| TC-M223 | PetCard vẽ ra được › không có tên thì lấy giống thay thế | Pass |
| TC-M224 | PetCard vẽ ra được › hiện khu vực | Pass |
| TC-M225 | PetCard vẽ ra được › mặc định KHÔNG hiện mã tin | Pass |
| TC-M226 | PetCard vẽ ra được › bật showCode thì mới hiện mã tin | Pass |
| TC-M227 | PetCard vẽ ra được › bấm vào thì gọi onPress đúng một lần | Pass |
| TC-M228 | nhãn trạng thái › tin báo mất | Pass |
| TC-M229 | nhãn trạng thái › tin nhặt được | Pass |
| TC-M230 | nhãn trạng thái › đã đoàn tụ thì thắng cả type | Pass |
| TC-M231 | nhãn trạng thái › chữ trên nhãn dùng màu riêng của nhãn đó, không phải màu cố định | Pass |
| TC-M232 | ảnh › có ảnh thì vẽ đúng ảnh đó | Pass |
| TC-M233 | ảnh › không có ảnh thì vẽ logo thay thế, không để trống | Pass |
| TC-M234 | ghim địa chỉ vẽ bằng icon › dùng icon location chứ không phải ký tự 📍 | Pass |
| TC-M235 | PetCard — hàng dưới cùng luôn có nội dung › biết vị trí người xem thì hiện khoảng cách | Pass |
| TC-M236 | PetCard — hàng dưới cùng luôn có nội dung › chưa biết vị trí thì mời bấm vào, không để trống | Pass |
| TC-M237 | PetCard — hàng dưới cùng luôn có nội dung › tin không có toạ độ thì cũng mời bấm vào | Pass |
| TC-M238 | PetCard — hàng dưới cùng luôn có nội dung › bật showCode thì mã tin thắng khoảng cách | Pass |

