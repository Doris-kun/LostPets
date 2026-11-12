# Chuyển front-end sang React — những gì phải mang theo

Viết cho người làm phần React (Híu), dựa trên trạng thái `main` ngày 12/11/2026.

Bản Vue trong `front-end/` đã nhận khá nhiều bản sửa về bảo mật, quyền riêng tư
và khả năng tiếp cận mà **nhìn giao diện không thấy được**. Viết lại bằng React
rất dễ đánh rơi chúng: trang mới trông y hệt, chạy y hệt, chỉ có điều một vài
đảm bảo đã âm thầm biến mất.

File này liệt kê những thứ đó, kèm chỗ phải chép và chỗ phải viết lại.

---

## 1. Trước hết: đừng merge nhánh React vào `main` lúc này

Nhánh `feat/fix-env-and-create-front-end-react` **xoá cả thư mục `front-end/`**.

Nhưng nhánh đó tách ra từ 19/10. Từ hôm đó tới nay `main` có **58 commit** chạm
vào `front-end/`, đổi **+5843 / −1202 dòng** trên 43 file.

| | nhánh React | `main` (Vue) |
|---|---|---|
| Trang | 5 | 14 |
| Component | 3 | 9 |
| Endpoint trong `api.js` | 5 | 30 |

Nhánh React **chưa có**: `Login`, `Register`, `ForgotPassword`, `ResetPassword`,
`VerifyEmail`, `MyPets`, `Admin`, `Contact`, `Privacy`, và các component
`MapPicker`, `PetMap`, `PetPhoto`, `NoPhoto`, `ChatWidget`, `ReportDialog`,
`ResolveNudge`, `SocialLogin`.

Merge ở trạng thái này là web mất toàn bộ phần tài khoản. Hai hướng đi được:

- **Song song**: để `front-end/` và `front-end-react/` cùng tồn tại tới khi bản
  React đủ 14 trang, rồi mới xoá. CI đã dựng sẵn cho trường hợp này — vòng lặp
  `for dir in front-end front-end-react` trong `.github/workflows/ci.yml` tự
  build thư mục nào có `package.json`.
- **Một phát**: hoàn thiện nhánh React rồi merge, nhưng phải gánh lại 5843 dòng
  thay đổi của một tháng qua.

---

## 2. Chép nguyên, không cần viết lại (510 dòng)

Chín module này **không import Vue dòng nào**. Lấy bản trên `main`, bỏ vào
`front-end-react/src/`, chạy được ngay.

| File | Dòng | Làm gì |
|---|---|---|
| `api.js` | 78 | 30 endpoint + gắn token + xử lý 401 |
| `geocode.js` | 82 | tra tên khu vực từ toạ độ |
| `map.js` | 177 | haversine, viết khoảng cách, màu ghim |
| `nudge.js` | 44 | nhắc đánh dấu đã đoàn tụ |
| `images.js` | 35 | thu nhỏ ảnh Cloudinary |
| `claim.js` | 30 | mã xác nhận tin của khách vãng lai |
| `report.js` | 28 | báo tin xấu |
| `loadScript.js` | 27 | nạp SDK Google/Facebook |
| `contact.js` | 9 | địa chỉ liên hệ |

Sửa duy nhất khi chép: `process.env.VUE_APP_API_URL` → `import.meta.env.VITE_API_URL`
(bạn đã làm đúng chỗ này trong `api.js` của nhánh React rồi).

**Lưu ý về `api.js`**: bản trên nhánh React chỉ có 5 endpoint và không có
interceptor nào. Lấy bản `main` chứ đừng bổ sung dần bản cũ — phần xử lý 401 và
header `x-claim-code` nằm trong đó, xem mục 5.

---

## 3. Sửa một chỗ mỗi file (743 dòng)

Bốn module dùng `Vue.observable({...})` để object tự báo cho giao diện cập nhật.
Sang React, đổi chỗ đó thành store (`useSyncExternalStore`, context, hoặc
zustand — tuỳ bạn). Phần còn lại giữ nguyên.

| File | Dòng | Chỗ phải đổi |
|---|---|---|
| `i18n.js` | 653 | `export const langStore = Vue.observable({ lang })` |
| `auth.js` | 58 | `export const state = Vue.observable({ token, user })` |
| `toast.js` | 17 | hàng đợi thông báo |
| `chat.js` | 15 | trạng thái mở/đóng khung chat |

**Giữ nguyên tên hàm xuất ra.** 47 test hiện có gọi đúng các tên này:

- `auth.login(token, user)`, `auth.logout()`, `auth.isLoggedIn()`,
  `auth.isAdmin()`, `auth.setUser(user)`, `auth.token`, `auth.user`
- `t(key, vars)`, `setLang(lang)`, `langStore.lang`

Đổi tên thì test đỏ, mà test đỏ ở đây là mất lưới an toàn chứ không phải phiền.

---

## 4. Viết lại thật (4391 dòng)

- `router.js` (87) — `vue-router` → `react-router`
- `main.js` (13) — điểm khởi động
- 14 trang + 9 component `.vue` (4291)

Danh sách route đầy đủ, chép từ `front-end/src/router.js`:

| Đường dẫn | Trang | Điều kiện |
|---|---|---|
| `/` | Home | |
| `/new` | NewPet | |
| `/pet/:id` | PetDetail | |
| `/pet/:id/edit` | EditPet | |
| `/me` | MyPets | **phải đăng nhập** |
| `/admin` | Admin | **phải là quản trị viên** |
| `/login` | Login | |
| `/register` | Register | |
| `/forgot-password` | ForgotPassword | |
| `/reset-password` | ResetPassword | mã đi qua **query**, không qua đường dẫn |
| `/verify-email` | VerifyEmail | |
| `/privacy` | Privacy | **phải công khai** — Meta đòi có thì mới cho app chạy Live |
| `/contact` | Contact | |
| `*` | NotFound | |

Vào trang cần đăng nhập mà chưa đăng nhập thì đẩy sang `/login` và **nhớ đường
cũ**, đăng nhập xong quay lại đúng chỗ.

---

## 5. Hợp đồng API đã đổi — ảnh hưởng cả app di động

PR #104 (merge 12/11) đổi luồng đăng ký. Phần này cần cả web lẫn app sửa theo.

### `POST /auth/register`

Trả về **một trong hai dạng**, giao diện phải xử lý cả hai:

```jsonc
// Gửi được thư xác minh — KHÔNG có token
{ "verifyRequired": true,
  "email": "a@example.com",
  "message": "Đã gửi thư xác minh. Bấm đường dẫn trong thư rồi đăng nhập." }

// Máy chủ chưa khai thiết lập gửi thư (chạy ở máy, chạy test) — có token như cũ
{ "token": "...", "user": { ... } }
```

Cả hai đều là `201`. Đăng ký xong **không tự đăng nhập nữa** ở dạng thứ nhất —
đừng giả định lúc nào cũng có `token` trong body.

### `POST /auth/login`

| Mã | Nghĩa | Giao diện phải làm gì |
|---|---|---|
| `401` | sai email hoặc mật khẩu | hiện lỗi đăng nhập |
| `403` + `verifyRequired: true` | **đúng mật khẩu nhưng chưa xác minh email** | chỉ sang chỗ gửi lại thư, **đừng** nói "sai mật khẩu" |

Body của 403 có `email` sẵn, dùng luôn cho nút gửi lại.

### Hai endpoint liên quan

- `POST /auth/verify-email` — body `{ token }`, lấy từ query của đường dẫn trong thư
- `POST /auth/resend-verification` — body `{ email }`

### Những thứ khác đã đổi

- **Đặt lại mật khẩu huỷ mọi phiên đang mở.** Server tăng `tokenVersion`, nên
  token đang cầm trong tay hết hiệu lực ngay. Hệ quả: **401 trở thành chuyện
  thường gặp**, không còn là trường hợp hiếm — xem mục 6c.
- **`adminPending` đã bỏ**, đừng đọc trường đó nữa.
- **Vai trò lấy từ database, không lấy từ token.** `user.role` trong body đăng
  nhập là nguồn đúng; gọi `GET /auth/me` lúc mở trang để làm mới, vì vai trò có
  thể đã đổi ở máy khác (xác minh email trên điện thoại chẳng hạn).

---

## 6. Hành vi vô hình phải sống sót

Đây là phần quan trọng nhất của file này. Mỗi mục dưới đây là một lần sửa có
thật; mất đi thì **không ai nhìn giao diện mà phát hiện ra được**.

### a. Làm nhiễu toạ độ 500m trước khi gửi ra Nominatim

`geocode.js`, lưới `FUZZ_GRID = 0.005`.

Nút "dùng vị trí của tôi" trả toạ độ chính xác tới từng mét. Gửi nguyên như vậy
sang Nominatim là lộ chính xác chỗ ở người dùng cho một bên thứ ba —
**database còn không lưu bản chính xác** (back-end cũng làm tròn trong
`petModel`), nên không có lý do gì để OpenStreetMap thấy nó. Lưới 500m vẫn ra
đúng tên quận.

Đây là lời hứa ghi trong trang chính sách bảo mật, không phải chi tiết kỹ thuật.

### b. Gọi Nominatim bằng `fetch`, không bằng axios chung

Cùng file. Thực thể axios của web **tự gắn `Authorization` vào mọi request**.
Dùng nó để gọi Nominatim là token đăng nhập của người dùng bay thẳng sang máy
chủ người khác.

Phải là `fetch` với `credentials: 'omit'`.

### c. Gặp 401 thì đăng xuất **và nói ra**

`api.js`, interceptor response.

Trước đây chỉ lặng lẽ gọi `auth.logout()`. Các trang bắt lỗi rồi hiện trang
rỗng, nên người dùng thấy "Tin của tôi" trống trơn và tưởng web hỏng — trong
khi thật ra họ vừa bị đăng xuất. Dùng lại câu `message` server gửi về, đừng tự
đoán lý do.

Từ khi đặt lại mật khẩu huỷ phiên (mục 5), tình huống này xảy ra thường xuyên.

### d. Chỉ biến đổi ảnh thuộc tên miền Cloudinary

`images.js`, biểu thức `^https://res\.cloudinary\.com/[^/]+/image/upload/`.

Hai lý do, lý do thứ hai nặng hơn:

1. Ảnh mẫu đang nằm trên `cataas.com` và `placedog.net`, chèn tham số vào chỉ
   làm hỏng địa chỉ.
2. **Không bao giờ ghi địa chỉ đã biến đổi vào database.** Back-end bóc mã ảnh
   bằng cách cắt chuỗi sau `/upload/`; gặp `w_192,...` là moi ra sai mã, lệnh
   xoá ảnh trượt, và ảnh nằm lại Cloudinary vĩnh viễn dù tin đã xoá.

### e. Chunk cũ sau khi triển khai lại thì tự tải lại trang

`router.js`, `router.onError`.

Vue CLI và Vite đều đặt tên tệp JS theo mã băm nội dung. Deploy bản mới là tên
đổi và tệp cũ biến mất khỏi máy chủ. Ai đang mở web từ trước vẫn giữ bản đồ tên
**cũ**: trang hiện tại chạy bình thường, nhưng bấm sang trang khác là đi tìm một
tệp không còn tồn tại — và router im lặng huỷ chuyến đi, không báo gì.

Triệu chứng: bấm "Đăng tin" và **không có gì xảy ra**, không một dòng lỗi nào.

React Router cũng vướng y hệt khi dùng `React.lazy`. Cách xử lý: bắt lỗi khớp
`/Loading chunk|ChunkLoadError|dynamically imported module/i` rồi
`window.location.reload()`, **kèm chặn vòng lặp** — ghi mốc thời gian vào
`sessionStorage`, nếu vừa tải lại chưa tới 10 giây mà vẫn hỏng thì dừng, vì lúc
đó máy chủ thiếu tệp thật, tải lại nữa cũng vậy.

### f. Mọi ô nhập phải có nhãn, chữ xám phải đủ tương phản

- Mỗi `<input>` `<select>` `<textarea>` có `<label for>` hoặc `aria-label`.
  Không có thì trình đọc màn hình chỉ đọc "edit text", người khiếm thị không
  biết ô đó là gì.
- Chữ phụ dùng `text-gray-500` (**4.83:1**), không dùng `text-gray-400`
  (**2.54:1** — dưới ngưỡng WCAG AA là 4.5:1).

### g. Rút gọn tên tỉnh thành khi tự điền khu vực

`geocode.js`, hàm `rutGonTinh`: `"Thành phố Hồ Chí Minh"` → `"TP.HCM"`.

Ô "khu vực" được lọc bằng **so chuỗi**. Tự điền ra dạng dài còn người dùng gõ
dạng ngắn thì bộ lọc không khớp, và không ai hiểu vì sao.

Liên quan: từ 1/7/2025 Việt Nam bỏ cấp quận huyện, nên Nominatim chỉ trả về
`suburb` + `city` cho địa chỉ Việt Nam, không còn trường quận. Code giữ
`city_district`/`district` làm đường lui cho dữ liệu cũ và địa chỉ nước ngoài.

### h. Mã xác nhận tin gửi qua header

`api.js`, hàm `claimHeader`. Khách vãng lai đăng tin không cần tài khoản, nên
sửa/xoá tin dựa vào mã lưu trong máy, gửi qua header `x-claim-code`:

- `GET /pets/:id` — có mã thì server trả thêm **đặc điểm bí mật** của thú cưng
- `PUT /pets/:id`, `DELETE /pets/:id` — không có mã thì `403`

---

## 7. 47 test đi theo được

`front-end/tests/` có 5 bộ, **không bộ nào dùng Vue** — chúng kiểm `geocode`,
`images`, `map`, `auth`, `i18n` ở mức module. Chép sang dự án React dùng được.

Vitest giữ nguyên `describe` / `it` / `expect`, nên phần lớn không phải sửa.
Hai chỗ phải đụng:

1. `auth.test.js` dùng `jest.isolateModules` để nạp lại module sau mỗi lần đổi
   `localStorage` — Vitest thì là `vi.resetModules()` + `await import(...)`.
2. Bỏ `jest.config.js`; Vitest đọc cấu hình từ `vite.config.js`, nhớ đặt
   `environment: 'jsdom'`.

Chạy được rồi thì thêm `"test": "vitest run"` vào `scripts` — CI đã gọi
`npm run test --if-present` nên nó tự chạy, không cần sửa workflow.

**Dùng chúng làm bản đặc tả khi port.** Viết `geocode.js` bản React xong, chạy
test: quên làm tròn toạ độ là đỏ ngay, không phải chờ ai soi ra.

---

## 8. Back-end không đụng gì

425 test, các chỉ mục database, phần gửi thư, bộ lọc địa lý 50km, toàn bộ phần
bảo mật — không ảnh hưởng. Đổi framework front-end không chạm tới chúng.
