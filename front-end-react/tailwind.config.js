/** @type {import('tailwindcss').Config} */

/*
 * Bảng màu của web, lấy từ app di động (`mobile/src/theme.ts`).
 *
 * ------------------------------------------------------------------
 * Vì sao cùng một bảng màu
 *
 * Cùng một sản phẩm, hai client. Ai dùng web rồi cài app phải nhận ra ngay là
 * cùng một chỗ. Trước đây web dùng cam làm màu hành động chính còn app dùng
 * navy, nên đặt hai màn hình cạnh nhau là ra hai sản phẩm khác nhau.
 *
 * Lấy bảng của app làm chuẩn chứ không ngược lại, vì bảng đó dựng từ chính
 * logo (cam = nửa chó, xanh ngọc = nửa mèo, navy = viền và chữ "LostPets") và
 * đã đo tương phản xong.
 *
 * ------------------------------------------------------------------
 * HAI CÁI BẪY khi bê màu của app sang
 *
 *   1. Chữ TRẮNG trên nền cam chỉ được 2.46:1, trên nền xanh ngọc 3.03:1 —
 *      dưới xa ngưỡng 4.5:1. Web cũ dùng rose/emerald nên không dính; đổi
 *      sang cam/xanh ngọc mà giữ chữ trắng là tự tay phá chuẩn.
 *      Cách sửa: giữ nguyên màu nền lấy từ logo, đổi CHỮ sang `on-brand`
 *      (#16293A) — lên 6.03:1 trên cam và 4.90:1 trên xanh ngọc.
 *
 *   2. Cam gốc #E8912E làm MÀU CHỮ trên nền trắng cũng chỉ 2.46:1, xanh ngọc
 *      gốc được 3.03:1. Nên mỗi màu thương hiệu có thêm bậc `text` đậm lại
 *      cho đủ ngưỡng — xem phần khai `camChu` / `ngocChu` bên dưới.
 *
 * Mọi con số trong file này đo bằng công thức tương phản của WCAG, không ước
 * lượng. Script đo: xem phần "Đổi bảng màu" trong mô tả PR.
 */

// Bốn màu của logo. GIỮ NGUYÊN, vì logo không đổi màu theo nền.
// Chỉ dùng làm nền đậm, dải màu và hình trang trí — KHÔNG dùng làm màu chữ.
const brand = {
  orange: '#E8912E', // nửa chó
  'orange-dark': '#C9741A',
  teal: '#2FA3A8', // vòng tròn + nửa mèo
  'teal-dark': '#1F8A8F',
  navy: '#1F5C7A', // viền mèo và chữ "LostPets"
  sky: '#70C0D0', // bậc sáng, dành cho chi tiết nằm trên nền tối
  cream: '#FFE9B8',
};

/*
 * Bậc "đậm lại" và "nhạt ra" của hai màu thương hiệu.
 *
 * Khai thành biến chứ không gõ trực tiếp hai lần, vì cùng một mã màu phục vụ
 * hai vai: nhãn trạng thái (`lost`, `found`) và nhấn mạnh không dính trạng thái
 * (`accent` — khung liên hệ, đường dẫn). Gõ hai lần thì sớm muộn lệch nhau.
 */
/*
 * Cam làm chữ: ĐẬM HƠN bản của app một bậc.
 *
 * App dùng #A86212 — đo trên nền trắng được 4.75:1, đạt. Nhưng web đặt chữ
 * cam lên NỀN CAM NHẠT (chip lọc "Bị mất", khung số liên hệ) chứ không chỉ
 * trên nền trắng, và trên nền ấm đó nó chỉ còn 4.47:1 — thiếu 0.03.
 *
 * Đậm thêm thành #A45E0F: 4.72:1 trên nền ấm, 5.02:1 trên nền trắng. Nhìn vẫn
 * ra đúng màu cam đó.
 *
 * App di động đang có đúng khoảng thiếu này ở khung "Liên hệ" (accentText trên
 * contactBg). Chưa sửa bên đó vì đổi theme.ts là đổi cả app, để một PR riêng.
 */
const camChu = '#A45E0F';
const camNen = '#FFF7ED'; // mobile: contactBg
const camVien = '#FED7AA'; // mobile: contactBorder

const ngocChu = '#237A7E'; // 5.05:1 trên nền trắng, 4.57:1 trên nền ngọc nhạt
const ngocNen = '#EAF6F6';
const ngocVien = '#B9E1E3';

export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand,

        /*
         * Màu hành động chính: nút Đăng tin, nút Lưu, nút gửi.
         *
         * Navy vì nó đứng giữa hai nửa cam/xanh của logo, không giành màu với
         * nhãn trạng thái, và nhìn chắc chắn hơn khi đặt trên nền trắng.
         *
         * Cũng là màu của nhãn "Đã đoàn tụ" và của mọi thứ liên quan tới việc
         * đánh dấu đã tìm được: dải hỏi lại, khung thông báo đoàn tụ, nút
         * "Đã tìm thấy".
         */
        primary: {
          DEFAULT: brand.navy, // chữ trắng trên nền này: 7.32:1
          dark: '#164760', // trạng thái hover: 9.98:1
          soft: '#EDF6F8', // mobile: surfaceTint
          border: '#BFDCE7',
        },

        // Chữ nằm TRÊN nhãn trạng thái cam hoặc xanh ngọc. Xem bẫy số 1.
        'on-brand': '#16293A',

        /*
         * Hai nhãn trạng thái, mỗi nhãn một họ bốn bậc:
         *   DEFAULT  nền đậm của nhãn  (chữ trên nó là `on-brand`)
         *   text     chữ trên nền trắng
         *   soft     nền nhạt (chip lọc, khung ảnh trống)
         *   border   viền của khung nhạt đó
         */
        lost: { DEFAULT: brand.orange, text: camChu, soft: camNen, border: camVien },
        found: { DEFAULT: brand.teal, text: ngocChu, soft: ngocNen, border: ngocVien },

        /*
         * Cam dùng để NHẤN MẠNH, không dính trạng thái: khung số liên hệ,
         * đường dẫn, con số thống kê. Trùng mã màu với họ `lost` nhưng tách
         * tên, vì đổi màu nhãn "Bị mất" không có nghĩa là đổi màu khung liên hệ.
         */
        accent: { DEFAULT: camChu, soft: camNen, border: camVien },

        /*
         * Đỏ của LỖI và nút XOÁ. Hai bậc đậm nhạt, mỗi bậc hai vai:
         *
         *   DEFAULT  nền nút xoá (chữ trắng 4.77:1), hoặc chữ trên nền trắng
         *   dark     nền nút xoá lúc TRỎ VÀO (chữ trắng 6.47:1), và chữ trong
         *            khung lỗi — #D92F2F trên nền #FEF2F2 chỉ còn 4.36:1
         *
         * Trỏ vào thì ĐẬM THÊM chứ không làm mờ. Thử `bg-danger/90` rồi: nền
         * nhạt đi thành #DD4444, chữ trắng tụt còn 4.21:1 — tức là nút đạt
         * chuẩn lúc ngồi yên và phá chuẩn đúng lúc người ta sắp bấm.
         */
        danger: {
          DEFAULT: '#D92F2F',
          dark: '#B91C1C', // mobile: warnText
          soft: '#FEF2F2', // mobile: warnBg
          border: '#FECACA', // mobile: warnBorder
        },

        /*
         * Đặc điểm bí mật — vàng hổ phách, tông "chỉ mình bạn thấy".
         *
         * Không có bậc nền đậm: ô này không bao giờ là nút, chỉ là khung chữ.
         */
        secret: {
          text: '#92400E',
          soft: '#FFFBEB',
          border: '#FDE68A',
        },

        /*
         * Viền hai nút "Tiếp tục với Google / Facebook".
         *
         * Hai nút này nền TRẮNG đặt trên trang TRẮNG, nên cái viền là thứ duy
         * nhất cho biết đây là chỗ bấm được — chuẩn đòi tối thiểu 3:1. Viền
         * chung `gray-200` chỉ được 1.22:1, tức là gần như không có viền.
         *
         * #747775 là mã Google ghi trong hướng dẫn nút đăng nhập của họ, và
         * app di động cũng dùng đúng mã này (googleBorder). 4.53:1.
         */
        social: { border: '#747775' },

        /*
         * Màu riêng cho các nút AI — tím, không trùng màu nào trong bộ thương
         * hiệu. Cố ý: AI là thứ máy đoán hộ, phải nhìn ra ngay là khác với
         * hành động do chính người dùng quyết định.
         */
        ai: {
          DEFAULT: '#7C5CE0', // chữ trắng trên nền này 4.70:1
          text: '#5B3FD0', // 6.85:1 trên nền trắng
          bg: '#F5F3FF',
          border: '#DDD6FE',
        },

        /*
         * THAY CẢ THANG XÁM bằng tông ngả xanh của app.
         *
         * Làm ở đây thay vì đổi tên 400 lượt dùng `gray-*` trong mã: cùng một
         * kết quả, mà diff thì đọc được. Ai quen Tailwind vẫn gõ `text-gray-500`
         * như cũ, chỉ là nó ra đúng màu của app.
         *
         * Bảy bậc lấy thẳng từ mobile/src/theme.ts, ba bậc còn lại (300, 700,
         * 800) nội suy cho liền thang. Đã đo cả ba:
         *   300 #C7D3DB  1.53:1 — chỉ làm hình trang trí, KHÔNG làm viền điều khiển
         *   700 #3E525F  8.15:1 trên nền trắng
         *   800 #2A3C4B  11.37:1
         *
         * ------------------------------------------------------------------
         * BẬC 200 VÀ BẬC 400 LÀ HAI VIỆC KHÁC NHAU, đừng dùng lẫn
         *
         * App tách đôi khái niệm này trong theme.ts và web nay theo đúng vậy:
         *
         *   200 (border)        ngăn lớp này với lớp kia. Chỉ là trang trí,
         *                       nhạt được, vì nội dung bên trong mới là thứ
         *                       nhận diện. 1.22:1.
         *   400 (borderStrong)  ĐƯỜNG BAO của một điều khiển — ô nhập, nút
         *                       viền, nút chọn. Nhiều khi nó là thứ DUY NHẤT
         *                       cho biết đây là chỗ bấm được hoặc gõ được,
         *                       nên chuẩn đòi tối thiểu 3:1. 3.32:1.
         *
         * Trước đây web dùng bậc 200 cho cả hai việc, nên mọi ô nhập và nút
         * viền trên web đều không có đường bao nhìn thấy được.
         *
         * Kéo theo: trỏ vào thì viền phải ĐẬM THÊM (bậc 500, 4.96:1). Bậc 300
         * nhạt hơn 400, dùng làm hover là viền nhạt đi đúng lúc người ta sắp
         * bấm.
         */
        gray: {
          50: '#F7FAFB', // surface
          100: '#F1F5F7', // borderLight
          200: '#E3E9ED', // border — ngăn lớp, trang trí
          300: '#C7D3DB', // nội suy — hình trang trí
          400: '#7391A5', // borderStrong, 3.32:1 — đường bao điều khiển
          500: '#617281', // textMuted, 4.96:1 — chữ phụ, chữ gợi ý, viền lúc trỏ vào
          600: '#5B6B78', // textSoft, 5.50:1
          700: '#3E525F', // nội suy
          800: '#2A3C4B', // nội suy
          900: '#16293A', // text, 14.87:1
        },
      },
    },
  },
  plugins: [],
};
