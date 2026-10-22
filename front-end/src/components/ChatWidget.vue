<template>
  <div class="fixed bottom-5 right-5 z-50 flex flex-col items-end">

    <!-- Khung hội thoại -->
    <div v-if="open"
      class="mb-3 w-[21rem] max-w-[calc(100vw-2.5rem)] bg-white rounded-2xl border border-gray-200 shadow-xl flex flex-col overflow-hidden">

      <div class="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-orange-500 to-rose-500 text-white">
        <div>
          <p class="text-sm font-bold">{{ $t('chat.title') }}</p>
          <p class="text-[11px] opacity-90">{{ $t('chat.subtitle') }}</p>
        </div>
        <button @click="open = false" class="p-1 rounded-lg hover:bg-white/20 transition-colors" :aria-label="$t('chat.close')">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <div ref="scroll" class="flex-1 overflow-y-auto px-3 py-3 space-y-2.5 h-80 bg-gray-50">
        <div v-for="(m, i) in messages" :key="i"
          :class="m.role === 'user' ? 'justify-end' : 'justify-start'" class="flex">
          <div
            :class="m.role === 'user'
              ? 'bg-orange-500 text-white rounded-br-sm'
              : 'bg-white text-gray-700 border border-gray-100 rounded-bl-sm'"
            class="max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed whitespace-pre-line shadow-sm">
            {{ m.content }}
          </div>
        </div>

        <div v-if="loading" class="flex justify-start">
          <div class="bg-white border border-gray-100 rounded-2xl rounded-bl-sm px-3.5 py-2.5 shadow-sm">
            <div class="flex gap-1">
              <span class="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" style="animation-delay:0ms"></span>
              <span class="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" style="animation-delay:150ms"></span>
              <span class="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" style="animation-delay:300ms"></span>
            </div>
          </div>
        </div>

        <p v-if="error" class="text-xs text-rose-500 text-center px-2">{{ error }}</p>
      </div>

      <!-- Gợi ý sẵn, chỉ hiện khi chưa hỏi gì -->
      <div v-if="messages.length <= 1 && !loading" class="px-3 pb-2 flex flex-wrap gap-1.5 bg-gray-50">
        <button v-for="key in suggestionKeys" :key="key" @click="send($t(key))"
          class="text-[11px] border border-gray-200 bg-white text-gray-600 rounded-full px-2.5 py-1 hover:border-orange-300 hover:text-orange-600 transition-colors">
          {{ $t(key) }}
        </button>
      </div>

      <form @submit.prevent="send()" class="flex items-end gap-2 p-2.5 border-t border-gray-100 bg-white">
        <textarea v-model="draft" rows="1" :placeholder="$t('chat.placeholder')" :maxlength="maxChars"
          @keydown.enter.exact.prevent="send()"
          class="flex-1 resize-none border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent transition"></textarea>
        <button type="submit" :disabled="loading || !draft.trim()"
          class="bg-orange-500 text-white p-2.5 rounded-xl hover:bg-orange-600 disabled:opacity-40 transition-all shrink-0"
          :aria-label="$t('chat.send')">
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M3.4 2.6a1 1 0 0 0-1.3 1.2l1.7 5.2H11a1 1 0 1 1 0 2H3.8l-1.7 5.2a1 1 0 0 0 1.3 1.2l14-7a1 1 0 0 0 0-1.8l-14-7z"/>
          </svg>
        </button>
      </form>
    </div>

    <!-- Nút tròn mở/đóng -->
    <button @click="toggle"
      class="w-14 h-14 rounded-full bg-gradient-to-br from-orange-500 to-rose-500 text-white shadow-lg hover:shadow-xl flex items-center justify-center transition-all"
      :aria-label="$t('chat.title')">
      <svg v-if="!open" class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M8 10h.01M12 10h.01M16 10h.01M21 12a8 8 0 0 1-11.6 7.1L3 21l1.9-6.4A8 8 0 1 1 21 12z"/>
      </svg>
      <svg v-else class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
      </svg>
    </button>
  </div>
</template>

<script>
import api from '../api';

const MAX_CHARS = 1000;
// Server chỉ nhận 20 lượt. Cắt bớt phần cũ nhất nhưng luôn giữ lời chào mở đầu.
const MAX_SENT_TURNS = 18;

export default {
  name: 'ChatWidget',
  data() {
    return {
      open: false,
      draft: '',
      loading: false,
      error: '',
      messages: [],
      maxChars: MAX_CHARS,
      suggestionKeys: ['chat.s1', 'chat.s2', 'chat.s3'],
    };
  },
  methods: {
    toggle() {
      this.open = !this.open;
      if (this.open && this.messages.length === 0) {
        this.messages.push({ role: 'assistant', content: this.$t('chat.greeting') });
      }
      if (this.open) this.scrollDown();
    },
    scrollDown() {
      this.$nextTick(() => {
        const el = this.$refs.scroll;
        if (el) el.scrollTop = el.scrollHeight;
      });
    },
    async send(preset) {
      const text = (preset || this.draft).trim();
      if (!text || this.loading) return;

      this.messages.push({ role: 'user', content: text.slice(0, MAX_CHARS) });
      this.draft = '';
      this.error = '';
      this.loading = true;
      this.scrollDown();

      try {
        const history = this.messages.slice(-MAX_SENT_TURNS);
        const { data } = await api.chat(history);
        this.messages.push({ role: 'assistant', content: data.reply });
      } catch (err) {
        const status = err.response && err.response.status;
        if (status === 504 || status === 429) this.error = this.$t('chat.busy');
        else if (status === 503) this.error = this.$t('chat.off');
        else this.error = this.$t('chat.error');
      } finally {
        this.loading = false;
        this.scrollDown();
      }
    },
  },
};
</script>
