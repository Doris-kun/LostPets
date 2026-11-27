import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../api';
import auth from '../auth';
import loadScript from '../loadScript';
import { useI18n } from '../i18n';

const GOOGLE_SDK = 'https://accounts.google.com/gsi/client';
const FACEBOOK_SDK = 'https://connect.facebook.net/vi_VN/sdk.js';
// Facebook bắt FB.init phải khai phiên bản Graph API. Meta cho mỗi phiên bản
// sống khoảng hai năm rồi ngắt, nên con số này cần ngó lại mỗi năm học.
const FACEBOOK_API_VERSION = 'v26.0';

// Google chỉ nhận chiều rộng bằng pixel, và chặn trong khoảng 200–400.
// Không nhận phần trăm, nên phải tự đo khung bao rồi truyền số vào.
const MIN_WIDTH = 200;
const MAX_WIDTH = 400;

/*
 * HAI BIẾN NÀY LÀ CHỖ DỄ MẤT TÍNH NĂNG NHẤT CỦA CẢ ĐỢT CHUYỂN.
 *
 * Bản Vue đọc process.env.VUE_APP_GOOGLE_CLIENT_ID và
 * process.env.VUE_APP_FACEBOOK_APP_ID. Vite dùng tiền tố VITE_ và đọc qua
 * import.meta.env, nên tên phải đổi — và phải đổi cả trên Render.
 *
 * Quên đổi trên Render thì nút đăng nhập Google/Facebook BIẾN MẤT, không một
 * dòng lỗi nào: điều kiện hiện nút đòi đủ cả hai phía, thiếu mã ứng dụng là
 * nó lặng lẽ trả về false. Phần đăng nhập bằng mật khẩu vẫn chạy nên nhìn qua
 * tưởng mọi thứ bình thường.
 *
 * docs/chuyen-sang-react.md chỉ nhắc VUE_APP_API_URL, không nhắc hai cái này.
 */
const googleClientId = () => import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const facebookAppId = () => import.meta.env.VITE_FACEBOOK_APP_ID || '';

export default function SocialLogin({ onDone }) {
  const { t, lang } = useI18n();

  /*
   * Phải đủ CẢ HAI phía mới hiện nút: front-end có mã ứng dụng để gọi SDK, và
   * server đã cấu hình để xác minh token. Thiếu một bên mà vẫn vẽ nút thì
   * người dùng bấm vào chỉ nhận lỗi.
   */
  const [serverHas, setServerHas] = useState({ google: false, facebook: false });
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Hai nút phải rộng bằng nhau thì mới ra một cặp. Nút Google chỉ nhận số
  // pixel nên lấy nó làm chuẩn, nút Facebook ăn theo.
  const [btnWidth, setBtnWidth] = useState(320);

  const wrapRef = useRef(null);
  const googleBtnRef = useRef(null);
  const resizeTimer = useRef(null);

  const showGoogle = serverHas.google && Boolean(googleClientId());
  const showFacebook = serverHas.facebook && Boolean(facebookAppId());

  // Một nguồn duy nhất cho kích thước, để lớp vẽ, nút thật của Google và nút
  // Facebook không bao giờ lệch nhau. 40px là chiều cao nút cỡ large của
  // Google — lớp phủ phải trùng khít, lệch là hở ra chỗ bấm không ăn.
  const sizeStyle = { width: `${btnWidth}px`, height: '40px' };

  const done = useCallback(
    (data) => {
      auth.login(data.token, data.user);
      if (onDone) onDone(data.user);
    },
    [onDone],
  );

  /*
   * Mỗi mã lỗi một câu riêng.
   *
   * Gộp hết vào "Không thực hiện được, thử lại sau" thì người dùng không biết
   * phải làm gì, mà người sửa lỗi cũng mù: đã có lần cả một lỗi chặn mọi
   * người đăng ký tài khoản mới ẩn sau đúng câu đó, phải lần từ console xuống
   * tận chỉ mục cơ sở dữ liệu mới ra.
   */
  const fail = useCallback(
    (err) => {
      const status = err && err.response && err.response.status;
      if (status === 403) setError(t('auth.linkRefused'));
      else if (status === 401) setError(t('auth.providerRejected'));
      else if (status === 409) setError(t('auth.emailTaken'));
      else if (status === 429) setError(t('auth.tooMany'));
      else if (status === 503) setError(t('auth.disabled'));
      else setError(t('auth.failed'));
    },
    [t],
  );

  const measureWidth = useCallback(() => {
    const box = wrapRef.current;
    const w = box ? Math.round(box.clientWidth) : 0;
    return Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, w || 320));
  }, []);

  const renderGoogleButton = useCallback(
    (width) => {
      const host = googleBtnRef.current;
      if (!host || !window.google) return;
      // renderButton chỉ nối thêm chứ không thay thế, vẽ lại mà không dọn thì
      // thành hai nút chồng nhau.
      host.innerHTML = '';
      window.google.accounts.id.renderButton(host, {
        theme: 'outline', size: 'large', shape: 'pill',
        text: 'continue_with', width,
        locale: lang === 'en' ? 'en' : 'vi',
      });
    },
    [lang],
  );

  const onGoogleCredential = useCallback(
    async (response) => {
      setBusy(true);
      setError('');
      try {
        const { data } = await api.googleLogin({ credential: response.credential });
        done(data);
      } catch (err) {
        fail(err);
      } finally {
        setBusy(false);
      }
    },
    [done, fail],
  );

  // Giữ bản mới nhất: Google giữ callback mình đưa cho nó ở lần initialize,
  // mà initialize chỉ chạy một lần.
  const credentialRef = useRef(onGoogleCredential);
  useEffect(() => { credentialRef.current = onGoogleCredential; }, [onGoogleCredential]);

  // Hỏi server xem nhà cung cấp nào đang bật. Chạy một lần lúc gắn.
  useEffect(() => {
    let bo = false;

    api
      .authProviders()
      .then(({ data }) => {
        if (!bo) setServerHas(data);
      })
      .catch(() => {
        // Hỏi không được thì coi như không có, phần đăng nhập bằng mật khẩu
        // vẫn dùng bình thường.
        if (!bo) setServerHas({ google: false, facebook: false });
      })
      .finally(() => {
        if (!bo) setReady(true);
      });

    return () => { bo = true; };
  }, []);

  // Dựng nút Google sau khi biết chắc nó được bật và khung đã có bề rộng thật.
  useEffect(() => {
    if (!ready || !showGoogle) return undefined;
    let bo = false;

    const dung = async () => {
      try {
        await loadScript(GOOGLE_SDK);
        if (bo) return;
        window.google.accounts.id.initialize({
          client_id: googleClientId(),
          callback: (res) => credentialRef.current(res),
        });
        const w = measureWidth();
        setBtnWidth(w);
        renderGoogleButton(w);
      } catch {
        // Không tải được SDK thì ẩn nút đi, đừng để một ô trống khó hiểu.
        if (!bo) setServerHas((cu) => ({ ...cu, google: false }));
      }
    };

    dung();
    return () => { bo = true; };
  }, [ready, showGoogle, measureWidth, renderGoogleButton]);

  /*
   * Xoay ngang điện thoại là khung đổi bề rộng, mà nút Google giữ nguyên số
   * pixel cũ nên lệch hẳn so với nút Facebook. Đo lại rồi vẽ lại.
   *
   * Ngưỡng 4px để không vẽ lại vì những thay đổi vụn vặt — thanh cuộn xuất
   * hiện rồi biến mất cũng làm bề rộng nhúc nhích một hai pixel.
   */
  useEffect(() => {
    const onResize = () => {
      clearTimeout(resizeTimer.current);
      resizeTimer.current = setTimeout(() => {
        const next = measureWidth();
        setBtnWidth((cu) => {
          if (Math.abs(next - cu) < 4) return cu;
          if (showGoogle) renderGoogleButton(next);
          return next;
        });
      }, 200);
    };

    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      clearTimeout(resizeTimer.current);
    };
  }, [measureWidth, renderGoogleButton, showGoogle]);

  const loginFacebook = async () => {
    setBusy(true);
    setError('');
    try {
      await loadScript(FACEBOOK_SDK);
      window.FB.init({
        appId: facebookAppId(),
        cookie: false,
        xfbml: false,
        version: FACEBOOK_API_VERSION,
      });

      const authResponse = await new Promise((resolve) => {
        window.FB.login((res) => resolve(res && res.authResponse), {
          scope: 'public_profile,email',
        });
      });
      // Người dùng đóng cửa sổ hoặc bấm huỷ: im lặng, đó không phải lỗi.
      if (!authResponse) return;

      const { data } = await api.facebookLogin({ accessToken: authResponse.accessToken });
      done(data);
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  };

  if (!ready || (!showGoogle && !showFacebook)) return null;

  return (
    <div ref={wrapRef} className="mt-5">
      <div className="flex items-center gap-3 mb-4">
        <span className="h-px bg-gray-100 flex-1" />
        <span className="text-xs text-gray-500">{t('auth.or')}</span>
        <span className="h-px bg-gray-100 flex-1" />
      </div>

      <div className="flex flex-col items-center gap-2.5">
        {/*
          Nút Google gồm HAI lớp chồng nhau. Lớp dưới là nút mình tự vẽ để
          nhìn, lớp trên là nút thật của Google để trong suốt, giữ nguyên phần
          bấm. Không tự gọi thẳng SDK vì luồng lấy ID token chỉ chạy qua nút do
          Google dựng.

          Vẫn phải tự vẽ dù kiểu "outline" của Google trông gần giống: kiểu đó
          có bo góc, cỡ chữ và sắc viền riêng, đặt cạnh nút Facebook là lộ ra
          lệch. Tự vẽ cả hai thì chắc chắn trùng nhau.

          Dùng hidden chứ không gỡ hẳn khỏi cây: googleBtnRef phải tồn tại thì
          SDK mới có chỗ để vẽ vào.
        */}
        {/*
          Bốn mã màu của chữ G và xanh Facebook bên dưới là màu của NGƯỜI KHÁC,
          cố ý viết cứng: Google và Facebook đều có hướng dẫn riêng về nút
          "Tiếp tục với...", và người dùng nhận ra nút nhờ đúng cặp màu đó. Tô
          hai nút bằng màu của LostPets thì mất hết dấu hiệu nhận biết.

          Riêng NỀN và CHỮ của nút thì dùng token, vì hai thứ đó phải đổi theo
          chế độ sáng/tối — Google cũng có bản tối cho nút của họ. Trước đây
          chữ viết cứng #3c4043: nền đổi sang tối mà chữ vẫn đậm thì nút còn ở
          đó nhưng không ai đọc được.
        */}
        <div className={'relative group ' + (showGoogle ? '' : 'hidden')} style={sizeStyle}>
          <div
            aria-hidden="true"
            className="absolute inset-0 flex items-center rounded-full border border-social-border bg-card group-hover:bg-gray-50 transition-colors"
          >
            <span className="absolute left-3 flex items-center">
              <svg className="w-5 h-5" viewBox="0 0 48 48" aria-hidden="true">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
              </svg>
            </span>
            <span className="w-full text-center text-sm font-medium text-gray-900 px-11 truncate">
              {t('auth.withGoogle')}
            </span>
          </div>
          {/* Nút thật: trong suốt nhưng vẫn nhận cú bấm, phủ đúng bằng lớp dưới. */}
          <div ref={googleBtnRef} className="absolute inset-0 opacity-0 overflow-hidden" />
        </div>

        {showFacebook && (
          <button
            type="button"
            onClick={loginFacebook}
            disabled={busy}
            style={sizeStyle}
            className="relative flex items-center rounded-full border border-social-border bg-card hover:bg-gray-50 active:bg-gray-100 disabled:opacity-50 disabled:hover:bg-card transition-colors"
          >
            <span className="absolute left-3 flex items-center">
              {busy ? (
                <svg className="w-5 h-5 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#1877F2" d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.25h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z" />
                </svg>
              )}
            </span>
            <span className="w-full text-center text-sm font-medium text-gray-900 px-11 truncate">
              {busy ? t('auth.loggingIn') : t('auth.withFacebook')}
            </span>
          </button>
        )}
      </div>

      {error && (
        <p className="text-sm text-danger-dark bg-danger-soft border border-danger-border rounded-xl px-4 py-3 mt-3">
          {error}
        </p>
      )}
    </div>
  );
}
