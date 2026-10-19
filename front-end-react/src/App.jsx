import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { useLanguage } from './context/language.jsx';
import Toast from './components/Toast.jsx';
import Home from './pages/Home.jsx';
import EditPet from './pages/EditPet.jsx';
import NewPet from './pages/NewPet.jsx';
import PetDetail from './pages/PetDetail.jsx';
import NotFound from './pages/NotFound.jsx';

/*
 * Khung bao ngoài toàn app: thanh nav + vùng nội dung đổi theo URL.
 *
 * Dịch từ Vue: GỘP 2 file App.vue (giao diện nav) + router.js (khai báo đường dẫn).
 *
 * Vue 2: router.js tạo `new Router({ routes: [...] })` rồi main.js truyền vào `new Vue({ router })`,
 *        còn App.vue chỉ đặt <router-view /> để đánh dấu chỗ nội dung hiện ra.
 * React: không có file router riêng. <Routes> khai báo đường dẫn ngay tại chỗ
 *        nó sẽ hiển thị — đọc một lượt là thấy luôn URL nào ra trang nào.
 */

// Đường dẫn SVG hình bàn chân, dùng lại ở logo. Tách ra hằng số cho khỏi lặp.
const PAW_PATH =
  'M4.5 11a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zm15 0a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM7 6.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zm10 0a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM12 22c4 0 7-2.686 7-6 0-1.56-.87-2.985-2.315-4.073C15.692 10.925 13.916 10.5 12 10.5s-3.692.425-4.685 1.427C5.87 13.015 5 14.44 5 16c0 3.314 3 6 7 6z';

/*
 * Thanh điều hướng trên cùng.
 *
 * Phải tách thành component riêng, KHÔNG viết thẳng trong App:
 * useLocation() chỉ chạy được bên trong <BrowserRouter>. Mà <BrowserRouter>
 * lại do chính App dựng lên, nên App không tự gọi hook đó được.
 */
function NavBar() {
  const { lang, setLang, t } = useLanguage();

  // Vue: this.$route.path / this.$route.query.type
  const location = useLocation();
  const currentType = new URLSearchParams(location.search).get('type');

  // Link Mất/Tìm thấy chỉ sáng khi đang ở trang chủ VÀ đúng bộ lọc đó.
  const isFilterActive = (type) => location.pathname === '/' && currentType === type;

  const filterLinkClass = (type, activeClass) =>
    `hidden sm:inline-flex px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
      isFilterActive(type) ? activeClass : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
    }`;

  return (
    <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-sm border-b border-gray-100 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo — Vue: <router-link to="/">  ->  React: <Link to="/"> */}
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-rose-500 rounded-lg flex items-center justify-center shadow-sm">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
              <path d={PAW_PATH} />
            </svg>
          </div>
          <span className="text-lg font-bold text-gray-900 tracking-tight">Lost Pets</span>
        </Link>

        <div className="flex items-center gap-1 sm:gap-2">
          {/* Hai link lọc nhanh, ẩn trên màn hình nhỏ */}
          <Link to="/?type=lost" className={filterLinkClass('lost', 'bg-rose-50 text-rose-600')}>
            {t('nav.lost')}
          </Link>
          <Link
            to="/?type=found"
            className={filterLinkClass('found', 'bg-emerald-50 text-emerald-600')}
          >
            {t('nav.found')}
          </Link>

          {/* Đổi ngôn ngữ */}
          <div className="flex items-center bg-gray-100 rounded-full p-0.5 ml-1">
            {['vi', 'en'].map((code) => (
              <button
                key={code}
                onClick={() => setLang(code)}
                className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
                  lang === code
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {code.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Nút đăng tin */}
          <Link
            to="/new"
            className="ml-1 inline-flex items-center gap-1.5 bg-orange-500 text-white px-4 py-2 rounded-full text-sm font-semibold hover:bg-orange-600 transition-all shadow-sm hover:shadow-orange-200 hover:shadow-md"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.5"
                d="M12 4v16m8-8H4"
              />
            </svg>
            <span className="hidden sm:inline">{t('nav.post')}</span>
          </Link>
        </div>
      </div>
    </nav>
  );
}

export default function App() {
  return (
    /*
     * Vue: new Router({ mode: 'history' })  -> URL sạch, không có dấu #
     * React: <BrowserRouter> chính là chế độ history đó.
     */
    <BrowserRouter>
      <div className="min-h-screen bg-white">
        <NavBar />

        {/* Vue: <router-view />  ->  React: <Routes> + danh sách <Route> */}
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/new" element={<NewPet />} />
            <Route path="/pet/:id" element={<PetDetail />} />
            <Route path="/pet/:id/edit" element={<EditPet />} />

            {/* Vue: path '*'  ->  React: path '*' — phải để CUỐI cùng */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>

        {/* Nằm ngoài <Routes> nên không bị vẽ lại mỗi lần chuyển trang */}
        <Toast />
      </div>
    </BrowserRouter>
  );
}
