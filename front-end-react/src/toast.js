// Hàng đợi thông báo ngắn hiện ở góc màn hình.
//
// Bản Vue dùng Vue.observable. Ở đây tự giữ store nhỏ, cùng khuôn với auth.js
// — xem ghi chú đầu file đó về việc vì sao ảnh chụp là một con số.
import { useSyncExternalStore } from 'react';

export const toastStore = {
  show: false,
  message: '',
  type: 'success',
};

let phienBan = 0;
const nguoiNghe = new Set();

const bao = () => {
  phienBan += 1;
  nguoiNghe.forEach((goi) => goi());
};

const theoDoi = (goi) => {
  nguoiNghe.add(goi);
  return () => nguoiNghe.delete(goi);
};

let timer = null;

export function showToast(message, type = 'success', duration = 3000) {
  if (timer) clearTimeout(timer);
  toastStore.message = message;
  toastStore.type = type;
  toastStore.show = true;
  bao();
  timer = setTimeout(() => {
    toastStore.show = false;
    bao();
  }, duration);
}

/** Đọc thông báo đang hiện trong một component, vẽ lại khi nó đổi. */
export function useToast() {
  useSyncExternalStore(theoDoi, () => phienBan, () => phienBan);

  return { show: toastStore.show, message: toastStore.message, type: toastStore.type };
}
