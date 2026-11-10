import Vue from 'vue';
import Router from 'vue-router';
import auth from './auth';

Vue.use(Router);

const router = new Router({
  mode: 'history',
  base: process.env.BASE_URL,
  routes: [
    { path: '/',             component: () => import('./views/Home.vue') },
    { path: '/new',          component: () => import('./views/NewPet.vue') },
    { path: '/pet/:id',      component: () => import('./views/PetDetail.vue') },
    { path: '/pet/:id/edit', component: () => import('./views/EditPet.vue') },
    { path: '/me',           component: () => import('./views/MyPets.vue'), meta: { requiresAuth: true } },
    { path: '/admin',        component: () => import('./views/Admin.vue'), meta: { requiresAdmin: true } },
    { path: '/login',        component: () => import('./views/Login.vue') },
    { path: '/register',     component: () => import('./views/Register.vue') },
    // Phải truy cập được mà không cần đăng nhập: Meta đòi một đường dẫn chính
    // sách bảo mật công khai thì mới cho chuyển ứng dụng sang chế độ Live.
    { path: '/privacy',      component: () => import('./views/Privacy.vue') },
    { path: '/contact',      component: () => import('./views/Contact.vue') },
    { path: '/forgot-password', component: () => import('./views/ForgotPassword.vue') },
    // Mã đặt lại đi qua query chứ không qua đường dẫn: đường dẫn hay bị ghi
    // vào log máy chủ và lịch sử trình duyệt chia sẻ được, còn query thì ít
    // nhất cũng không nằm trong phần ai cũng chép đi chép lại.
    { path: '/reset-password',  component: () => import('./views/ResetPassword.vue') },
    { path: '/verify-email',    component: () => import('./views/VerifyEmail.vue') },
    { path: '*',             component: () => import('./views/NotFound.vue') },
  ]
});

// Vào trang cần đăng nhập mà chưa đăng nhập thì đẩy sang /login,
// nhớ đường cũ để đăng nhập xong quay lại đúng chỗ.
router.beforeEach((to, from, next) => {
  const meta = to.meta || {};
  if ((meta.requiresAuth || meta.requiresAdmin) && !auth.isLoggedIn()) {
    next({ path: '/login', query: { next: to.fullPath } });
  } else if (meta.requiresAdmin && !auth.isAdmin()) {
    // Đã đăng nhập nhưng không phải quản trị viên: không lộ trang, đẩy về trang chủ.
    next('/');
  } else {
    next();
  }
});

// Deploy bản mới xong thì trang đang mở trong trình duyệt hỏng một nửa.
//
// Mỗi trang là một tệp rời, chỉ tải khi người dùng bấm sang. Tên tệp có kèm
// mã băm nội dung, nên deploy bản mới là tên đổi và tệp cũ biến mất khỏi máy
// chủ. Ai đang mở web từ trước thì vẫn giữ bản đồ tên CŨ trong bộ nhớ: trang
// hiện tại chạy bình thường vì đã tải xong, nhưng bấm sang trang khác là đi
// tìm một tệp không còn tồn tại.
//
// Vue Router không báo gì cả — nó chỉ im lặng huỷ chuyến đi. Người dùng bấm
// "Đăng tin" và không có gì xảy ra, không một dòng lỗi nào.
//
// Gặp trường hợp đó thì tải lại trang: index.html mới mang bản đồ tên mới.
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

router.onError((err) => {
  if (!laLoiThieuTep(err)) return;

  // Chặn vòng lặp tải lại vô hạn: nếu vừa tải lại chưa tới 10 giây mà vẫn
  // hỏng thì máy chủ đang thiếu tệp thật, tải lại nữa cũng vậy.
  const lanTruoc = Number(doc(KHOA_TAI_LAI) || 0);
  if (Date.now() - lanTruoc < CACH_NHAU_TOI_THIEU_MS) return;

  ghi(KHOA_TAI_LAI, String(Date.now()));
  window.location.reload();
});

export default router;
