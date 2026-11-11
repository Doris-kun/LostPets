# LostPets — nền tảng tìm thú cưng thất lạc

Web giúp người mất thú cưng và người nhặt được tìm thấy nhau. Ai cũng đăng tin
và xem tin được, không bắt buộc tài khoản. Phần khó nằm ở chỗ **ghép hai tin
lại với nhau**: hệ thống tự tìm những tin ngược loại có khả năng là cùng một
con vật, xếp theo độ giống về ngữ nghĩa, rồi để AI chấm lần cuối.

- Web: https://lostpets-1.onrender.com
- API: https://lostpets-kz3s.onrender.com

Ứng dụng điện thoại viết bằng React Native nằm ở thư mục `mobile/`, trên các
nhánh `feat/mobile-*`.

## Chạy thử

Cần Node 24 và một MongoDB (cục bộ hoặc Atlas).

```bash
# Back-end
cd back-end
npm install
cp .env.example .env     # rồi điền các biến, xem chú thích ngay trong file
npm start                # cổng 3000

# Front-end, ở cửa sổ khác
cd front-end
npm install
npm run serve            # cổng 8080
```

Thiếu biến môi trường nào thì phần ấy tự tắt chứ không làm sập web: không có
`GEMINI_API_KEY` thì tìm kiếm lui về lọc theo chữ, không có `JWT_SECRET` thì
tắt đăng nhập, không có thiết lập gửi thư thì nút quên mật khẩu báo 503 kèm
thông báo rõ ràng. Mọi biến đều có chú thích trong `back-end/.env.example`.

Có sẵn `docker-compose.yml` nếu muốn chạy cả hai trong container.

## Kiến trúc

| Tầng | Dùng gì |
|---|---|
| Front-end | Vue 2, Vue CLI 5, Tailwind 3.4, Leaflet |
| Back-end | Express 5, Mongoose 6 |
| Dữ liệu | MongoDB Atlas |
| Ảnh | Cloudinary |
| AI | Google Gemini — nhúng vector, so khớp, trợ lý |
| Gửi thư | HTTP API của Brevo, lui về SMTP khi chạy ở máy |
| Thông báo đẩy | Expo |

```
back-end/
  api/
    controllers/   xử lý request
    lib/           nhúng vector, so khớp, khoảng cách, gửi thư, thông báo đẩy
    middleware/    xác thực, giới hạn tần suất
    models/        schema Mongoose
    routes/
  scripts/         nạp dữ liệu mẫu, đo độ chính xác, kiểm cấu hình thư, đo tải
  tests/           toàn bộ test, chạy trên MongoDB trong bộ nhớ
front-end/src/
  views/           từng trang
  components/      bản đồ, hộp chat, hộp báo cáo
mobile/            ứng dụng React Native
```

## Tính năng

**Đăng tin và tìm kiếm.** Đăng tin mất hoặc nhặt được kèm ảnh, loài, giống,
màu, khu vực, mô tả và liên hệ. Lọc theo loại, loài, khu vực, khoảng thời
gian. Ô tìm kiếm hiểu theo nghĩa chứ không chỉ khớp chữ.

**Bản đồ.** Ghim vị trí lúc đăng, xem các tin quanh mình, biết mỗi tin cách
bao xa. Ô khu vực tự điền tên quận từ vị trí đã ghim.

**So khớp tự động.** Với mỗi tin, hệ thống tìm các tin ngược loại cùng loài
trong bán kính 50km và 120 ngày, xếp theo độ giống vector, rồi đưa AI chấm.

**Tài khoản.** Đăng ký bằng email và mật khẩu, hoặc đăng nhập bằng Google.
Quên mật khẩu thì nhận đường dẫn đặt lại qua email, dùng một lần, hết hạn sau
một giờ. Khách vãng lai vẫn đăng tin được, sửa và xoá bằng mã xác nhận.

**Thông báo đẩy.** Ứng dụng điện thoại nhận thông báo khi có tin ngược loại
cùng loài trong vòng 10km.

**Quản trị.** Xem và gỡ tin, xử lý báo cáo, dọn tin đã đoàn tụ quá hạn.

**Hai ngôn ngữ.** Tiếng Việt và tiếng Anh, 286 khoá mỗi bên.

## Vài quyết định đáng chú ý

Những chỗ này đều có đo đạc hoặc lý do cụ thể, ghi ngay trong mã:

**Toạ độ được làm nhiễu, không bao giờ lưu bản chính xác.** Làm tròn về lưới
500m ngay lúc gán ở tầng schema. Thú cưng thường mất gần nhà; một điểm ghim
chính xác đặt cạnh số điện thoại công khai là đủ để người lạ tìm ra nơi ở.
Lúc tra tên khu vực từ toạ độ cũng làm tròn trước khi gửi ra ngoài.
→ `back-end/api/models/petModel.js`, `front-end/src/geocode.js`

**So khớp xếp theo vector chứ không theo ngày.** Cách cũ lấy ba tin mới nhất
rồi đưa AI chấm, đo trên 20 cặp gán nhãn thì recall@3 chỉ 20% — tin đúng
thường nằm ngoài ba tin mới nhất nên AI không bao giờ nhìn thấy nó. Xếp cùng
tập ấy theo cosine thì recall@3 lên 100%, recall@1 lên 85%.
→ `back-end/api/lib/matching.js`, số đo ở `back-end/eval/results.md`

**AI không được tự viết câu giải thích.** Có lần nó mô tả một con mèo đen là
"có màu lông xám". Giờ schema đầu ra không còn trường văn bản tự do; câu giải
thích ghép từ dữ liệu trong database.
→ `back-end/api/controllers/aiController.js`

**Vector chỉ được sắp thứ tự, không được loại bỏ.** Đo trên tiếng Việt thì
không có ngưỡng điểm nào dùng được: câu rác "xe máy Honda Wave bị mất" đạt
0.646 trong khi câu tra số điện thoại thật chỉ 0.639.
→ `back-end/api/controllers/petController.js`

**Chữ tiếng Việt được quy về NFC ở tầng schema.** Bàn phím iOS hay gửi NFD,
nhìn giống hệt nhau nhưng khác từng byte. Đo trên bản chạy thật: `species=Mèo`
kiểu NFC ra 9 kết quả, kiểu NFD ra 0.
→ `back-end/api/models/petModel.js`

**Quên mật khẩu trả lời trong thời gian như nhau** dù email có tài khoản hay
không. Cùng một câu chữ mà lệch thời gian thì bấm giờ vẫn dò ra được ai đã
đăng ký.
→ `back-end/api/controllers/authController.js`

**Gửi thư đi đường HTTP API.** Render chặn cổng SMTP trên gói miễn phí từ
tháng 9/2025. Cổng 443 không bị chặn.
→ `back-end/api/lib/mailer.js`

## Lệnh có sẵn

```bash
cd back-end
npm test                 # toàn bộ test back-end
npm run test:report      # xuất bảng test case ra eval/test-cases.md
npm run eval:matching    # đo recall của tầng so khớp
npm run check:mail       # kiểm cấu hình gửi thư, nói rõ hỏng ở đâu
npm run seed             # nạp dữ liệu mẫu
npm run embed            # nhúng vector cho các tin chưa có
node scripts/bench-list.js   # đo thông lượng danh sách
```

Mỗi lần đẩy lên `main` hoặc mở pull request, GitHub Actions chạy lại toàn bộ
test. Có một workflow nữa gọi đợt dọn tin đã đoàn tụ quá hạn.

## Kiểm thử

Test back-end chạy trên MongoDB trong bộ nhớ, không gọi mạng ra ngoài.
Số lượng và bảng test case theo nhóm chức năng nằm ở
`back-end/eval/test-cases.md`, sinh tự động bằng `npm run test:report` —
chép số vào đây thì nó lệch ngay lần thêm test tiếp theo.

Cách viết test ở đây: viết xong thì **cố tình phá lại từng tính chất một** và
xác nhận test đỏ. Một test không bao giờ đỏ là một test không canh gì cả.

Front-end hiện chưa có test.
