<template>
  <div v-if="ready && (showGoogle || showFacebook)" ref="wrap" class="mt-5">
    <div class="flex items-center gap-3 mb-4">
      <span class="h-px bg-gray-100 flex-1"></span>
      <span class="text-xs text-gray-400">{{ $t('auth.or') }}</span>
      <span class="h-px bg-gray-100 flex-1"></span>
    </div>

    <div class="flex flex-col items-center gap-2.5">
      <!-- Nút Google gồm HAI lớp chồng nhau.
           Google chỉ cho ba kiểu dựng sẵn — trắng viền, xanh đặc, đen đặc —
           không có kiểu nền xám. Nên lớp dưới là nút mình tự vẽ để nhìn, còn
           lớp trên là nút thật của Google để trong suốt, giữ nguyên phần bấm.
           Không tự gọi thẳng SDK vì luồng lấy ID token chỉ chạy qua nút của họ. -->
      <div v-show="showGoogle" class="relative group" :style="sizeStyle">
        <div aria-hidden="true"
          class="absolute inset-0 flex items-center rounded-full bg-[#f1f3f4] group-hover:bg-[#e8eaed] transition-colors">
          <span class="absolute left-3 flex items-center">
            <svg class="w-5 h-5" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
          </span>
          <span class="w-full text-center text-sm font-medium text-[#3c4043] px-11 truncate">
            {{ $t('auth.withGoogle') }}
          </span>
        </div>
        <!-- Nút thật: trong suốt nhưng vẫn nhận cú bấm, phủ đúng bằng lớp dưới. -->
        <div ref="googleBtn" class="absolute inset-0 opacity-0 overflow-hidden"></div>
      </div>

      <button v-if="showFacebook" type="button" @click="loginFacebook" :disabled="busy"
        :style="sizeStyle"
        class="relative flex items-center rounded-full border border-gray-200 bg-white hover:bg-gray-50 active:bg-gray-100 disabled:opacity-50 disabled:hover:bg-white transition-colors">
        <span class="absolute left-3 flex items-center">
          <svg v-if="busy" class="w-5 h-5 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
          </svg>
          <svg v-else class="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#1877F2" d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.25h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z"/>
          </svg>
        </span>
        <span class="w-full text-center text-sm font-medium text-[#3c4043] px-11 truncate">
          {{ busy ? $t('auth.loggingIn') : $t('auth.withFacebook') }}
        </span>
      </button>
    </div>

    <p v-if="error" class="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3 mt-3">
      {{ error }}
    </p>
  </div>
</template>

<script>
import api from '../api';
import auth from '../auth';
import loadScript from '../loadScript';

const GOOGLE_SDK = 'https://accounts.google.com/gsi/client';
const FACEBOOK_SDK = 'https://connect.facebook.net/vi_VN/sdk.js';
// Facebook bắt FB.init phải khai phiên bản Graph API. Meta cho mỗi phiên bản
// sống khoảng hai năm rồi ngắt, nên con số này cần ngó lại mỗi năm học.
const FACEBOOK_API_VERSION = 'v26.0';

// Google chỉ nhận chiều rộng bằng pixel, và chặn trong khoảng 200–400.
// Không nhận phần trăm, nên phải tự đo khung bao rồi truyền số vào.
const MIN_WIDTH = 200;
const MAX_WIDTH = 400;

const googleClientId = () => process.env.VUE_APP_GOOGLE_CLIENT_ID || '';
const facebookAppId = () => process.env.VUE_APP_FACEBOOK_APP_ID || '';

export default {
  name: 'SocialLogin',
  data() {
    return {
      // Phải đủ CẢ HAI phía mới hiện nút: front-end có mã ứng dụng để gọi SDK,
      // và server đã cấu hình để xác minh token. Thiếu một bên mà vẫn vẽ nút
      // thì người dùng bấm vào chỉ nhận lỗi.
      serverHas: { google: false, facebook: false },
      ready: false,
      busy: false,
      // Hai nút phải rộng bằng nhau thì mới ra một cặp. Nút Google chỉ nhận
      // số pixel nên lấy nó làm chuẩn, nút Facebook ăn theo.
      btnWidth: 320,
      error: '',
    };
  },
  computed: {
    // Một nguồn duy nhất cho kích thước, để lớp vẽ, nút thật của Google và nút
    // Facebook không bao giờ lệch nhau. 40px là chiều cao nút cỡ large của
    // Google — lớp phủ phải trùng khít, lệch là hở ra chỗ bấm không ăn.
    sizeStyle() {
      return { width: `${this.btnWidth}px`, height: '40px' };
    },
    showGoogle() { return this.serverHas.google && Boolean(googleClientId()); },
    showFacebook() { return this.serverHas.facebook && Boolean(facebookAppId()); },
  },
  async mounted() {
    try {
      const { data } = await api.authProviders();
      this.serverHas = data;
    } catch {
      // Hỏi không được thì coi như không có, phần đăng nhập bằng mật khẩu
      // vẫn dùng bình thường.
      this.serverHas = { google: false, facebook: false };
    }
    this.ready = true;
    this.$nextTick(() => {
      this.btnWidth = this.measureWidth();
      if (this.showGoogle) this.setupGoogle();
    });
    window.addEventListener('resize', this.onResize);
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.onResize);
    clearTimeout(this.resizeTimer);
  },
  methods: {
    done(data) {
      auth.login(data.token, data.user);
      this.$emit('done', data.user);
    },
    fail(err) {
      const status = err && err.response && err.response.status;
      if (status === 403) this.error = this.$t('auth.linkRefused');
      else if (status === 401) this.error = this.$t('auth.providerRejected');
      else if (status === 503) this.error = this.$t('auth.disabled');
      else this.error = this.$t('auth.failed');
    },
    async setupGoogle() {
      try {
        await loadScript(GOOGLE_SDK);
        window.google.accounts.id.initialize({
          client_id: googleClientId(),
          callback: this.onGoogleCredential,
        });
        this.renderGoogleButton();
      } catch {
        // Không tải được SDK thì ẩn nút đi, đừng để một ô trống khó hiểu.
        this.serverHas = { ...this.serverHas, google: false };
      }
    },
    measureWidth() {
      const box = this.$refs.wrap;
      const w = box ? Math.round(box.clientWidth) : 0;
      return Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, w || 320));
    },
    renderGoogleButton() {
      const host = this.$refs.googleBtn;
      if (!host || !window.google) return;
      // renderButton chỉ nối thêm chứ không thay thế, vẽ lại mà không dọn thì
      // thành hai nút chồng nhau.
      host.innerHTML = '';
      window.google.accounts.id.renderButton(host, {
        theme: 'outline', size: 'large', shape: 'pill',
        text: 'continue_with', width: this.btnWidth,
        locale: this.$lang === 'en' ? 'en' : 'vi',
      });
    },
    // Xoay ngang điện thoại là khung đổi bề rộng, mà nút Google giữ nguyên số
    // pixel cũ nên lệch hẳn so với nút Facebook. Đo lại rồi vẽ lại.
    onResize() {
      clearTimeout(this.resizeTimer);
      this.resizeTimer = setTimeout(() => {
        const next = this.measureWidth();
        if (Math.abs(next - this.btnWidth) < 4) return;
        this.btnWidth = next;
        if (this.showGoogle) this.renderGoogleButton();
      }, 200);
    },
    async onGoogleCredential(response) {
      this.busy = true;
      this.error = '';
      try {
        const { data } = await api.googleLogin({ credential: response.credential });
        this.done(data);
      } catch (err) {
        this.fail(err);
      } finally {
        this.busy = false;
      }
    },
    async loginFacebook() {
      this.busy = true;
      this.error = '';
      try {
        await loadScript(FACEBOOK_SDK);
        window.FB.init({
          appId: facebookAppId(),
          cookie: false,
          xfbml: false,
          version: FACEBOOK_API_VERSION,
        });

        const authResponse = await new Promise((resolve) => {
          window.FB.login((res) => resolve(res && res.authResponse), { scope: 'public_profile,email' });
        });
        // Người dùng đóng cửa sổ hoặc bấm huỷ: im lặng, đó không phải lỗi.
        if (!authResponse) return;

        const { data } = await api.facebookLogin({ accessToken: authResponse.accessToken });
        this.done(data);
      } catch (err) {
        this.fail(err);
      } finally {
        this.busy = false;
      }
    },
  },
};
</script>
