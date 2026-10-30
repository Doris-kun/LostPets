<template>
  <div v-if="ready && (showGoogle || showFacebook)" class="mt-5">
    <div class="flex items-center gap-3 mb-4">
      <span class="h-px bg-gray-100 flex-1"></span>
      <span class="text-xs text-gray-400">{{ $t('auth.or') }}</span>
      <span class="h-px bg-gray-100 flex-1"></span>
    </div>

    <!-- Google tự vẽ nút của họ vào đây. Dùng nút của Google thay vì tự vẽ để
         khỏi sai quy định thương hiệu, và để họ lo phần đa ngôn ngữ. -->
    <div v-show="showGoogle" ref="googleBtn" class="flex justify-center"></div>

    <button v-if="showFacebook" type="button" @click="loginFacebook" :disabled="busy"
      class="w-full mt-2.5 flex items-center justify-center gap-2.5 bg-[#1877F2] text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-[#166FE5] disabled:opacity-50 transition-colors">
      <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.25h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z"/>
      </svg>
      {{ busy ? $t('auth.loggingIn') : $t('auth.withFacebook') }}
    </button>

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
const FACEBOOK_API_VERSION = 'v21.0';

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
      error: '',
    };
  },
  computed: {
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
    if (this.showGoogle) this.$nextTick(this.setupGoogle);
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
        window.google.accounts.id.renderButton(this.$refs.googleBtn, {
          theme: 'outline', size: 'large', shape: 'pill',
          text: 'continue_with', width: 320,
          locale: this.$lang === 'en' ? 'en' : 'vi',
        });
      } catch {
        // Không tải được SDK thì ẩn nút đi, đừng để một ô trống khó hiểu.
        this.serverHas = { ...this.serverHas, google: false };
      }
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
