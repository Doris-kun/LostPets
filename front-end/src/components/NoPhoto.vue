<template>
  <div class="w-full h-full flex flex-col items-center justify-center gap-2" :class="tint.bg">
    <svg class="w-10 h-10" :class="tint.icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <ellipse cx="9.6" cy="6.2" rx="2.1" ry="2.7"/>
      <ellipse cx="14.4" cy="6.2" rx="2.1" ry="2.7"/>
      <ellipse cx="5.6" cy="10.6" rx="2" ry="2.6"/>
      <ellipse cx="18.4" cy="10.6" rx="2" ry="2.6"/>
      <path d="M12 12.8c-2.9 0-5.2 2.1-5.2 4.4 0 2.2 1.7 3.8 4.1 3.8h2.2c2.4 0 4.1-1.6 4.1-3.8 0-2.3-2.3-4.4-5.2-4.4z"/>
    </svg>
    <span v-if="label" class="text-xs font-medium" :class="tint.text">{{ $t('photo.none') }}</span>
  </div>
</template>

<script>
// Ô "chưa có ảnh" dùng chung cho mọi chỗ hiện tin.
//
// Trước đây mỗi chỗ tự vẽ một biểu tượng ảnh gãy trên nền xám. Vấn đề là biểu
// tượng đó mang nghĩa "ảnh tải lỗi" — người xem tưởng web hỏng, trong khi sự
// thật chỉ là người đăng không kèm ảnh. Mà đăng tin không ảnh là chuyện rất
// bình thường: người vừa mất chó thì đang vội, lục tìm ảnh cũ là việc sau.
//
// Nên đổi sang dấu chân thú trên nền pha màu theo loại tin: nhìn là biết cố ý,
// và vẫn đọc được ngay tin đó thuộc loại nào.
const TINTS = {
  lost:     { bg: 'bg-rose-50',    icon: 'text-rose-200',    text: 'text-rose-300' },
  found:    { bg: 'bg-emerald-50', icon: 'text-emerald-200', text: 'text-emerald-300' },
  resolved: { bg: 'bg-teal-50',    icon: 'text-teal-200',    text: 'text-teal-300' },
};

export default {
  name: 'NoPhoto',
  props: {
    type: { type: String, default: 'lost' },
    resolved: { type: Boolean, default: false },
    // Thẻ nhỏ trong lưới thì chữ chen chúc, chỉ để dấu chân là đủ.
    label: { type: Boolean, default: true },
  },
  computed: {
    tint() {
      if (this.resolved) return TINTS.resolved;
      return TINTS[this.type] || TINTS.lost;
    },
  },
};
</script>
