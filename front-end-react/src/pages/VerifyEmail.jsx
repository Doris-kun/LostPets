import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../api';
import auth from '../auth';
import { useI18n } from '../i18n';
import { showToast } from '../toast';

export default function VerifyEmail() {
  const { t } = useI18n();
  const [searchParams] = useSearchParams();

  const token = searchParams.get('token') || '';

  // Không có mã thì khỏi gọi máy chủ, vào thẳng trạng thái hỏng kèm ô gửi lại.
  const [trangThai, setTrangThai] = useState(token ? 'dangChay' : 'hong');
  const [loi, setLoi] = useState('');

  /*
   * Điền sẵn địa chỉ nếu nơi đưa tới đây biết nó — trang đăng ký và trang
   * đăng nhập đều biết. Bắt gõ lại một thứ vừa gõ xong là thêm một chỗ để gõ
   * sai.
   */
  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [dangGui, setDangGui] = useState(false);

  /*
   * CHỐT CHẶN CHẠY HAI LẦN — bắt buộc, không phải cẩn thận thừa.
   *
   * React 19 ở chế độ phát triển gắn component, tháo ra, rồi gắn lại để lộ
   * chỗ dọn dẹp thiếu. Nghĩa là effect chạy HAI LẦN.
   *
   * Mà mã xác minh dùng ĐÚNG MỘT LẦN: lượt gọi đầu tiêu mất nó, lượt thứ hai
   * nhận lỗi "mã không hợp lệ". Người dùng bấm đường dẫn trong thư, xác minh
   * thành công thật, nhưng màn hình hiện ra câu báo hỏng kèm ô gửi lại — rồi
   * họ gửi lại, bấm tiếp, lại hỏng y như vậy.
   *
   * Bản Vue không dính vì created() chỉ chạy một lần. Đây là chỗ khác biệt
   * giữa hai framework, không phải chỗ chép thiếu.
   *
   * useRef chứ không useState: cờ này phải có hiệu lực NGAY trong cùng một
   * lượt, state thì tới lần vẽ sau mới đổi — mà lúc đó lượt gọi thứ hai đã đi
   * rồi.
   */
  const daGoi = useRef(false);

  useEffect(() => {
    if (!token || daGoi.current) return;
    daGoi.current = true;

    api
      .verifyEmail({ token })
      .then(({ data }) => {
        /*
         * Nhận token MỚI từ máy chủ.
         *
         * Vai trò trong token cũ đã lạc hậu — xác minh xong có thể vừa được
         * cấp quyền quản trị. Không nhận token mới thì người dùng phải tự
         * đăng xuất rồi đăng nhập lại mới thấy mục Quản trị.
         */
        if (data && data.token) auth.login(data.token, data.user);
        setTrangThai('xong');
      })
      .catch((err) => {
        const message = err.response && err.response.data && err.response.data.message;
        setLoi(message || '');
        setTrangThai('hong');
      });
  }, [token]);

  const guiLai = async (e) => {
    e.preventDefault();
    if (dangGui) return;
    setDangGui(true);
    try {
      const { data } = await api.resendVerification({ email: email.trim() });
      showToast(data.message);
    } catch (err) {
      const status = err.response && err.response.status;
      showToast(status === 429 ? t('auth.tooMany') : t('auth.failed'));
    } finally {
      setDangGui(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold text-gray-900 text-center">{t('verify.title')}</h1>

      <div className="mt-7 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center">
        {trangThai === 'dangChay' && <p className="text-gray-600">{t('verify.working')}</p>}

        {trangThai === 'xong' && (
          <>
            <p className="text-gray-700 leading-relaxed">{t('verify.done')}</p>
            <Link
              to="/"
              className="inline-block mt-5 bg-primary text-white rounded-xl px-5 py-2.5 text-sm font-bold hover:bg-primary-dark transition-colors"
            >
              {t('verify.goHome')}
            </Link>
          </>
        )}

        {trangThai === 'hong' && (
          <>
            <p className="text-gray-700 leading-relaxed">{loi || t('verify.failed')}</p>

            {/*
              Gửi lại đặt ngay đây, vì lý do hỏng hay gặp nhất là đường dẫn đã
              quá 24 giờ. Bắt người ta đi tìm nút gửi lại ở chỗ khác thì phần
              lớn sẽ bỏ cuộc.
            */}
            <form onSubmit={guiLai} className="mt-5 text-left">
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-1.5">
                {t('verify.resendLabel')}
              </label>
              <input
                id="email" name="email" type="email" required autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              <button
                type="submit"
                disabled={dangGui}
                className="w-full mt-3 bg-gray-900 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-gray-800 disabled:opacity-50 transition-colors"
              >
                {dangGui ? t('verify.sending') : t('verify.resend')}
              </button>
            </form>
          </>
        )}
      </div>

      {/*
        Nói rõ chưa xác minh thì vẫn dùng được, để không ai tưởng tài khoản
        của mình đang bị khoá.
      */}
      <p className="text-xs text-gray-500 text-center mt-5 leading-relaxed">{t('verify.note')}</p>
    </div>
  );
}
