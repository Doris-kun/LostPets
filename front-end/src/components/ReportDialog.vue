<template>
  <div class="fixed inset-0 z-[1100] flex items-end sm:items-center justify-center">
    <div class="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" @click="close"></div>

    <div class="relative bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-xl p-6 max-h-[90vh] overflow-y-auto">
      <div v-if="sent" class="text-center py-4">
        <div class="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-3">
          <svg class="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
          </svg>
        </div>
        <p class="font-bold text-gray-900">{{ $t('report.thanks') }}</p>
        <p class="text-sm text-gray-400 mt-1.5 leading-relaxed">{{ $t('report.thanksSub') }}</p>
        <button @click="close"
          class="mt-5 w-full bg-gray-900 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-gray-800 transition-colors">
          {{ $t('report.done') }}
        </button>
      </div>

      <template v-else>
        <h3 class="font-bold text-lg text-gray-900">{{ $t('report.title') }}</h3>
        <p class="text-sm text-gray-400 mt-1 mb-4 leading-relaxed">{{ $t('report.subtitle') }}</p>

        <label v-for="r in reasons" :key="r"
          class="flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all mb-1.5"
          :class="reason === r ? 'border-orange-300 bg-orange-50/50' : 'border-gray-100 hover:border-gray-200'">
          <input type="radio" :value="r" v-model="reason" class="mt-0.5 accent-orange-500">
          <span class="text-sm text-gray-700 leading-snug">{{ $t('report.reason.' + r) }}</span>
        </label>

        <textarea v-model="note" :maxlength="maxNote" rows="3" :placeholder="$t('report.notePlaceholder')"
          class="w-full mt-3 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-300 resize-none"></textarea>

        <p v-if="error" class="text-xs text-rose-500 mt-2">{{ error }}</p>

        <div class="flex gap-2 mt-4">
          <button @click="close" :disabled="sending"
            class="flex-1 border border-gray-200 text-gray-600 rounded-xl py-2.5 text-sm font-semibold hover:border-gray-300 disabled:opacity-50 transition-all">
            {{ $t('report.cancel') }}
          </button>
          <button @click="send" :disabled="!reason || sending"
            class="flex-1 bg-rose-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-rose-700 disabled:opacity-40 transition-colors">
            {{ sending ? $t('report.sending') : $t('report.send') }}
          </button>
        </div>
      </template>
    </div>
  </div>
</template>

<script>
import api from '../api';
import report from '../report';

// Phải trùng danh sách enum trong back-end/api/models/reportModel.js.
// Lưu mã chứ không lưu câu tiếng Việt, nên đổi câu chữ không đụng dữ liệu cũ.
const REASONS = ['scam', 'fake_image', 'wrong_contact', 'offensive', 'duplicate', 'other'];

export default {
  name: 'ReportDialog',
  props: {
    petId: { type: String, required: true },
  },
  data() {
    return { reasons: REASONS, reason: '', note: '', sending: false, sent: false, error: '', maxNote: 500 };
  },
  methods: {
    close() {
      if (this.sending) return;
      this.$emit('close', this.sent);
    },
    async send() {
      if (!this.reason || this.sending) return;
      this.sending = true;
      this.error = '';
      try {
        await api.reportPet(this.petId, { reason: this.reason, note: this.note.trim() });
        // Chỉ ghi nhớ khi server đã nhận thật. Ghi trước mà request hỏng thì
        // người ta mất luôn đường báo cáo vì nút đã chuyển sang "đã gửi".
        report.mark(this.petId);
        this.sent = true;
      } catch (err) {
        const status = err.response && err.response.status;
        this.error = status === 429
          ? this.$t('report.tooMany')
          : (err.response && err.response.data && err.response.data.message) || this.$t('report.failed');
      } finally {
        this.sending = false;
      }
    },
  },
};
</script>
