// Trạng thái mở/đóng của hộp trợ lý, để nơi khác cũng mở được nó.
//
// Trước đây trạng thái này nằm trong chính ChatWidget, nên không ai bên ngoài
// chạm tới được. Trang Liên hệ cần một nút "Hỏi trợ lý" mở hộp chat lên — mà
// hộp chat thì nằm ở App, không phải con của trang đó, nên không truyền prop
// hay emit sự kiện xuống được.
//
// Cùng khuôn với toast.js và auth.js: một store nhỏ ngay trong file, ai cần
// thì đọc ghi.
import { useSyncExternalStore } from 'react';

export const chatStore = { open: false };

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

/*
 * Bản Vue để ChatWidget gán thẳng `chatStore.open = value` qua một computed
 * có setter. Ở React gán thẳng thì không ai được báo, nên phần gán đó thành
 * hàm này — cùng một việc, chỉ khác là có gọi bao().
 */
export function setChatOpen(value) {
  chatStore.open = Boolean(value);
  bao();
}

/** Mở hộp chat từ nơi khác, ví dụ nút "Hỏi trợ lý" ở trang Liên hệ. */
export function openChat() {
  setChatOpen(true);
}

/** Đọc trạng thái hộp chat trong một component, vẽ lại khi nó đổi. */
export function useChat() {
  useSyncExternalStore(theoDoi, () => phienBan, () => phienBan);

  return { open: chatStore.open };
}
