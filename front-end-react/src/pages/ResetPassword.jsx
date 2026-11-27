import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api';
import { useI18n } from '../i18n';
import { showToast } from '../toast';

const O_NHAP =
  'w-full border border-gray-400 rounded-xl px-4 py-2.5 text-sm focus:outline-none ' +
  'focus:ring-2 focus:ring-primary focus:border-transparent';

export default function ResetPassword() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  /*
   * Mã đặt lại đi qua QUERY, không qua đường dẫn.
   *
   * Đường dẫn hay bị ghi vào log máy chủ và nằm trong lịch sử trình duyệt mà
   * người ta chia sẻ được; query thì ít nhất cũng không nằm trong phần ai
   * cũng chép đi chép lại.
   */
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const gui = async (e) => {
    e.preventDefault();
    if (loading) return;

    // Kiểm trùng khớp ở đây chứ không gửi lên máy chủ: máy chủ không có cách
    // nào biết người ta gõ nhầm hay đổi ý.
    if (password !== confirm) {
      setError(t('reset.mismatch'));
      return;
    }

    setLoading(true);
    setError('');
    try {
      await api.resetPassword({ token, password });
      showToast(t('reset.done'));
      navigate('/login');
    } catch (err) {
      const status = err.response && err.response.status;
      const message = err.response && err.response.data && err.response.data.message;
      // 400 ở đây có hai nghĩa khác hẳn nhau: mã hỏng/hết hạn, hoặc mật khẩu
      // quá ngắn. Máy chủ nói rõ từng trường hợp nên dùng thẳng câu của nó.
      if (status === 400) setError(message || t('reset.invalid'));
      else if (status === 429) setError(t('auth.tooMany'));
      else setError(t('auth.failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold text-gray-900 text-center">{t('reset.title')}</h1>
      <p className="text-sm text-gray-500 text-center mt-2">{t('reset.subtitle')}</p>

      {!token ? (
        /*
          Vào thẳng đường dẫn mà không có mã thì nói rõ luôn, đừng bày biểu mẫu
          ra để người ta gõ xong mới báo hỏng.
        */
        <div className="mt-7 bg-card rounded-2xl border border-gray-100 shadow-sm p-6 text-center">
          <p className="text-gray-600 leading-relaxed">{t('reset.noToken')}</p>
          <Link
            to="/forgot-password"
            className="inline-block mt-5 bg-gray-900 text-gray-50 rounded-xl px-5 py-2.5 text-sm font-semibold hover:bg-gray-800 transition-colors"
          >
            {t('reset.askAgain')}
          </Link>
        </div>
      ) : (
        <form onSubmit={gui} className="mt-7 bg-card rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-1.5">
              {t('reset.newPassword')}
            </label>
            <input
              id="password" name="password" type="password" required minLength={6} autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={O_NHAP}
            />
            <p className="text-xs text-gray-500 mt-1.5">{t('auth.passwordHint')}</p>
          </div>

          <div>
            <label htmlFor="password2" className="block text-sm font-semibold text-gray-700 mb-1.5">
              {t('reset.confirm')}
            </label>
            {/*
              Ô nhập lại. Mật khẩu bị che nên người dùng không đọc lại được thứ
              mình vừa gõ — gõ nhầm một ký tự là họ đặt phải một mật khẩu không
              hề biết, mà đường dẫn trong thư thì dùng một lần rồi hết hạn.
            */}
            <input
              id="password2" name="password2" type="password" required autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className={O_NHAP}
            />
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-on-primary rounded-xl py-2.5 text-sm font-bold hover:bg-primary-dark disabled:opacity-50 transition-colors"
          >
            {loading ? t('reset.saving') : t('reset.submit')}
          </button>
        </form>
      )}
    </div>
  );
}
