import { createBrowserRouter, Navigate, useLocation, useRouteError } from 'react-router-dom';
import App from './App.jsx';
import NotFound from './pages/NotFound.jsx';
import auth from './auth';

/*
 * Vào trang cần đăng nhập mà chưa đăng nhập thì đẩy sang /login, NHỚ đường cũ
 * để đăng nhập xong quay lại đúng chỗ.
 *
 * Bản Vue làm bằng router.beforeEach đọc meta.requiresAuth. React Router
 * không có hook chặn toàn cục tương đương, nên bọc từng tuyến đường cần chặn
 * vào component này.
 *
 * Đọc auth.isLoggedIn() chứ không đọc qua useAuth(): đây là một lần quyết
 * định lúc vào trang, không phải một giá trị cần vẽ lại. Dùng hook ở đây thì
 * lúc người dùng bấm Đăng xuất, component này vẽ lại và đá họ sang /login
 * ngay giữa chừng — mà App đã lo việc đó rồi, lo hai lần thì hai lần chuyển
 * trang chồng lên nhau.
 */
function CanQuyen({ admin = false, children }) {
  const location = useLocation();

  if (!auth.isLoggedIn()) {
    // fullPath của Vue = đường dẫn + query + hash.
    const duongCu = location.pathname + location.search + location.hash;
    return <Navigate to={`/login?next=${encodeURIComponent(duongCu)}`} replace />;
  }

  // Đã đăng nhập nhưng không phải quản trị viên: KHÔNG lộ trang, đẩy về trang
  // chủ. Hiện một câu "bạn không có quyền" cũng là nói cho người lạ biết ở
  // đây có một trang đáng để thử.
  if (admin && !auth.isAdmin()) return <Navigate to="/" replace />;

  return children;
}

/*
 * Deploy bản mới xong thì trang đang mở trong trình duyệt hỏng một nửa.
 *
 * Mỗi trang là một tệp rời, chỉ tải khi người dùng bấm sang. Tên tệp có kèm
 * mã băm nội dung, nên deploy bản mới là tên đổi và tệp cũ biến mất khỏi máy
 * chủ. Ai đang mở web từ trước thì vẫn giữ bản đồ tên CŨ trong bộ nhớ: trang
 * hiện tại chạy bình thường vì đã tải xong, nhưng bấm sang trang khác là đi
 * tìm một tệp không còn tồn tại.
 *
 * Triệu chứng: bấm "Đăng tin" và KHÔNG CÓ GÌ XẢY RA, không một dòng lỗi nào.
 *
 * Vue Router im lặng huỷ chuyến đi. React Router thì ném lỗi lên errorElement
 * — khác chỗ báo, nhưng cùng một lỗi và cùng một cách chữa: tải lại trang để
 * lấy index.html mới mang bản đồ tên mới.
 */
const KHOA_TAI_LAI = 'lostpets:tai-lai-vi-chunk-hong';
const CACH_NHAU_TOI_THIEU_MS = 10000;

const doc = (khoa) => {
  // Cửa sổ ẩn danh hoặc trình duyệt chặn lưu trữ thì ném lỗi ngay ở đây.
  try { return sessionStorage.getItem(khoa); } catch { return null; }
};
const ghi = (khoa, giaTri) => {
  try { sessionStorage.setItem(khoa, giaTri); } catch { /* không lưu được thì thôi */ }
};

const laLoiThieuTep = (err) => {
  const m = String((err && err.message) || '');
  return /Loading chunk|Loading CSS chunk|ChunkLoadError|dynamically imported module/i.test(m);
};

function LoiTuyenDuong() {
  const err = useRouteError();

  if (laLoiThieuTep(err)) {
    // Chặn vòng lặp tải lại vô hạn: nếu vừa tải lại chưa tới 10 giây mà vẫn
    // hỏng thì máy chủ đang thiếu tệp thật, tải lại nữa cũng vậy.
    const lanTruoc = Number(doc(KHOA_TAI_LAI) || 0);
    if (Date.now() - lanTruoc >= CACH_NHAU_TOI_THIEU_MS) {
      ghi(KHOA_TAI_LAI, String(Date.now()));
      window.location.reload();
      return null;
    }
  }

  // Mọi lỗi khác, và cả trường hợp tải lại rồi vẫn hỏng: hiện trang 404 thay
  // vì để trắng màn. Người dùng còn đường quay về trang chủ.
  return <NotFound />;
}

/*
 * Bảng tuyến đường.
 *
 * ĐANG CHUYỂN DỞ. Danh sách đầy đủ 14 tuyến nằm ở docs/chuyen-sang-react.md
 * mục 4. Dưới đây chỉ khai những tuyến đã có trang thật; mỗi bước chuyển tiếp
 * theo thêm một trang và thêm đúng dòng của nó vào đây.
 *
 * CHƯA CÓ, theo thứ tự dự định làm:
 *
 *   /                    Home
 *   /pet/:id             PetDetail
 *   /new                 NewPet
 *   /pet/:id/edit        EditPet
 *   /login               Login
 *   /register            Register
 *   /forgot-password     ForgotPassword
 *   /reset-password      ResetPassword      mã đi qua QUERY, không qua đường dẫn
 *   /verify-email        VerifyEmail
 *   /me                  MyPets             <CanQuyen>
 *   /admin               Admin              <CanQuyen admin>
 *   /contact             Contact
 *   /privacy             Privacy            PHẢI công khai — Meta đòi có thì
 *                                           mới cho app chạy Live
 *
 * Giữ nguyên danh sách này trong mã chứ không chỉ trong tài liệu: ai làm tiếp
 * mở đúng file router ra là thấy còn thiếu gì, không phải đi tìm.
 */
const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <App />,
      errorElement: <LoiTuyenDuong />,
      children: [
        // Mọi đường dẫn chưa chuyển đều rơi vào đây.
        { path: '*', element: <NotFound /> },
      ],
    },
  ],
  {
    /*
     * Thay cho `base: process.env.BASE_URL` của Vue Router.
     *
     * Dùng khi web không nằm ở gốc tên miền mà nằm trong một thư mục con.
     * Hiện tại nó là '/' nên không đổi gì, nhưng bỏ hẳn dòng này thì ngày nào
     * đó ai đặt `base` trong vite.config.js sẽ thấy trang chủ chạy được còn
     * mọi đường dẫn khác ra 404 — mà không có lỗi nào chỉ về đây.
     *
     * React Router đòi basename không có dấu '/' ở cuối, còn Vite thì luôn
     * trả về có. Cắt đi, trừ trường hợp chuỗi chỉ có đúng một dấu '/'.
     */
    basename: (import.meta.env.BASE_URL || '/').replace(/(.)\/$/, '$1'),
  },
);

export { CanQuyen };
export default router;
