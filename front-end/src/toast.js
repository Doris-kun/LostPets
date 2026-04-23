import Vue from 'vue';

export const toastStore = Vue.observable({
  show: false,
  message: '',
  type: 'success',
});

let timer = null;

export function showToast(message, type = 'success', duration = 3000) {
  if (timer) clearTimeout(timer);
  toastStore.message = message;
  toastStore.type = type;
  toastStore.show = true;
  timer = setTimeout(() => { toastStore.show = false; }, duration);
}
