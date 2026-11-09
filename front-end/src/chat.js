import Vue from 'vue';

// Trạng thái mở/đóng của hộp trợ lý, để nơi khác cũng mở được nó.
//
// Trước đây trạng thái này nằm trong chính ChatWidget, nên không ai bên ngoài
// chạm tới được. Trang Liên hệ cần một nút "Hỏi trợ lý" mở hộp chat lên — mà
// hộp chat thì nằm ở App.vue, không phải con của trang đó, nên không truyền
// prop hay emit sự kiện xuống được.
//
// Cùng khuôn với toast.js: một đối tượng observable nhỏ, ai cần thì đọc ghi.
export const chatStore = Vue.observable({ open: false });

export function openChat() {
  chatStore.open = true;
}
