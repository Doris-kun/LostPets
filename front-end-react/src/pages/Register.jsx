import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api';
import auth from '../auth';
import SocialLogin from '../components/SocialLogin.jsx';
import { useI18n } from '../i18n';
import { showToast } from '../toast';

const O_NHAP =
  'w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none ' +
  'focus:ring-2 focus:ring-primary focus:border-transparent transition';

const NHAN = 'block text-sm font-semibold text-gray-700 mb-1.5';

export default function Register() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const doiO = (key, value) => setForm((cu) => ({ ...cu, [key]: value }));

  // SocialLogin đã tự lưu phiên, ở đây chỉ còn việc chào và chuyển trang.
  const sauKhiDangNhapMangXaHoi = (user) => {
    showToast(`${t('auth.welcome')} ${user.name}`);
    navigate(searchParams.get('next') || '/');
  };

  const gui = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      // trim thay cho v-model.trim của Vue. Tên và email dính khoảng trắng ở
      // cuối là chuyện thường khi người dùng chép từ nơi khác.
      const { data } = await api.register({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
      });

      /*
       * ĐĂNG KÝ TRẢ VỀ MỘT TRONG HAI DẠNG, phải xử lý cả hai.
       *
       * Máy chủ gửi được thư xác minh thì KHÔNG trả token: tài khoản chỉ dùng
       * được sau khi bấm đường dẫn trong thư. Đưa thẳng sang trang xác minh,
       * chỗ đó có sẵn ô gửi lại nếu thư không tới.
       *
       * Đây là hợp đồng mới từ PR #104 (12/11). Giả định lúc nào cũng có
       * token là gọi auth.login(undefined, undefined) — phiên rỗng, giao diện
       * vẫn hiện "khách", và người dùng đứng im không hiểu chuyện gì. App di
       * động đã dính đúng lỗi này một lần rồi.
       */
      if (data.verifyRequired) {
        showToast(data.message);
        navigate(`/verify-email?email=${encodeURIComponent(data.email || '')}`);
        return;
      }

      // Máy chủ chưa cấu hình gửi thư thì vẫn cấp token như trước — không thể
      // bắt xác minh khi không gửi nổi thư nào.
      auth.login(data.token, data.user);
      showToast(`${t('auth.welcome')} ${data.user.name}`);
      navigate('/');
    } catch (err) {
      const status = err.response && err.response.status;
      const message = err.response && err.response.data && err.response.data.message;
      if (status === 409) setError(t('auth.emailTaken'));
      else if (status === 400) setError(message || t('auth.invalidInput'));
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
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{t('auth.registerTitle')}</h1>
        <p className="text-sm text-gray-500 mt-1">{t('auth.registerSubtitle')}</p>
      </div>

      <form onSubmit={gui} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <div>
          <label htmlFor="name" className={NHAN}>{t('auth.name')}</label>
          <input
            id="name" name="name" type="text" required autoComplete="name"
            value={form.name}
            onChange={(e) => doiO('name', e.target.value)}
            className={O_NHAP}
          />
        </div>

        <div>
          <label htmlFor="email" className={NHAN}>{t('auth.email')}</label>
          <input
            id="email" name="email" type="email" required autoComplete="email"
            value={form.email}
            onChange={(e) => doiO('email', e.target.value)}
            className={O_NHAP}
          />
        </div>

        <div>
          <label htmlFor="password" className={NHAN}>{t('auth.password')}</label>
          <input
            id="password" name="password" type="password" required minLength={6} autoComplete="new-password"
            value={form.password}
            onChange={(e) => doiO('password', e.target.value)}
            className={O_NHAP}
          />
          <p className="text-xs text-gray-500 mt-1.5">{t('auth.passwordHint')}</p>
        </div>

        {error && (
          <p className="text-sm text-danger-dark bg-danger-soft border border-danger-border rounded-xl px-4 py-3">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary text-white py-3 rounded-2xl font-bold text-sm hover:bg-primary-dark disabled:opacity-50 transition-all shadow-sm"
        >
          {loading ? t('auth.registering') : t('auth.registerBtn')}
        </button>

        <p className="text-sm text-gray-500 text-center">
          {t('auth.haveAccount')}{' '}
          <Link to="/login" className="text-accent font-semibold hover:underline">
            {t('auth.loginBtn')}
          </Link>
        </p>

        <SocialLogin onDone={sauKhiDangNhapMangXaHoi} />
      </form>

      <p className="text-xs text-gray-500 text-center mt-4">{t('auth.optionalNote')}</p>
    </div>
  );
}
