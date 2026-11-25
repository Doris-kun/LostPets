import { useEffect, useRef, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import Toast from './components/Toast.jsx';
import { useI18n } from './i18n';
import { showToast } from './toast';
import auth, { useAuth } from './auth';
import api from './api';

/*
 * Chữ cái đầu của tên, tối đa hai chữ: "Phạm Thái Nam" -> "PN".
 *
 * Để ngoài component vì nó không đụng tới state nào — hàm thuần, nhận vào
 * một chuỗi và trả ra một chuỗi.
 */
function chuDau(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export default function App() {
  const { t, lang, setLang } = useI18n();
  const { user, isLoggedIn, isAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [menuOpen, setMenuOpen] = useState(false);
  const accountRef = useRef(null);

  // Lấy năm lúc chạy chứ không viết cứng: sang năm mà chân trang vẫn ghi
  // 2026 thì trông như web bỏ hoang.
  const year = new Date().getFullYear();

  /*
   * Hỏi lại máy chủ xem tài khoản giờ ra sao, mỗi lần mở trang.
   *
   * Tốn một lượt gọi cho người đã đăng nhập, đổi lại mọi thay đổi từ nơi khác
   * hiện ra sau một lần tải trang thay vì phải đăng xuất rồi đăng nhập lại.
   * Đã gặp thật: xác minh email trên điện thoại xong, trên web vẫn không thấy
   * mục Quản trị, vì web giữ bản sao cũ ghi role là 'user'.
   *
   * Hỏng thì im lặng bỏ qua: bản cũ vẫn dùng được, và token hết hiệu lực đã
   * có bộ chặn lỗi của axios lo. Không được chặn ai dùng web chỉ vì lượt làm
   * mới này thất bại.
   *
   * Mảng phụ thuộc rỗng: chạy đúng một lần lúc mở web. Để isLoggedIn vào đó
   * thì mỗi lần đăng nhập lại gọi thêm một lượt nữa, mà lượt đăng nhập vừa
   * rồi đã trả về tài khoản mới nhất.
   */
  useEffect(() => {
    let bo = false;

    const lamMoiTaiKhoan = async () => {
      if (!auth.isLoggedIn()) return;
      try {
        const { data } = await api.me();
        if (!bo && data && data._id) auth.setUser(data);
      } catch {
        /* mạng chập chờn hoặc máy chủ đang ngủ: giữ nguyên bản cũ */
      }
    };

    lamMoiTaiKhoan();
    return () => { bo = true; };
  }, []);

  // Chuyển trang thì đóng menu, tránh nó còn mở lơ lửng trên trang mới.
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname, location.search]);

  /*
   * Đóng menu khi chạm ra ngoài hoặc bấm Escape.
   *
   * Chỉ gắn người nghe KHI menu đang mở, và gỡ ngay khi đóng. Gắn suốt đời
   * component thì mọi cú chạm trên web đều chạy qua đây, kể cả lúc không có
   * menu nào mở.
   */
  useEffect(() => {
    if (!menuOpen) return undefined;

    const chamRaNgoai = (e) => {
      const el = accountRef.current;
      if (el && !el.contains(e.target)) setMenuOpen(false);
    };
    const bamEscape = (e) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };

    document.addEventListener('click', chamRaNgoai);
    document.addEventListener('keydown', bamEscape);
    return () => {
      document.removeEventListener('click', chamRaNgoai);
      document.removeEventListener('keydown', bamEscape);
    };
  }, [menuOpen]);

  const dangXuat = () => {
    setMenuOpen(false);
    auth.logout();
    showToast(t('auth.loggedOut'));
    if (location.pathname.startsWith('/me') || location.pathname.startsWith('/admin')) {
      navigate('/');
    }
  };

  // Hai nút lọc trên thanh điều hướng sáng lên khi đang ở đúng bộ lọc đó.
  const dangLoc = (type) =>
    location.pathname === '/' && new URLSearchParams(location.search).get('type') === type;

  const lopNutLoc = (dang, mauDang) =>
    'hidden sm:inline-flex px-3 py-2 rounded-lg text-sm font-medium transition-colors ' +
    (dang ? mauDang : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50');

  return (
    <div id="app" className="min-h-screen bg-white">
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-sm border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <img src="/logo.png" alt="LostPets" className="w-9 h-9" />
            <span className="text-lg font-bold text-gray-900 tracking-tight">LostPets</span>
          </Link>

          <div className="flex items-center gap-1 sm:gap-2">
            <Link to="/?type=lost" className={lopNutLoc(dangLoc('lost'), 'bg-rose-50 text-rose-600')}>
              {t('nav.lost')}
            </Link>
            <Link
              to="/?type=found"
              className={lopNutLoc(dangLoc('found'), 'bg-emerald-50 text-emerald-600')}
            >
              {t('nav.found')}
            </Link>

            {/* Đổi ngôn ngữ */}
            <div className="flex items-center bg-gray-100 rounded-full p-0.5 ml-1">
              {['vi', 'en'].map((ma) => (
                <button
                  key={ma}
                  type="button"
                  onClick={() => setLang(ma)}
                  // aria-pressed cho trình đọc màn hình biết nút nào đang
                  // chọn. Nhìn thì phân biệt được bằng nền trắng, nghe thì
                  // không — hai nút đọc lên giống hệt nhau.
                  aria-pressed={lang === ma}
                  className={
                    'px-2.5 py-1 rounded-full text-xs font-semibold transition-all ' +
                    (lang === ma
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-600')
                  }
                >
                  {ma.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Tài khoản: gom vào một nút avatar, thanh menu đỡ chật */}
            {!isLoggedIn ? (
              <Link
                to="/login"
                className="px-3 py-2 rounded-lg text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors"
              >
                {t('auth.loginBtn')}
              </Link>
            ) : (
              <div className="relative ml-1" ref={accountRef}>
                <button
                  type="button"
                  onClick={() => setMenuOpen((mo) => !mo)}
                  className={
                    'flex items-center gap-1.5 p-0.5 pr-1.5 rounded-full border-2 transition-all ' +
                    (menuOpen ? 'border-orange-300 bg-orange-50' : 'border-transparent hover:bg-gray-50')
                  }
                  aria-expanded={menuOpen}
                  aria-haspopup="true"
                  aria-label={t('nav.account')}
                >
                  <span className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-rose-500 text-white text-sm font-bold flex items-center justify-center shrink-0">
                    {chuDau(user && user.name)}
                  </span>
                  <svg
                    className={'w-3.5 h-3.5 text-gray-400 transition-transform ' + (menuOpen ? 'rotate-180' : '')}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-60 bg-white rounded-2xl border border-gray-100 shadow-lg overflow-hidden z-50">
                    <div className="px-4 py-3 border-b border-gray-50">
                      <p className="text-sm font-bold text-gray-900 truncate">{user && user.name}</p>
                      <p className="text-xs text-gray-500 truncate">{user && user.email}</p>
                    </div>

                    <Link
                      to="/me"
                      className={
                        'flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors ' +
                        (location.pathname === '/me'
                          ? 'text-orange-600 bg-orange-50/60 font-semibold'
                          : 'text-gray-600 hover:bg-gray-50')
                      }
                    >
                      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="1.8"
                          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                        />
                      </svg>
                      {t('mine.link')}
                    </Link>

                    {isAdmin && (
                      <Link
                        to="/admin"
                        className={
                          'flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors ' +
                          (location.pathname === '/admin'
                            ? 'text-violet-600 bg-violet-50/60 font-semibold'
                            : 'text-gray-600 hover:bg-gray-50')
                        }
                      >
                        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="1.8"
                            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                          />
                        </svg>
                        {t('admin.link')}
                      </Link>
                    )}

                    <div className="border-t border-gray-50">
                      <button
                        type="button"
                        onClick={dangXuat}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-600 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      >
                        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="1.8"
                            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                          />
                        </svg>
                        {t('auth.logout')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <Link
              to="/new"
              className="ml-1 inline-flex items-center gap-1.5 bg-orange-500 text-white px-4 py-2 rounded-full text-sm font-semibold hover:bg-orange-600 transition-all shadow-sm hover:shadow-orange-200 hover:shadow-md"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
              </svg>
              <span className="hidden sm:inline">{t('nav.post')}</span>
            </Link>
          </div>
        </div>
      </nav>

      {/*
        CHƯA GẮN: <ResolveNudge /> nằm ở đây trong bản Vue, ngay trên <main>.
        Nó nhắc người đăng tin đánh dấu đã đoàn tụ. Chuyển ở bước sau cùng với
        ChatWidget — xem danh sách còn thiếu trong router.jsx.
      */}

      <main>
        <Outlet />
      </main>

      {/*
        Chân trang chỉ có đúng một đường dẫn quan trọng. Chính sách bảo mật
        phải tìm được từ mọi trang: Meta đòi vậy mới cho chuyển ứng dụng sang
        Live, và một chính sách phải bới mới ra thì cũng chẳng để làm gì.

        Cố ý tối giản, nhưng phải có đủ hai vế thì mới ra chân trang. Một
        đường dẫn lẻ loi giữa khoảng trắng trông như lập trình viên quên xoá,
        chứ không ra chủ ý.
      */}
      <footer className="mt-16 border-t border-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-gray-500">© {year} LostPets</p>
          <div className="flex items-center gap-5">
            <Link to="/contact" className="text-xs text-gray-500 hover:text-gray-600 transition-colors">
              {t('nav.contact')}
            </Link>
            <Link to="/privacy" className="text-xs text-gray-500 hover:text-gray-600 transition-colors">
              {t('nav.privacy')}
            </Link>
          </div>
        </div>
      </footer>

      <Toast />

      {/* CHƯA GẮN: <ChatWidget /> — xem ghi chú ở trên. */}
    </div>
  );
}
