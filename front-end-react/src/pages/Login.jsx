import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api';
import auth from '../auth';
import SocialLogin from '../components/SocialLogin.jsx';
import { useI18n } from '../i18n';
import { showToast } from '../toast';

const O_NHAP =
  'w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none ' +
  'focus:ring-2 focus:ring-orange-300 focus:border-transparent transition';

export default function Login() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  /*
   * Quay lại đúng chỗ người dùng đang định tới.
   *
   * router.jsx đẩy họ sang đây kèm ?next=<đường cũ> khi họ bấm vào một trang
   * cần đăng nhập. Không đọc lại thì đăng nhập xong họ bị ném về trang chủ và
   * phải tự đi tìm lại chỗ mình đang làm dở.
   */
  const diTiep = () => navigate(searchParams.get('next') || '/');

  // SocialLogin đã tự lưu phiên, ở đây chỉ còn việc chào và chuyển trang.
  const sauKhiDangNhapMangXaHoi = (user) => {
    showToast(`${t('auth.welcome')} ${user.name}`);
    diTiep();
  };

  const gui = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      // trim ở đây thay cho v-model.trim của Vue: người dùng chép email từ
      // nơi khác hay dính một khoảng trắng ở cuối, mà server thì so khớp
      // chính xác.
      const { data } = await api.login({ email: email.trim(), password });
      auth.login(data.token, data.user);
      showToast(`${t('auth.welcome')} ${data.user.name}`);
      diTiep();
    } catch (err) {
      const status = err.response && err.response.status;
      const data = (err.response && err.response.data) || {};

      /*
       * Chưa xác minh email là chuyện KHÁC HẲN sai mật khẩu.
       *
       * Gộp vào "sai thông tin đăng nhập" thì người dùng gõ lại mật khẩu đúng
       * mười lần vẫn không vào được mà không hiểu vì sao. Server trả 403 kèm
       * verifyRequired và sẵn cả email, nên chỉ việc đưa họ sang chỗ gửi lại
       * thư.
       */
      if (status === 403 && data.verifyRequired) {
        showToast(data.message, 'error');
        navigate(`/verify-email?email=${encodeURIComponent(data.email || '')}`);
        return;
      }
      if (status === 401) setError(t('auth.wrongCredentials'));
      else if (status === 429) setError(t('auth.tooMany'));
      else if (status === 503) setError(t('auth.disabled'));
      else setError(t('auth.failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 sm:px-6 py-12">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{t('auth.loginTitle')}</h1>
        <p className="text-sm text-gray-500 mt-1">{t('auth.loginSubtitle')}</p>
      </div>

      <form onSubmit={gui} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-1.5">
            {t('auth.email')}
          </label>
          <input
            id="email" name="email" type="email" required autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={O_NHAP}
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-1.5">
            {t('auth.password')}
          </label>
          <input
            id="password" name="password" type="password" required autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={O_NHAP}
          />
        </div>

        {error && (
          <p className="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-orange-500 text-white py-3 rounded-2xl font-bold text-sm hover:bg-orange-600 disabled:opacity-50 transition-all shadow-sm"
        >
          {loading ? t('auth.loggingIn') : t('auth.loginBtn')}
        </button>

        <p className="text-sm text-gray-500 text-center">
          {t('auth.noAccount')}{' '}
          <Link to="/register" className="text-orange-600 font-semibold hover:underline">
            {t('auth.registerBtn')}
          </Link>
        </p>
        <p className="text-sm text-center">
          <Link to="/forgot-password" className="text-gray-500 hover:text-gray-600 transition-colors">
            {t('forgot.link')}
          </Link>
        </p>

        <SocialLogin onDone={sauKhiDangNhapMangXaHoi} />
      </form>

      <p className="text-xs text-gray-500 text-center mt-4">{t('auth.optionalNote')}</p>
    </div>
  );
}
