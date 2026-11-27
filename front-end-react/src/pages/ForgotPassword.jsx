import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { useI18n } from '../i18n';

export default function ForgotPassword() {
  const { t } = useI18n();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [message, setMessage] = useState('');

  const gui = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError('');
    try {
      const { data } = await api.forgotPassword({ email: email.trim() });
      /*
       * Hiện thẳng câu của máy chủ, đừng tự chế câu khác.
       *
       * Máy chủ cố ý trả về CÙNG MỘT CÂU dù email có tài khoản hay không — để
       * người lạ không dò được địa chỉ nào đã đăng ký. Tự chế câu ở đây là dễ
       * lỡ nói ra đúng điều máy chủ đang cố không nói.
       */
      setMessage(data.message);
      setSent(true);
    } catch (err) {
      const status = err.response && err.response.status;
      if (status === 429) setError(t('auth.tooMany'));
      else if (status === 503) setError(t('forgot.disabled'));
      else setError(t('auth.failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold text-gray-900 text-center">{t('forgot.title')}</h1>
      <p className="text-sm text-gray-500 text-center mt-2">{t('forgot.subtitle')}</p>

      {sent ? (
        /*
          Gửi xong thì KHÔNG quay lại biểu mẫu. Để người ta gõ lại email lần
          nữa chỉ khiến họ tưởng lần đầu hỏng, rồi bấm thêm mấy lần nữa — mỗi
          lần là một lá thư và một bước gần hơn tới giới hạn chặn tần suất.
        */
        <div className="mt-7 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-primary-soft flex items-center justify-center mx-auto">
            <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="font-bold text-gray-900 mt-4">{t('forgot.sentTitle')}</p>
          <p className="text-sm text-gray-500 leading-relaxed mt-2">{message}</p>
          <Link
            to="/login"
            className="inline-block mt-5 bg-gray-900 text-white rounded-xl px-5 py-2.5 text-sm font-semibold hover:bg-gray-800 transition-colors"
          >
            {t('forgot.backToLogin')}
          </Link>
        </div>
      ) : (
        <form onSubmit={gui} className="mt-7 bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-1.5">
              {t('auth.email')}
            </label>
            <input
              id="email" name="email" type="email" required autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-400 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white rounded-xl py-2.5 text-sm font-bold hover:bg-primary-dark disabled:opacity-50 transition-colors"
          >
            {loading ? t('forgot.sending') : t('forgot.submit')}
          </button>

          <p className="text-sm text-gray-500 text-center">
            <Link to="/login" className="text-accent font-semibold hover:underline">
              {t('forgot.backToLogin')}
            </Link>
          </p>
        </form>
      )}
    </div>
  );
}
