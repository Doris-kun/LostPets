<template>
  <div class="max-w-md mx-auto px-4 sm:px-6 py-12">
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900 tracking-tight">{{ $t('auth.loginTitle') }}</h1>
      <p class="text-sm text-gray-500 mt-1">{{ $t('auth.loginSubtitle') }}</p>
    </div>

    <form @submit.prevent="submit" class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
      <div>
        <label for="email" class="block text-sm font-semibold text-gray-700 mb-1.5">{{ $t('auth.email') }}</label>
        <input id="email" name="email" v-model.trim="form.email" type="email" required autocomplete="email"
          class="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent transition"/>
      </div>
      <div>
        <label for="password" class="block text-sm font-semibold text-gray-700 mb-1.5">{{ $t('auth.password') }}</label>
        <input id="password" name="password" v-model="form.password" type="password" required autocomplete="current-password"
          class="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent transition"/>
      </div>

      <p v-if="error" class="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3">{{ error }}</p>

      <button type="submit" :disabled="loading"
        class="w-full bg-orange-500 text-white py-3 rounded-2xl font-bold text-sm hover:bg-orange-600 disabled:opacity-50 transition-all shadow-sm">
        {{ loading ? $t('auth.loggingIn') : $t('auth.loginBtn') }}
      </button>

      <p class="text-sm text-gray-500 text-center">
        {{ $t('auth.noAccount') }}
        <router-link to="/register" class="text-orange-600 font-semibold hover:underline">{{ $t('auth.registerBtn') }}</router-link>
      </p>
      <p class="text-sm text-center">
        <router-link to="/forgot-password" class="text-gray-500 hover:text-gray-600 transition-colors">
          {{ $t('forgot.link') }}
        </router-link>
      </p>
      <SocialLogin @done="afterSocial"/>
    </form>

    <p class="text-xs text-gray-500 text-center mt-4">{{ $t('auth.optionalNote') }}</p>
  </div>
</template>

<script>
import api from '../api';
import auth from '../auth';
import SocialLogin from '../components/SocialLogin.vue';

export default {
  name: 'Login',
  components: { SocialLogin },
  data() {
    return { form: { email: '', password: '' }, loading: false, error: '' };
  },
  methods: {
    // SocialLogin đã tự lưu phiên, ở đây chỉ còn việc chào và chuyển trang.
    afterSocial(user) {
      this.$toast(`${this.$t('auth.welcome')} ${user.name}`);
      this.$router.push(this.$route.query.next || '/');
    },
    async submit() {
      this.error = '';
      this.loading = true;
      try {
        const { data } = await api.login(this.form);
        auth.login(data.token, data.user);
        this.$toast(`${this.$t('auth.welcome')} ${data.user.name}`);
        this.$router.push(this.$route.query.next || '/');
      } catch (err) {
        const status = err.response && err.response.status;
        const data = (err.response && err.response.data) || {};

        // Chưa xác minh là chuyện khác hẳn sai mật khẩu. Gộp vào "sai thông
        // tin đăng nhập" thì người dùng gõ lại mật khẩu đúng mười lần vẫn
        // không vào được mà không hiểu vì sao.
        if (status === 403 && data.verifyRequired) {
          this.$toast(data.message, 'error');
          this.$router.push({ path: '/verify-email', query: { email: data.email } });
          return;
        }
        if (status === 401) this.error = this.$t('auth.wrongCredentials');
        else if (status === 429) this.error = this.$t('auth.tooMany');
        else if (status === 503) this.error = this.$t('auth.disabled');
        else this.error = this.$t('auth.failed');
      } finally {
        this.loading = false;
      }
    },
  },
};
</script>
