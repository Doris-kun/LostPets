<template>
  <div class="max-w-md mx-auto px-4 sm:px-6 py-12">
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900 tracking-tight">{{ $t('auth.loginTitle') }}</h1>
      <p class="text-sm text-gray-400 mt-1">{{ $t('auth.loginSubtitle') }}</p>
    </div>

    <form @submit.prevent="submit" class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
      <div>
        <label class="block text-sm font-semibold text-gray-700 mb-1.5">{{ $t('auth.email') }}</label>
        <input v-model.trim="form.email" type="email" required autocomplete="email"
          class="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent transition"/>
      </div>
      <div>
        <label class="block text-sm font-semibold text-gray-700 mb-1.5">{{ $t('auth.password') }}</label>
        <input v-model="form.password" type="password" required autocomplete="current-password"
          class="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent transition"/>
      </div>

      <p v-if="error" class="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3">{{ error }}</p>

      <button type="submit" :disabled="loading"
        class="w-full bg-orange-500 text-white py-3 rounded-2xl font-bold text-sm hover:bg-orange-600 disabled:opacity-50 transition-all shadow-sm">
        {{ loading ? $t('auth.loggingIn') : $t('auth.loginBtn') }}
      </button>

      <p class="text-sm text-gray-400 text-center">
        {{ $t('auth.noAccount') }}
        <router-link to="/register" class="text-orange-600 font-semibold hover:underline">{{ $t('auth.registerBtn') }}</router-link>
      </p>
      <SocialLogin @done="afterSocial"/>
    </form>

    <p class="text-xs text-gray-400 text-center mt-4">{{ $t('auth.optionalNote') }}</p>
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
        if (status === 401) this.error = this.$t('auth.wrongCredentials');
        else if (status === 503) this.error = this.$t('auth.disabled');
        else this.error = this.$t('auth.failed');
      } finally {
        this.loading = false;
      }
    },
  },
};
</script>
