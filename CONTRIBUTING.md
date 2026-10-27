# Hướng dẫn tham gia dự án

Tài liệu cho người mới vào dự án LostPets. Đọc hết một lượt rồi làm theo thứ tự.

Dự án là web đăng tin thú cưng thất lạc / nhặt được. Stack: **MEVN** — MongoDB, Express, Vue 2, Node.js. Không có đăng nhập, mọi tính năng đều public.

---

## 1. Cài đặt lần đầu

### Yêu cầu

- **Node.js 24** — xem mục "Về phiên bản Node" ở cuối phần này trước khi cài bản khác
- Tài khoản MongoDB Atlas (free) hoặc MongoDB cài trên máy
- Tài khoản Cloudinary (free) — dùng để lưu ảnh

### Các bước

```bash
git clone https://github.com/Doris-kun/LostPets.git
cd LostPets

cd back-end
npm install
cd ../front-end
npm install
```

### Về phiên bản Node

**Cả nhóm dùng Node 24, và CI cũng chạy Node 24.** Không phải vì code cần đúng bản đó, mà vì `package-lock.json`.

Mỗi phiên bản npm giải các phụ thuộc gián tiếp ra kết quả hơi khác nhau. Nếu bạn sinh lockfile bằng npm 11 (đi kèm Node 24) rồi CI đọc bằng npm 10 (đi kèm Node 20), CI sẽ dừng với lỗi kiểu:

```
npm error `npm ci` can only install packages when your package.json
and package-lock.json are in sync.
npm error Missing: gcp-metadata@7.0.1 from lock file
```

Lỗi này từng làm CI đỏ và rất khó đoán, vì `npm install` ở máy vẫn chạy bình thường — nó tự vá lockfile khi thiếu, còn `npm ci` thì từ chối.

Kiểm tra máy bạn:

```bash
node -v   # v24.x
npm -v    # 11.x
```

Nếu lệch thì cài Node 24 (dùng [nvm-windows](https://github.com/coreybutler/nvm-windows) hoặc [nvm](https://github.com/nvm-sh/nvm) cho máy Linux/macOS) trước khi commit bất kỳ thay đổi nào chạm tới `package-lock.json`.

Và khi thêm thư viện mới, **luôn commit kèm `package-lock.json`** — thiếu nó thì CI cài bản khác với máy bạn.

### Tạo file `.env`

File `.env` **không có trong repo** (chứa mật khẩu nên bị `.gitignore` chặn). Mỗi người tự tạo trên máy mình:

```bash
cd back-end
cp .env.example .env
```

PowerShell thì dùng `copy .env.example .env`.

Mở `back-end/.env` và điền giá trị của **tài khoản riêng của bạn**:

```
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/lost-pets?retryWrites=true&w=majority
```

- **Cloudinary**: đăng ký tại console.cloudinary.com, lấy key ở Settings → API Keys
- **MongoDB**: tạo cluster M0 free tại cloud.mongodb.com, hoặc cài MongoDB trên máy rồi dùng `mongodb://localhost:27017/lost-pets`

Nên dùng tài khoản riêng thay vì xài chung, để hai người test không ghi đè dữ liệu của nhau.

> **Tuyệt đối không commit file `.env`.** Nếu thấy nó xuất hiện trong `git status` thì báo ngay, đừng commit.

---

## 2. Chạy dự án

Mở **2 terminal** riêng:

```bash
# Terminal 1 — API
cd back-end
npm start           # http://localhost:3000
```

```bash
# Terminal 2 — giao diện
cd front-end
npm run serve       # http://localhost:8080
```

Back-end chạy thành công sẽ in `Connected to MongoDB`. Nếu lỗi kết nối, nó tự thử lại mỗi 5 giây — kiểm tra lại `MONGODB_URI` và phần Network Access trên Atlas.

Front-end mặc định gọi API ở `http://localhost:3000`. Muốn đổi thì tạo file `front-end/.env` với `VUE_APP_API_URL=...`.

### Chạy test

```bash
cd back-end
npm test
```

Test dùng `mongodb-memory-server` nên không cần MongoDB thật, cũng không cần `.env`.

---

## 3. Quy trình làm việc trên Git

Nhánh `main` đã được khoá: **không ai push thẳng lên được**, kể cả chủ repo. Mọi thay đổi đều phải đi qua Pull Request, có CI pass và được người kia duyệt.

### Mỗi lần làm một việc mới

```bash
git checkout main
git pull origin main                  # lấy code mới nhất

git checkout -b feat/ten-tinh-nang    # tạo nhánh riêng
# ... sửa code ...
git add .
git commit -m "feat: mô tả ngắn việc đã làm"
git push -u origin feat/ten-tinh-nang
```

Sau khi push, GitHub in ra link tạo PR ngay trong terminal. Hoặc vào tab **Pull requests** trên GitHub → **New pull request**.

Trong trang tạo PR:

1. Kiểm tra dòng trên cùng: `base: main` ← `compare: nhánh của bạn`
2. Cột phải, mục **Reviewers** → chọn người còn lại
3. Bấm **Create pull request**

### Đặt tên nhánh

| Tiền tố | Dùng khi | Ví dụ |
|---|---|---|
| `feat/` | thêm tính năng mới | `feat/filter-by-area` |
| `fix/` | sửa lỗi | `fix/image-upload-crash` |
| `refactor/` | dọn code, không đổi hành vi | `refactor/pet-controller` |
| `docs/` | sửa tài liệu | `docs/api-contract` |
| `chore/` | việc vặt, cấu hình | `chore/update-deps` |

### Duyệt PR của người kia

1. Vào PR → tab **Files changed**
2. Góc trên bên phải bấm **Review changes**
3. Chọn **Approve** — không phải Comment, vì Comment không mở khoá được nút merge
4. Bấm **Submit review**

Không ai tự duyệt PR của chính mình được. Hai người duyệt chéo cho nhau.

### Merge

Khi CI xanh và có 1 approve, nút **Merge pull request** sáng lên:

1. Bấm mũi tên ▾ cạnh nút → chọn **Squash and merge**
2. Xác nhận
3. Bấm **Delete branch**

Rồi về máy dọn lại:

```bash
git checkout main
git pull origin main
git branch -d ten-nhanh-vua-merge
```

### Khi bị conflict

```bash
git checkout nhanh-cua-ban
git pull origin main        # kéo main mới về nhánh mình
# mở file bị conflict, xoá các dấu <<<<<<< ======= >>>>>>>
git add .
git commit
git push
```

Luôn giải quyết conflict **trên nhánh của mình**, không bao giờ trên `main`.

---

## 4. Phân chia công việc

Dự án tách sẵn hai thư mục, mỗi người giữ một bên để tránh sửa trùng file:

| Thư mục | Nội dung |
|---|---|
| `back-end/` | Express, Mongoose model, routes, controller, upload Cloudinary, test |
| `front-end/` | Vue 2, các view, component, Tailwind, gọi API bằng axios |
| `mobile/` | App điện thoại: React Native + Expo, dùng chung back-end với web |

Khi một tính năng cần cả hai bên (ví dụ thêm một trường dữ liệu mới), làm tuần tự: **back-end merge trước**, front-end pull về rồi làm sau. Và nhớ cập nhật mục API bên dưới trong cùng PR đó.

### Chạy app mobile

```bash
cd mobile
npm install
npm start
```

Quét mã QR bằng **Expo Go** — Android quét ngay trong app, iPhone quét bằng app Camera.

App tự tìm địa chỉ máy tính từ đường dẫn Metro, nên **không phải sửa IP bằng tay**.
Nếu vì lý do nào đó tìm không ra, sửa `LAN_IP` trong `mobile/src/config.js` làm địa chỉ dự phòng
(xem IP bằng `ipconfig`). Điện thoại không hiểu `localhost` — với nó, `localhost` là chính cái điện thoại.

Điện thoại và máy tính phải chung một mạng. Wi-Fi trường hoặc quán thường chặn thiết bị
nói chuyện với nhau — gặp trường hợp đó thì phát 4G từ điện thoại rồi cho máy tính nối vào.

Phiên bản Expo SDK phải khớp với app Expo Go trên máy. Apple chỉ cho cài bản Expo Go mới nhất,
nên khi Expo ra SDK mới thì phải nâng theo: `npm install expo@^<bản mới>` rồi `npx expo install --fix`.

App hiện có: CRUD, lọc nâng cao, phân trang, song ngữ Việt/Anh, chế độ sáng/tối,
đăng nhập, Bài của tôi, chia sẻ bài. **Chưa có:** ba chức năng AI và trang quản trị.

---

## 5. API

Base URL khi chạy local: `http://localhost:3000`

Tất cả endpoint đều public, không cần token.

API chỉ nhận request từ các domain liệt kê trong biến môi trường `FRONTEND_URL` (ngăn cách bằng dấu phẩy). Để trống thì mở cho mọi domain và in cảnh báo trong log — tiện lúc phát triển, nhưng production phải đặt.

### `GET /pets` — lấy danh sách

Tham số query, tất cả đều tuỳ chọn:

| Tham số | Kiểu | Ý nghĩa |
|---|---|---|
| `type` | `lost` hoặc `found` | lọc theo loại tin |
| `species` | string | lọc theo loài, khớp một phần, không phân biệt hoa thường |
| `breed` | string | lọc theo giống, khớp một phần |
| `color` | string | lọc theo màu, khớp một phần |
| `area` | string | lọc theo khu vực, khớp một phần |
| `resolved` | `true` hoặc `false` | đã tìm thấy hay chưa |
| `days` | số | chỉ lấy tin trong N ngày gần đây |
| `sort` | `oldest` | mặc định là mới nhất trước |
| `limit` | số | mặc định `9`, tối đa `50` |
| `skip` | số | bỏ qua N bản ghi đầu, dùng để phân trang |

Phản hồi `200`:

```json
{
  "pets": [ { "...": "object pet" } ],
  "total": 42
}
```

`total` là tổng số bản ghi **khớp bộ lọc**, không phải số bản ghi trả về trong trang hiện tại. Dùng nó để tính số trang.

### `POST /pets` — đăng tin mới

Gửi dạng `multipart/form-data` nếu có ảnh (field tên `image`, 1 file). Không có ảnh thì gửi JSON cũng được.

| Trường | Bắt buộc | Ghi chú |
|---|---|---|
| `type` | có | `lost` hoặc `found` |
| `species` | có | loài |
| `breed` | có | giống |
| `color` | có | màu |
| `area` | có | khu vực |
| `contact` | có | thông tin liên hệ |
| `name` | không | tên thú cưng |
| `secretDetail` | không | đặc điểm chỉ chủ nuôi biết, không bao giờ hiển thị công khai |
| `lat`, `lng` | không | toạ độ nơi mất hoặc nhặt được, dùng để vẽ lên bản đồ |
| `description` | không | mô tả thêm |
| `image` | không | file ảnh, server tự upload lên Cloudinary |

Phản hồi `201`: object pet vừa tạo, **kèm trường `claimCode`**. Server tự sinh `postId` dạng `L-XXXXXX` cho tin lost, `F-XXXXXX` cho tin found.

`claimCode` là mã xác nhận, **chỉ trả về đúng lần này**. Database chỉ lưu bản băm SHA-256 nên không có cách nào đọc lại. Front-end lưu mã vào `localStorage` để người đăng sửa/xoá được sau.

Thiếu trường bắt buộc thì nhận `400` với body `{ "message": "All fields are required" }`.

### `GET /pets/:petId` — xem chi tiết

`petId` là `_id` của MongoDB. Không tìm thấy thì nhận `404` với body `{ "message": "Pet not found" }`.

Trường **`secretDetail` chỉ trả về cho chủ tin** — người gửi `Authorization` đúng tài khoản đã đăng, hoặc gửi header `x-claim-code` đúng mã. Khách xem tin không bao giờ nhận được trường này, kể cả ở danh sách chung hay lúc vừa tạo tin.

Đây là lớp chống lừa đảo: kẻ gian lấy ảnh từ tin đăng rồi dùng AI dựng ảnh giả để đòi tiền chuộc, nhưng không thể biết một đặc điểm chưa từng công khai.

### `PUT /pets/:petId` — cập nhật

Chỉ cần gửi những trường muốn đổi. Trả về object sau khi đã cập nhật.

Gửi dạng `multipart/form-data` nếu có đổi ảnh (field `image`, 1 file), còn lại gửi JSON cũng được.

Ai được sửa, theo thứ tự xét:

1. **Chủ tài khoản đã đăng tin đó** — gửi `Authorization: Bearer <token>`, không cần mã. Đổi máy vẫn sửa được.
2. **Người cầm mã xác nhận** — gửi header `x-claim-code: <mã>` (hoặc `claimCode` trong body). Dành cho khách vãng lai.
3. Tin cũ không có cả hai thứ trên thì vẫn sửa được tự do.

Tin đã có chủ thì khách vãng lai không sửa được, kể cả khi tin đó cũng có mã.

**Chỉ những trường này sửa được**: `type`, `name`, `species`, `breed`, `color`, `area`, `contact`, `description`, `resolved`, `secretDetail`, `lat`, `lng`. Gửi thêm trường khác thì bị bỏ qua chứ không báo lỗi.

`owner`, `claimHash`, `postId` và `date` **cố tình không cho sửa** — mở ra thì ai sửa được tin cũng chiếm được quyền sở hữu, khoá tin lại bằng mã của mình, hoặc đổi ngày để tin nằm mãi ở đầu danh sách.

#### Đổi ảnh

`image` và `imageId` cũng **không nằm trong danh sách trên**, kể cả khi gửi dưới dạng chuỗi. Ảnh chỉ đổi được bằng hai cách:

| Muốn gì | Gửi gì |
|---|---|
| Đổi sang ảnh khác | field `image` là một **file** (tối đa 5MB, JPEG/PNG/GIF/WEBP) |
| Gỡ hẳn ảnh khỏi tin | `removeImage` = `true` |
| Giữ nguyên ảnh | không gửi gì cả |

Gửi cả hai thì **file mới thắng**, `removeImage` bị bỏ qua.

Lý do không cho gửi URL dạng chuỗi: ai sửa được tin sẽ trỏ ảnh đi bất kỳ đâu — sang ảnh nhục mạ, hoặc sang một server của họ để đếm xem có bao nhiêu người đang xem tin đó.

Ảnh cũ trên Cloudinary **bị xoá sau khi tin đã lưu xong**, không phải trước. Dọn trước mà lưu lỗi thì tin còn trỏ vào một ảnh vừa bị xoá. Xoá tin cũng dọn luôn ảnh của tin đó.

Server lưu `public_id` của ảnh vào trường `imageId` (`select: false`, không bao giờ trả ra API) để còn biết đường gọi xoá. Tin đăng trước khi có trường này chỉ có URL — code tự moi `public_id` ra từ URL nên vẫn dọn được.

Ảnh vượt 5MB nhận `413`, tệp không phải ảnh nhận `400`, Cloudinary lỗi nhận `502` — tất cả đều là JSON có `message`.

### `DELETE /pets/:petId` — xoá

**Cần mã xác nhận**, giống `PUT`. Phản hồi `200` với body `{ "message": "Pet deleted successfully" }`.

> Tin đăng trước khi có tính năng này không có mã nên vẫn sửa/xoá được tự do. Đó là chủ ý để dữ liệu cũ không bị khoá vĩnh viễn — nếu muốn siết, chạy một script gán mã cho toàn bộ tin cũ.

### Object `pet`

```json
{
  "_id": "6700a1b2c3d4e5f6a7b8c9d0",
  "postId": "L-A1B2C3",
  "type": "lost",
  "name": "Mun",
  "species": "Chó",
  "breed": "Corgi",
  "color": "Nâu trắng",
  "area": "Quận 1, TP.HCM",
  "contact": "0901234567",
  "image": "https://res.cloudinary.com/.../lost-pets/abc.jpg",
  "description": "Mất chiều 12/10 gần công viên",
  "resolved": false,
  "date": "2026-10-12T09:30:00.000Z"
}
```

**Toạ độ luôn được làm mờ trước khi lưu**: làm tròn về lưới 0,005 độ (khoảng 500m) ngay ở setter của model, nên bản chính xác không bao giờ nằm trong database. Thú cưng thường mất gần nhà, ghim chính xác là công khai địa chỉ nhà người đăng — ghép với số điện thoại hiện ngay bên cạnh thì quá nguy hiểm. Giao diện vẽ một vòng tròn bán kính 500m thay vì một chấm, để thể hiện đúng độ chính xác thật sự.

`lat` và `lng` là `null` khi người đăng không chọn vị trí. Server chỉ nhận khi **có đủ cả hai** và nằm trong khoảng hợp lệ; gửi một trong hai, gửi chữ, hay gửi số ngoài khoảng thì bỏ qua cả cặp. Gửi `null` là xoá vị trí.

`image` là chuỗi rỗng khi tin không có ảnh — nhớ xử lý trường hợp này ở front-end.

### `POST /ai/analyze-image` — AI đọc ảnh, điền giúp thông tin

Gửi dạng `multipart/form-data`, field `image` (1 file, tối đa 5MB, JPEG/PNG/GIF/WEBP).

Server gửi ảnh cho Google Gemini (`gemini-3.5-flash-lite`, `thinking_level: minimal`), nhận lại thông tin nhận dạng. Phản hồi `200`:

```json
{
  "species": "Chó",
  "breed": "Corgi",
  "color": "Nâu trắng",
  "description": "Chó nhỏ, chân ngắn, tai dựng, đeo vòng cổ đỏ.",
  "confidence": 87
}
```

Front-end dùng kết quả này để điền sẵn form đăng tin — chỉ điền vào ô còn trống, người dùng vẫn sửa được.

Cần biến môi trường `GEMINI_API_KEY`. Thiếu key thì endpoint trả `503`, phần còn lại của web vẫn chạy bình thường.

| Mã | Khi nào |
|---|---|
| `400` | không gửi ảnh, hoặc file không phải ảnh |
| `422` | ảnh không có chó hoặc mèo |
| `429` | gọi quá nhiều, chờ một chút |
| `503` | chưa cấu hình `GEMINI_API_KEY`, hoặc key sai |
| `504` | AI không trả lời trong 25 giây (bản free hay nghẽn) |

### `GET /ai/match/:petId` — AI gợi ý tin có thể khớp

Lấy tin theo `_id`, tìm trong các tin **ngược loại** (mất ↔ nhặt được) cùng loài, chưa đánh dấu tìm thấy, đăng trong 120 ngày gần đây, tối đa 6 ứng viên. Gửi ảnh và đặc điểm của tất cả cho Gemini chấm điểm.

Phản hồi `200`:

```json
{
  "matches": [
    {
      "pet": { "...": "object pet đầy đủ" },
      "score": 82,
      "reason": "Cùng giống Corgi, màu nâu trắng, khu vực cách nhau 2km và chênh 3 ngày."
    }
  ],
  "candidatesChecked": 4
}
```

Chỉ trả về những tin đạt từ 40 điểm trở lên, sắp xếp điểm cao trước. Không có ứng viên nào thì `matches` là mảng rỗng.

Endpoint được viết để hạn chế báo lỗi nhất có thể:

- Ảnh nào tải không được hoặc lớn hơn 1.5MB thì bỏ qua ảnh đó, vẫn đối chiếu bằng giống, màu, khu vực và thời gian
- Nếu Gemini từ chối request (thường do ảnh), server **tự thử lại một lần chỉ với mô tả chữ** rồi mới báo lỗi
- AI chấm cho một ứng viên không tồn tại thì kết quả đó bị loại

| Mã | Khi nào |
|---|---|
| `404` | không tìm thấy pet theo `_id` |
| `429` | gọi quá nhiều, chờ một chút |
| `503` | chưa cấu hình `GEMINI_API_KEY` |
| `504` | AI không trả lời trong 45 giây |

### `POST /ai/chat` — trợ lý hỗ trợ người dùng

Body JSON:

```json
{
  "messages": [
    { "role": "user", "content": "làm sao đăng tin" },
    { "role": "assistant", "content": "Bạn bấm nút Đăng Báo Cáo..." },
    { "role": "user", "content": "không biết giống thì sao" }
  ]
}
```

Server **không lưu hội thoại**. Front-end giữ lịch sử và gửi lại toàn bộ mỗi lượt, nên tải lại trang là mất.

Phản hồi `200`: `{ "reply": "..." }`

Trợ lý chỉ được biết những gì ghi trong `SYSTEM_INSTRUCTION` ở [chatController.js](back-end/api/controllers/chatController.js). **Thêm hoặc đổi tính năng nào trên web thì phải cập nhật phần đó**, nếu không trợ lý sẽ hướng dẫn sai.

| Mã | Khi nào |
|---|---|
| `400` | không có nội dung, quá 20 lượt, hoặc một tin nhắn dài hơn 1000 ký tự |
| `429` | gọi quá nhiều |
| `502` | trợ lý trả về chuỗi rỗng |
| `503` | chưa cấu hình `GEMINI_API_KEY` |
| `504` | trợ lý không trả lời trong 30 giây |

### Mã lỗi

| Mã | Khi nào |
|---|---|
| `400` | thiếu trường bắt buộc, hoặc tệp tải lên không phải ảnh |
| `403` | domain gọi API không nằm trong `FRONTEND_URL` |
| `413` | ảnh vượt quá 5MB |
| `403` | sai hoặc thiếu mã xác nhận khi sửa/xoá |
| `404` | không tìm thấy pet theo `_id` |
| `500` | lỗi server hoặc lỗi database |

---

## 6. Đăng nhập

Tài khoản là **tuỳ chọn**: khách vãng lai vẫn đăng tin được như trước. Đăng nhập chỉ thêm khả năng xem lại và quản lý tin của mình.

Cần biến môi trường `JWT_SECRET`. Để trống thì các endpoint `/auth/*` trả `503`, phần còn lại của web không bị ảnh hưởng.

### `POST /auth/register`

Body JSON: `name`, `email`, `password` (tối thiểu 6 ký tự).

Phản hồi `201`: `{ "token": "...", "user": { "_id", "name", "email" } }`

| Mã | Khi nào |
|---|---|
| `400` | thiếu trường, hoặc mật khẩu quá ngắn |
| `409` | email đã được đăng ký |

### `POST /auth/login`

Body JSON: `email`, `password`. Phản hồi giống `register`.

Sai email hoặc sai mật khẩu đều trả `401` với **cùng một thông báo**, để không lộ email nào đã có trong hệ thống.

### `GET /pets/mine` — tin của chính mình

Cần `Authorization: Bearer <token>`. Trả về `{ pets, total }` gồm các tin do tài khoản đó đăng, mới nhất trước.

Tin đăng khi chưa đăng nhập có `owner` là `null` và không bao giờ xuất hiện ở đây.

### `GET /auth/me`

Gửi header `Authorization: Bearer <token>`. Trả về thông tin tài khoản, dùng để kiểm tra token còn hiệu lực sau khi tải lại trang.

Token sống 7 ngày.

## 7. Trang quản trị

Quản trị viên được xác định bằng biến môi trường `ADMIN_EMAILS` (danh sách email, ngăn cách bằng dấu phẩy), **không phải** bằng cách sửa tay trong database. Vai trò được đồng bộ lại mỗi lần đăng nhập, nên thêm hoặc bỏ quản trị viên chỉ cần sửa biến môi trường rồi đăng nhập lại.

Mọi endpoint dưới đây cần `Authorization: Bearer <token>` của tài khoản admin. Người thường nhận `403`, chưa đăng nhập nhận `401`.

### `GET /admin/stats`

```json
{
  "total": 19, "lost": 11, "found": 8, "resolved": 3, "open": 16,
  "withImage": 19, "users": 2, "resolvedRate": 16,
  "topAreas":  [{ "label": "Quận 1, TP.HCM", "count": 3 }],
  "topBreeds": [{ "label": "Corgi", "count": 2 }]
}
```

### `GET /admin/pets`

Tham số: `type` (`lost`/`found`), `resolved` (`true`/`false`), `q` (tìm trong giống, khu vực, tên, mã tin), `limit` (mặc định 20, tối đa 100), `skip`.

Trả về `{ pets, total }`. Mỗi tin kèm `owner` là `{ name, email }` nếu đăng bởi tài khoản, hoặc `null` nếu khách vãng lai đăng.

### `DELETE /admin/pets/:petId`

Xoá bất kỳ tin nào, không cần mã xác nhận.

## 8. Giới hạn tần suất

Đếm theo IP, trong bộ nhớ của tiến trình. Vượt ngưỡng thì nhận `429` kèm header `Retry-After`.

| Nhóm | Ngưỡng mặc định | Biến môi trường |
|---|---|---|
| `/ai/*` (mỗi endpoint đếm riêng) | 30 lượt / 10 phút | `AI_RATE_LIMIT` |
| `POST /auth/register` | 30 lượt / giờ | `REGISTER_RATE_LIMIT` |
| `POST /auth/login` | 20 lượt / 15 phút | `LOGIN_RATE_LIMIT` |

Các endpoint AI đều tốn quota Gemini nên phải chặn vòng lặp tự động. Ngưỡng đăng ký đặt rộng vì cả một lớp học có thể dùng chung một IP.

> Bộ đếm nằm trong bộ nhớ nên nếu sau này chạy nhiều instance thì mỗi instance đếm riêng, phải chuyển sang bộ đếm dùng chung như Redis.

## 9. Quy tắc chung

- Không commit `.env`, `node_modules/`, `dist/`
- Không push thẳng lên `main`
- Mỗi PR chỉ làm một việc — dễ đọc, dễ duyệt, dễ revert khi hỏng
- Trước khi mở PR, chạy `npm test` ở `back-end/` cho chắc
- Đổi API thì cập nhật mục 5 của file này ngay trong cùng PR
