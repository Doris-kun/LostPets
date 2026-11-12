<template>
  <div class="max-w-md mx-auto px-4 py-12">
    <h1 class="text-2xl font-bold text-gray-900 text-center">{{ $t('verify.title') }}</h1>

    <div class="mt-7 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center">
      <p v-if="trangThai === 'dangChay'" class="text-gray-600">{{ $t('verify.working') }}</p>

      <template v-else-if="trangThai === 'xong'">
        <p class="text-gray-700 leading-relaxed">{{ $t('verify.done') }}</p>
        <router-link to="/"
          class="inline-block mt-5 bg-orange-500 text-white rounded-xl px-5 py-2.5 text-sm font-bold hover:bg-orange-600 transition-colors">
          {{ $t('verify.goHome') }}
        </router-link>
      </template>

      <template v-else>
        <p class="text-gray-700 leading-relaxed">{{ loi || $t('verify.failed') }}</p>

        <!-- Gửi lại đặt ngay đây, vì lý do hỏng hay gặp nhất là đường dẫn đã
             quá 24 giờ. Bắt người ta đi tìm nút gửi lại ở chỗ khác thì phần
             lớn sẽ bỏ cuộc. -->
        <form @submit.prevent="guiLai" class="mt-5 text-left">
          <label for="email" class="block text-sm font-semibold text-gray-700 mb-1.5">
            {{ $t('verify.resendLabel') }}
          </label>
          <input id="email" name="email" v-model="email" type="email" required
            autocomplete="email"
            class="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent"/>
          <button type="submit" :disabled="dangGui"
            class="w-full mt-3 bg-gray-900 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-gray-800 disabled:opacity-50 transition-colors">
            {{ dangGui ? $t('verify.sending') : $t('verify.resend') }}
          </button>
        </form>
      </template>
    </div>

    <!-- Nói rõ chưa xác minh thì vẫn dùng được, để không ai tưởng tài khoản
         của mình đang bị khoá. -->
    <p class="text-xs text-gray-500 text-center mt-5 leading-relaxed">{{ $t('verify.note') }}</p>
  </div>
</template>

<script>
import api from '../api';
import auth from '../auth';

export default {
  name: 'VerifyEmail',
  data() {
    return {
      // Không có mã thì khỏi gọi máy chủ, vào thẳng trạng thái hỏng kèm ô gửi lại.
      trangThai: this.$route.query.token ? 'dangChay' : 'hong',
      loi: '',
      // Điền sẵn địa chỉ nếu nơi đưa tới đây biết nó — trang đăng ký và
      // trang đăng nhập đều biết. Bắt gõ lại một thứ vừa gõ xong là thêm
      // một chỗ để gõ sai.
      email: this.$route.query.email || '',
      dangGui: false,
    };
  },
  created() {
    if (this.$route.query.token) this.xacMinh();
  },
  methods: {
    async xacMinh() {
      try {
        const { data } = await api.verifyEmail({ token: this.$route.query.token });
        // Máy chủ trả token mới vì vai trò trong token cũ đã lạc hậu — xác
        // minh xong có thể vừa được cấp quyền quản trị. Không nhận token mới
        // thì người dùng phải tự đăng xuất rồi đăng nhập lại mới thấy.
        if (data && data.token) auth.login(data.token, data.user);
        this.trangThai = 'xong';
      } catch (err) {
        const message = err.response && err.response.data && err.response.data.message;
        this.loi = message || '';
        this.trangThai = 'hong';
      }
    },
    async guiLai() {
      if (this.dangGui) return;
      this.dangGui = true;
      try {
        const { data } = await api.resendVerification({ email: this.email });
        this.$toast(data.message);
      } catch (err) {
        const status = err.response && err.response.status;
        this.$toast(status === 429 ? this.$t('auth.tooMany') : this.$t('auth.failed'));
      } finally {
        this.dangGui = false;
      }
    },
  },
};
</script>
