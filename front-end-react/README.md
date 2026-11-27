# Front-end — React 19 + Vite

Giao diện web của LostPets. Tài liệu chính của dự án nằm ở
[`../README.md`](../README.md) và [`../CONTRIBUTING.md`](../CONTRIBUTING.md);
file này chỉ nói những thứ riêng của thư mục này.

## Chạy

```bash
npm install
npm run dev        # http://localhost:8080
```

Cần back-end chạy ở `http://localhost:3000` trước, không thì danh sách tin trống.

| Lệnh | Làm gì |
|---|---|
| `npm run dev` | máy chủ phát triển, cổng 8080 |
| `npm run build` | dựng bản production vào `dist/` |
| `npm run preview` | xem thử bản vừa dựng |
| `npm test` | chạy Jest |

> Bản Vue cũ dùng `npm run serve`. Vite không có lệnh đó — gõ vào chỉ nhận
> "Missing script".

## Biến môi trường

Vite **chỉ** đọc biến có tiền tố `VITE_`, và đọc qua `import.meta.env` chứ
không qua `process.env`. Đặt tên kiểu `VUE_APP_*` thì nó bỏ qua, không báo lỗi
gì.

| Biến | Dùng ở đâu |
|---|---|
| `VITE_API_URL` | `src/api.js` — địa chỉ back-end, mặc định `http://localhost:3000` |
| `VITE_GOOGLE_CLIENT_ID` | `src/components/SocialLogin.jsx` |
| `VITE_FACEBOOK_APP_ID` | `src/components/SocialLogin.jsx` |

`.env.production` dùng lúc build bản thật. Muốn đổi khi chạy ở máy thì tạo
`.env.local` — tệp đó đã bị `.gitignore` chặn.

**Mấy biến này nhúng vào bundle LÚC BUILD, không đọc lúc chạy.** Đổi giá trị
trên Render thì phải build lại mới có tác dụng.

> Nút đăng nhập Google/Facebook chỉ hiện khi **đủ cả hai phía**: front-end có
> mã ứng dụng (bảng trên), và back-end có `GOOGLE_CLIENT_ID` / `FACEBOOK_APP_ID`.
> Thiếu bên nào thì nút lặng lẽ ẩn đi, **không báo lỗi gì** — phần đăng nhập
> bằng mật khẩu vẫn chạy nên nhìn qua tưởng mọi thứ bình thường.

## Cấu trúc

```
index.html              điểm vào của Vite, KHÔNG nằm trong public/
public/                 chép nguyên vào dist/
  logo.png              thanh điều hướng và icon tab trỏ tới đây
  .well-known/
    assetlinks.json     để đường dẫn trong email mở thẳng app Android
src/
  main.jsx              createRoot + RouterProvider
  App.jsx               khung: thanh điều hướng, chân trang, Toast, ChatWidget
  router.jsx            14 tuyến đường, chặn quyền, tự tải lại khi thiếu tệp
  pages/                14 trang
  components/           9 component
  api.js  auth.js  i18n.js  toast.js  chat.js  map.js  geocode.js ...
tests/                  Jest, 49 bài
```

## Vài chỗ đáng biết trước khi sửa

**Store không dùng Context.** `auth.js`, `i18n.js`, `toast.js` và `chat.js` tự
giữ store ở cấp module rồi nối vào React bằng `useSyncExternalStore`. Nhờ vậy
mã **không phải component** vẫn gọi được — bộ chặn lỗi của axios gọi `t()` để
dịch câu thông báo. Bọc Provider thì giá trị nằm trong cây React, ngoài cây
không với tới.

**Mỗi trang là một tệp rời** (`React.lazy`). Đoạn tự tải lại khi thiếu tệp
trong `router.jsx` chỉ có nghĩa khi tệp bị tách như vậy — nhập thẳng là biến
nó thành mã chết.

**Leaflet điều khiển bằng lệnh.** Trong `PetMap.jsx` và `MapPicker.jsx`, đối
tượng bản đồ nằm trong `ref` chứ không trong state, và `map.remove()` trong
phần dọn là bắt buộc — React 19 chạy effect hai lần ở chế độ phát triển, thiếu
dọn là hai bản đồ chồng lên nhau.

**Jest cố ý không dựng component.** 49 test chỉ phủ các module thuần. Test
xanh nghĩa là "dựng được và phần logic đúng", không nói gì về giao diện — phần
đó phải mở trình duyệt ra xem.
