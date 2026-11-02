<template>
  <img v-if="src && !failed" :src="src" :alt="alt" :class="imgClass" @error="failed = true"/>
  <NoPhoto v-else :type="type" :resolved="resolved" :label="label"/>
</template>

<script>
import NoPhoto from './NoPhoto.vue';

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
  },
  data() {
    return { failed: false };
  },
  watch: {
    // Danh sách dùng lại component khi cuộn trang hoặc đổi bộ lọc. Không xoá
    // cờ này thì một ảnh hỏng làm mọi tin sau đó cũng mất ảnh theo.
    src() { this.failed = false; },
  },
};
</script>
