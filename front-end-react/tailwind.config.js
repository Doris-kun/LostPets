/** @type {import('tailwindcss').Config} */
import plugin from 'tailwindcss/plugin';

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
 *      Cách sửa: giữ nguyên màu nền lấy từ logo, đổi CHỮ sang `on-brand`.
 *
 *   2. Cam gốc #E8912E làm MÀU CHỮ trên nền trắng chỉ 2.46:1, xanh ngọc gốc
 *      3.03:1. Nên mỗi màu thương hiệu có thêm bậc `text` đã chỉnh độ sáng.
 *
 * ------------------------------------------------------------------
 * CÁCH KHAI: biến CSS, viết dưới dạng BA SỐ KÊNH
 *
 * Mỗi màu khai hai lần — một cho chế độ sáng, một cho chế độ tối — rồi lớp
 * tiện ích trỏ tới `rgb(var(--m-x) / <alpha-value>)`. Nhờ vậy:
 *
 *   - Đổi chế độ chỉ là đổi `data-theme` trên <html>. Không phải thêm `dark:`
 *     vào khoảng 400 lượt dùng màu trong mã.
 *   - Các lớp có độ mờ (`/80`, `/90`) vẫn chạy. Nếu khai biến là mã hex thì
 *     Tailwind không chèn alpha vào được, đó là lý do phải tách ba số kênh.
 *   - Mã JavaScript vẽ trên bản đồ dùng được cùng biến đó, xem `src/map.js`.
 *
 * Hai bảng dưới đây BUỘC phải có đúng từng ấy khoá: thiếu một cái là bản dựng
 * báo lỗi ngay, thay vì tới lúc bật chế độ tối mới hiện ra một ô trống. Kiểm
 * tra đó nằm ở hàm `kiemTraDuKhoa` cuối file.
 */

// Bốn màu của logo. GIỮ NGUYÊN ở cả hai chế độ, vì logo không đổi màu theo
// nền. Chỉ dùng làm nền đậm, dải màu và hình trang trí — KHÔNG làm màu chữ.
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
 * CHẾ ĐỘ SÁNG
 *
 * Thang `gray` cố ý giữ tên quen của Tailwind nhưng đổi hẳn giá trị sang tông
 * ngả xanh của app. Ai quen Tailwind vẫn gõ `text-gray-500` như cũ, chỉ là nó
 * ra đúng màu của app — và tự đảo khi sang chế độ tối.
 *
 * BẬC 200 VÀ BẬC 400 LÀ HAI VIỆC KHÁC NHAU, đừng dùng lẫn:
 *   200 (border)        ngăn lớp này với lớp kia. Chỉ trang trí, 1.22:1.
 *   400 (borderStrong)  ĐƯỜNG BAO của một điều khiển — ô nhập, nút viền.
 *                       Nhiều khi là thứ DUY NHẤT cho biết đây là chỗ bấm
 *                       được, nên chuẩn đòi tối thiểu 3:1. 3.32:1.
 */
const bangSang = {
  page: '#FFFFFF', // nền trang
  card: '#FFFFFF', // nền thẻ, nền menu, nền ô nhập

  'gray-50': '#F7FAFB', // surface — nền phụ
  'gray-100': '#F1F5F7', // borderLight
  'gray-200': '#E3E9ED', // border — ngăn lớp
  'gray-300': '#C7D3DB', // nội suy — hiện không dùng, 1.53:1 nên đừng làm viền
  'gray-400': '#7391A5', // borderStrong — đường bao điều khiển
  'gray-500': '#617281', // textMuted — chữ phụ, chữ gợi ý, viền lúc trỏ vào
  'gray-600': '#5B6B78', // textSoft
  'gray-700': '#3E525F', // nội suy
  'gray-800': '#2A3C4B', // nội suy
  'gray-900': '#16293A', // text — chữ chính, và nền của chip lọc đang chọn

  /*
   * Màu hành động chính: nút Đăng tin, nút Lưu, nút gửi. Cũng là màu của nhãn
   * "Đã đoàn tụ" và của mọi thứ liên quan tới việc đánh dấu đã tìm được.
   *
   * Navy vì nó đứng giữa hai nửa cam/xanh của logo, không giành màu với nhãn
   * trạng thái, và nhìn chắc chắn hơn khi đặt trên nền trắng.
   */
  primary: brand.navy,
  'primary-dark': '#164760',
  'primary-soft': '#EDF6F8', // surfaceTint
  'primary-border': '#BFDCE7',
  'on-primary': '#FFFFFF', // 7.32:1 trên nền primary

  // Chữ nằm TRÊN nhãn trạng thái cam hoặc xanh ngọc. Xem bẫy số 1.
  // Giống nhau ở cả hai chế độ, vì nền hai nhãn đó không đổi theo chế độ.
  'on-brand': '#16293A',

  // Hai nhãn trạng thái, mỗi nhãn bốn bậc: nền đậm, chữ trên nền trắng,
  // nền nhạt (chip lọc, khung ảnh trống), và viền của khung nhạt đó.
  lost: brand.orange,
  /*
   * Cam làm chữ: ĐẬM HƠN bản của app một bậc.
   *
   * App dùng #A86212 — trên nền trắng được 4.75:1, đạt. Nhưng web đặt chữ cam
   * lên NỀN CAM NHẠT (chip lọc "Bị mất", khung số liên hệ) chứ không chỉ trên
   * nền trắng, và trên nền ấm đó nó chỉ còn 4.47:1 — thiếu 0.03.
   *
   * App di động đang có đúng khoảng thiếu này ở khung "Liên hệ". Chưa sửa bên
   * đó vì đổi theme.ts là đổi cả app, để một PR riêng.
   */
  'lost-text': '#A45E0F', // 5.02:1 trên trắng, 4.72:1 trên nền ấm
  'lost-soft': '#FFF7ED', // contactBg
  'lost-border': '#FED7AA', // contactBorder

  found: brand.teal,
  'found-text': '#237A7E', // 5.05:1 trên trắng, 4.57:1 trên nền ngọc nhạt
  'found-soft': '#EAF6F6',
  'found-border': '#B9E1E3',

  /*
   * Cam dùng để NHẤN MẠNH, không dính trạng thái: khung số liên hệ, đường
   * dẫn, con số thống kê. Trùng mã màu với họ `lost` nhưng tách tên, vì đổi
   * màu nhãn "Bị mất" không có nghĩa là đổi màu khung liên hệ.
   */
  accent: '#A45E0F',
  'accent-soft': '#FFF7ED',
  'accent-border': '#FED7AA',

  /*
   * Đỏ của LỖI và nút XOÁ. Hai bậc đậm nhạt, mỗi bậc hai vai:
   *   DEFAULT  nền nút xoá, hoặc chữ đỏ trên nền trắng
   *   dark     nền nút xoá lúc TRỎ VÀO, và chữ trong khung lỗi
   *
   * Trỏ vào thì ĐẬM THÊM chứ không làm mờ. Thử `bg-danger/90` rồi: nền nhạt
   * đi thành #DD4444, chữ trắng tụt còn 4.21:1 — tức là nút đạt chuẩn lúc
   * ngồi yên và phá chuẩn đúng lúc người ta sắp bấm.
   */
  danger: '#D92F2F',
  'danger-dark': '#B91C1C', // warnText
  'danger-soft': '#FEF2F2', // warnBg
  'danger-border': '#FECACA', // warnBorder
  'on-danger': '#FFFFFF', // 4.77:1

  // Đặc điểm bí mật — vàng hổ phách, tông "chỉ mình bạn thấy".
  // Không có bậc nền đậm: ô này không bao giờ là nút, chỉ là khung chữ.
  'secret-text': '#92400E',
  'secret-soft': '#FFFBEB',
  'secret-border': '#FDE68A',

  /*
   * Màu riêng cho các nút AI — tím, không trùng màu nào trong bộ thương hiệu.
   * Cố ý: AI là thứ máy đoán hộ, phải nhìn ra ngay là khác với hành động do
   * chính người dùng quyết định.
   */
  ai: '#7C5CE0',
  'ai-text': '#5B3FD0',
  'ai-bg': '#F5F3FF',
  'ai-border': '#DDD6FE',
  'on-ai': '#FFFFFF', // 4.70:1

  /*
   * Viền hai nút "Tiếp tục với Google / Facebook".
   *
   * Hai nút này nền TRẮNG đặt trên trang TRẮNG, nên cái viền là thứ duy nhất
   * cho biết đây là chỗ bấm được. #747775 là mã Google ghi trong hướng dẫn
   * nút đăng nhập của họ, app di động cũng dùng đúng mã này. 4.53:1.
   */
  'social-border': '#747775',

  // Lớp tối sau hộp thoại
  scrim: '#16293A',
};

/*
 * CHẾ ĐỘ TỐI
 *
 * Không dùng đen tuyệt đối. Nền đen kịt với chữ trắng tương phản quá gắt, đọc
 * lâu mỏi mắt, và mất hết cảm giác chiều sâu giữa các lớp. Thay bằng xanh đen
 * pha từ chính màu navy của logo — web vẫn ra "chất" LostPets.
 *
 * Quy tắc: lớp càng NỔI LÊN TRÊN thì màu càng SÁNG.
 *   page (nền sâu nhất) -> card (thẻ tin) -> gray-50 (lớp nổi nhất)
 * Ngược hẳn chế độ sáng, nơi lớp nổi lên thì trắng hơn.
 *
 * Thang `gray` vì vậy ĐẢO ĐẦU: bậc 50 thành tối nhất, bậc 900 thành sáng
 * nhất. Nhờ cái đảo này mà `bg-gray-50` vẫn là "nền phụ" và `text-gray-900`
 * vẫn là "chữ chính" ở cả hai chế độ, không phải sửa một lượt dùng nào.
 */
const bangToi = {
  page: '#0E1A23', // background
  card: '#16242F', // surface
  'gray-50': '#1C303D', // surfaceTint — lớp nổi nhất
  'gray-100': '#1B2B36', // borderLight
  'gray-200': '#243845', // border
  'gray-300': '#3A5E74', // nội suy — hình trang trí, phải sáng hơn nền
  'gray-400': '#507C98', // borderStrong, 3.04:1 trên lớp nổi nhất
  'gray-500': '#8697A2', // textMuted
  'gray-600': '#B6C5CE', // textSoft
  'gray-700': '#CFDCE4', // nội suy
  'gray-800': '#DCE6EC', // nội suy
  'gray-900': '#E8EFF3', // text

  /*
   * Navy gốc chìm nghỉm trên nền tối (2.16:1), phải sáng hơn hẳn mới nhìn ra
   * là nút bấm. Chữ trên nền đó vì vậy phải ĐẬM, không còn là trắng.
   *
   * SÁNG HƠN BẢN CỦA APP một bậc (app dùng #3D93C2), vì web có một vai mà app
   * không có: `primary` ở đây còn làm MÀU CHỮ đặt trên nền navy nhạt — khung
   * "đã đoàn tụ", dải hỏi lại, ô ảnh trống. Ở #3D93C2 cặp đó chỉ được 4.03:1.
   * Lên #4EA0CC thì 4.73:1, mà vai làm nền nút cũng tốt hơn (6.28:1).
   *
   * `dark` là trạng thái TRỎ VÀO, và ở chế độ tối nó SÁNG HƠN `primary` chứ
   * không đậm hơn — tên bậc giữ nguyên cho khớp hai bảng, nhưng hướng thì
   * phải đảo. Đậm xuống như chế độ sáng thì chữ đậm trên nút tụt còn 3.35:1:
   * nút đạt chuẩn lúc ngồi yên và phá chuẩn đúng lúc người ta sắp bấm.
   */
  primary: '#4EA0CC',
  'primary-dark': '#6AB2D9', // trỏ vào: 7.81:1
  'primary-soft': '#15303F', // nền nhạt pha xanh -> thành nền ĐẬM pha xanh
  'primary-border': '#2E5A72',
  'on-primary': '#0B1620',

  // Nền hai nhãn Bị mất / Tìm thấy giống hệt chế độ sáng nên chữ giữ nguyên.
  'on-brand': '#16293A',

  lost: brand.orange,
  'lost-text': brand.orange, // 7.16:1 trên nền tối, dùng được màu gốc
  'lost-soft': '#2A2017', // contactBg
  'lost-border': '#6B4A1E', // contactBorder

  found: brand.teal,
  // Nhích sáng hơn brand.teal: trên lớp nổi nhất màu gốc chỉ được 4.50:1,
  // đúng sát mép ngưỡng.
  'found-text': '#30A8AD',
  'found-soft': '#142A2B',
  'found-border': '#2E5F61',

  accent: brand.orange,
  'accent-soft': '#2A2017',
  'accent-border': '#6B4A1E',

  danger: '#F06B6B', // đỏ gốc bị tối, nâng sáng lên
  'danger-dark': '#F8A5A5', // warnText — nền lúc trỏ vào sáng thêm
  'danger-soft': '#2A1618', // warnBg
  'danger-border': '#6B2A2E', // warnBorder
  'on-danger': '#2A1618', // nền đỏ sáng -> chữ đậm

  'secret-text': '#F0C97A',
  'secret-soft': '#2A2413',
  'secret-border': '#6B5A1E',

  // Tím sáng hơn bản ngày, nền tím than — vẫn tách khỏi bộ màu thương hiệu
  ai: '#8B6FE8',
  'ai-text': '#C4B5FD',
  'ai-bg': '#221E35',
  'ai-border': '#453A6B',
  'on-ai': '#0B1620',

  // Google có sẵn bản tối: viền sáng lên để nút còn thấy được
  'social-border': '#8E918F',

  // Tối hơn chế độ sáng: nền vốn đã tối, lớp phủ nhạt thì không tách lớp được
  scrim: '#000000',
};

/* ---------------------------------------------------------------- */

// Mã hex -> ba số kênh, dạng Tailwind chèn alpha vào được.
const kenh = (hex) => {
  const s = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16)).join(' ');
};

/*
 * Hai bảng phải khớp từng khoá.
 *
 * Trước khi có kiểm tra này, thiếu một khoá bên bảng tối nghĩa là lớp tiện ích
 * trỏ tới một biến không ai khai — trình duyệt bỏ qua, và chỗ đó hiện ra trong
 * suốt. Chỉ lộ khi có người bật chế độ tối rồi mở đúng trang đó.
 */
const kiemTraDuKhoa = () => {
  const thieu = Object.keys(bangSang).filter((k) => !(k in bangToi));
  const thua = Object.keys(bangToi).filter((k) => !(k in bangSang));
  if (thieu.length || thua.length) {
    throw new Error(
      'tailwind.config.js — hai bảng màu lệch khoá nhau.' +
        (thieu.length ? ' Bảng tối thiếu: ' + thieu.join(', ') + '.' : '') +
        (thua.length ? ' Bảng tối có thêm: ' + thua.join(', ') + '.' : ''),
    );
  }
};
kiemTraDuKhoa();

// `rgb(var(--m-x) / <alpha-value>)` để `bg-primary/30` vẫn chạy.
const bien = (ten) => `rgb(var(--m-${ten}) / <alpha-value>)`;

const M = Object.fromEntries(Object.keys(bangSang).map((ten) => [ten, bien(ten)]));

/*
 * Tên biến CSS, xuất ra cho mã JavaScript dùng.
 *
 * Bản đồ vẽ bằng HTML thô nối chuỗi nên lớp tiện ích của Tailwind không với
 * tới. Nhưng MÀU thì vẫn chung một nguồn được: `src/map.js` lấy từ đây.
 */
export const BIEN_MAU = Object.fromEntries(
  Object.keys(bangSang).map((ten) => [ten, `rgb(var(--m-${ten}))`]),
);

export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand,

        page: M.page,
        card: M.card,
        gray: {
          50: M['gray-50'],
          100: M['gray-100'],
          200: M['gray-200'],
          300: M['gray-300'],
          400: M['gray-400'],
          500: M['gray-500'],
          600: M['gray-600'],
          700: M['gray-700'],
          800: M['gray-800'],
          900: M['gray-900'],
        },

        primary: {
          DEFAULT: M.primary,
          dark: M['primary-dark'],
          soft: M['primary-soft'],
          border: M['primary-border'],
        },
        'on-primary': M['on-primary'],
        'on-brand': M['on-brand'],

        lost: {
          DEFAULT: M.lost,
          text: M['lost-text'],
          soft: M['lost-soft'],
          border: M['lost-border'],
        },
        found: {
          DEFAULT: M.found,
          text: M['found-text'],
          soft: M['found-soft'],
          border: M['found-border'],
        },

        accent: {
          DEFAULT: M.accent,
          soft: M['accent-soft'],
          border: M['accent-border'],
        },

        danger: {
          DEFAULT: M.danger,
          dark: M['danger-dark'],
          soft: M['danger-soft'],
          border: M['danger-border'],
        },
        'on-danger': M['on-danger'],

        secret: {
          text: M['secret-text'],
          soft: M['secret-soft'],
          border: M['secret-border'],
        },

        ai: {
          DEFAULT: M.ai,
          text: M['ai-text'],
          bg: M['ai-bg'],
          border: M['ai-border'],
        },
        'on-ai': M['on-ai'],

        social: { border: M['social-border'] },

        scrim: M.scrim,
      },
    },
  },
  plugins: [
    /*
     * Sinh hai khối biến. Làm ở đây chứ không gõ tay vào tệp CSS, vì gõ tay
     * là có hai nguồn: sửa mã màu ở một chỗ mà quên chỗ kia thì chế độ tối
     * lệch khỏi chế độ sáng mà không ai thấy.
     */
    plugin(({ addBase }) => {
      const doi = (bang) => Object.fromEntries(
        Object.entries(bang).map(([ten, hex]) => ['--m-' + ten, kenh(hex)]),
      );
      addBase({
        ':root': doi(bangSang),
        '[data-theme="dark"]': doi(bangToi),
      });
    }),
  ],
};
