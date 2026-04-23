<template>
  <transition name="toast">
    <div
      v-if="store.show"
      class="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-5 py-3 rounded-2xl shadow-2xl text-sm font-semibold whitespace-nowrap"
      :class="store.type === 'success' ? 'bg-gray-900 text-white' : 'bg-rose-500 text-white'"
    >
      <!-- Icon -->
      <svg v-if="store.type === 'success'" class="w-4 h-4 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
      </svg>
      <svg v-else class="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
      </svg>
      {{ store.message }}
    </div>
  </transition>
</template>

<script>
import { toastStore } from '../toast';

export default {
  name: 'Toast',
  data() {
    return { store: toastStore };
  },
};
</script>

<style scoped>
.toast-enter-active, .toast-leave-active {
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.toast-enter, .toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(16px) scale(0.95);
}
</style>
