<template>
  <img v-if="src && !failed" :src="shown" :alt="alt" :class="imgClass" @error="failed = true"/>
  <NoPhoto v-else :type="type" :resolved="resolved" :label="label"/>
</template>

<script>
import NoPhoto from './NoPhoto.vue';
import { sized } from '../images';

// Ảnh của tin, kèm đường lui khi tải hỏng.
//
// Có URL không có nghĩa là có ảnh. Ảnh nằm ở máy chủ của người khác, mà máy
// chủ thì sập, đổi đường dẫn, hoặc chặn gọi từ web khác. Lúc đó thẻ <img>
// không vẽ được gì và để lại một ô trống trơn — người xem tưởng web hỏng.
//
// Trường hợp này KHÁC với tin không có ảnh, nhưng người xem thì không phân
// biệt được, nên cả hai cùng rơi về một chỗ hiển thị.
export default {
  name: 'PetPhoto',
  components: { NoPhoto },
  props: {
    src: { type: String, default: '' },
    alt: { type: String, default: '' },
    imgClass: { type: String, default: 'w-full h-full object-cover' },
    type: { type: String, default: 'lost' },
    resolved: { type: Boolean, default: false },
    label: { type: Boolean, default: true },
    // Chiều rộng ảnh cần tải về, tính bằng pixel thật của màn hình — tức gấp
    // đôi kích thước CSS nếu muốn nét trên màn hình Retina. Mỗi chỗ gọi tự
    // khai theo khung của mình: thẻ 96px và ảnh lớn trang chi tiết mà dùng
    // chung một con số thì hoặc là mờ, hoặc là tải thừa.
    width: { type: Number, default: 800 },
  },
  data() {
    return { failed: false };
  },
  computed: {
    // Chỉ dùng để hiển thị. Giá trị này không bao giờ được gửi ngược lên
    // server — xem chú thích trong src/images.js.
    shown() {
      return sized(this.src, this.width);
    },
  },
  watch: {
    // Danh sách dùng lại component khi cuộn trang hoặc đổi bộ lọc. Không xoá
    // cờ này thì một ảnh hỏng làm mọi tin sau đó cũng mất ảnh theo.
    src() { this.failed = false; },
  },
};
</script>
