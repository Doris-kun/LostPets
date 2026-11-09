<template>
  <div class="max-w-md mx-auto px-4 py-12">
    <h1 class="text-2xl font-bold text-gray-900 text-center">{{ $t('reset.title') }}</h1>
    <p class="text-sm text-gray-400 text-center mt-2">{{ $t('reset.subtitle') }}</p>

    <!-- Vào thẳng đường dẫn mà không có mã thì nói rõ luôn, đừng bày biểu mẫu
         ra để người ta gõ xong mới báo hỏng. -->
    <div v-if="!token" class="mt-7 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center">
      <p class="text-gray-600 leading-relaxed">{{ $t('reset.noToken') }}</p>
      <router-link to="/forgot-password"
        class="inline-block mt-5 bg-gray-900 text-white rounded-xl px-5 py-2.5 text-sm font-semibold hover:bg-gray-800 transition-colors">
        {{ $t('reset.askAgain') }}
      </router-link>
    </div>

    <form v-else @submit.prevent="submit"
      class="mt-7 bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
      <div>
        <label for="password" class="block text-sm font-semibold text-gray-700 mb-1.5">{{ $t('reset.newPassword') }}</label>
        <input id="password" name="password" v-model="password" type="password" required minlength="6"
          autocomplete="new-password"
          class="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent"/>
        <p class="text-xs text-gray-400 mt-1.5">{{ $t('auth.passwordHint') }}</p>
      </div>

      <div>
        <label for="password2" class="block text-sm font-semibold text-gray-700 mb-1.5">{{ $t('reset.confirm') }}</label>
        <input id="password2" name="password2" v-model="confirm" type="password" required
          autocomplete="new-password"
          class="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent"/>
      </div>

      <p v-if="error" class="text-sm text-rose-500">{{ error }}</p>

      <button type="submit" :disabled="loading"
        class="w-full bg-orange-500 text-white rounded-xl py-2.5 text-sm font-bold hover:bg-orange-600 disabled:opacity-50 transition-colors">
        {{ loading ? $t('reset.saving') : $t('reset.submit') }}
      </button>
    </form>
  </div>
</template>

<script>
import api from '../api';

export default {
  name: 'ResetPassword',
  data() {
    return {
      token: this.$route.query.token || '',
      password: '',
      confirm: '',
      loading: false,
      error: '',
    };
  },
  methods: {
    async submit() {
      if (this.loading) return;
      // Kiểm trùng khớp ở đây chứ không gửi lên máy chủ: máy chủ không có
      // cách nào biết người ta gõ nhầm hay đổi ý.
      if (this.password !== this.confirm) {
        this.error = this.$t('reset.mismatch');
        return;
      }
      this.loading = true;
      this.error = '';
      try {
        await api.resetPassword({ token: this.token, password: this.password });
        this.$toast(this.$t('reset.done'));
        this.$router.push('/login');
      } catch (err) {
        const status = err.response && err.response.status;
        const message = err.response && err.response.data && err.response.data.message;
        // 400 ở đây có hai nghĩa khác hẳn nhau: mã hỏng/hết hạn, hoặc mật khẩu
        // quá ngắn. Máy chủ nói rõ từng trường hợp nên dùng thẳng câu của nó.
        if (status === 400) this.error = message || this.$t('reset.invalid');
        else if (status === 429) this.error = this.$t('auth.tooMany');
        else this.error = this.$t('auth.failed');
      } finally {
        this.loading = false;
      }
    },
  },
};
</script>
