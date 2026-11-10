<template>
  <div class="max-w-md mx-auto px-4 py-12">
    <h1 class="text-2xl font-bold text-gray-900 text-center">{{ $t('forgot.title') }}</h1>
    <p class="text-sm text-gray-400 text-center mt-2">{{ $t('forgot.subtitle') }}</p>

    <!-- Gửi xong thì KHÔNG quay lại biểu mẫu. Để người ta gõ lại email lần nữa
         chỉ khiến họ tưởng lần đầu hỏng, rồi bấm thêm mấy lần nữa — mỗi lần là
         một lá thư và một bước gần hơn tới giới hạn chặn tần suất. -->
    <div v-if="sent" class="mt-7 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center">
      <div class="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mx-auto">
        <svg class="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
        </svg>
      </div>
      <p class="font-bold text-gray-900 mt-4">{{ $t('forgot.sentTitle') }}</p>
      <p class="text-sm text-gray-500 leading-relaxed mt-2">{{ message }}</p>
      <router-link to="/login"
        class="inline-block mt-5 bg-gray-900 text-white rounded-xl px-5 py-2.5 text-sm font-semibold hover:bg-gray-800 transition-colors">
        {{ $t('forgot.backToLogin') }}
      </router-link>
    </div>

    <form v-else @submit.prevent="submit"
      class="mt-7 bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
      <div>
        <label for="email" class="block text-sm font-semibold text-gray-700 mb-1.5">{{ $t('auth.email') }}</label>
        <input id="email" name="email" v-model.trim="email" type="email" required autocomplete="email"
          class="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent"/>
      </div>

      <p v-if="error" class="text-sm text-rose-500">{{ error }}</p>

      <button type="submit" :disabled="loading"
        class="w-full bg-orange-500 text-white rounded-xl py-2.5 text-sm font-bold hover:bg-orange-600 disabled:opacity-50 transition-colors">
        {{ loading ? $t('forgot.sending') : $t('forgot.submit') }}
      </button>

      <p class="text-sm text-gray-400 text-center">
        <router-link to="/login" class="text-orange-600 font-semibold hover:underline">{{ $t('forgot.backToLogin') }}</router-link>
      </p>
    </form>
  </div>
</template>

<script>
import api from '../api';

export default {
  name: 'ForgotPassword',
  data() {
    return { email: '', loading: false, error: '', sent: false, message: '' };
  },
  methods: {
    async submit() {
      if (this.loading) return;
      this.loading = true;
      this.error = '';
      try {
        const { data } = await api.forgotPassword({ email: this.email });
        // Máy chủ cố ý trả về cùng một câu dù email có tài khoản hay không,
        // nên hiện thẳng câu của nó chứ đừng tự chế câu khác — tự chế là dễ
        // lỡ nói ra điều máy chủ đang cố không nói.
        this.message = data.message;
        this.sent = true;
      } catch (err) {
        const status = err.response && err.response.status;
        if (status === 429) this.error = this.$t('auth.tooMany');
        else if (status === 503) this.error = this.$t('forgot.disabled');
        else this.error = this.$t('auth.failed');
      } finally {
        this.loading = false;
      }
    },
  },
};
</script>
