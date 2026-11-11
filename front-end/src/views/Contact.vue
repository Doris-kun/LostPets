<template>
  <div class="max-w-3xl mx-auto px-4 py-10">
    <h1 class="text-3xl font-bold text-gray-900">{{ c.title }}</h1>
    <p class="text-gray-600 leading-relaxed mt-3">{{ c.intro }}</p>

    <div class="mt-8 grid sm:grid-cols-2 gap-4">
      <!-- Trợ lý. Nói thẳng đây là máy trả lời, không phải người — hứa có
           người trực rồi để người ta chờ mới là thứ làm mất lòng tin. -->
      <div class="rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col">
        <div class="w-11 h-11 rounded-xl bg-orange-50 flex items-center justify-center">
          <svg class="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.9 9.9 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
          </svg>
        </div>
        <h2 class="font-bold text-gray-900 mt-4">{{ c.chatH }}</h2>
        <p class="text-sm text-gray-500 leading-relaxed mt-2 flex-1">{{ c.chatP }}</p>
        <button type="button" @click="openChat"
          class="mt-5 w-full bg-gray-900 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-gray-800 transition-colors">
          {{ c.chatBtn }}
        </button>
      </div>

      <div v-if="contactEmail" class="rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col">
        <div class="w-11 h-11 rounded-xl bg-orange-50 flex items-center justify-center">
          <svg class="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
          </svg>
        </div>
        <h2 class="font-bold text-gray-900 mt-4">{{ c.mailH }}</h2>
        <p class="text-sm text-gray-500 leading-relaxed mt-2 flex-1">{{ c.mailP }}</p>
        <!-- Bấm vừa mở trình gửi thư vừa chép địa chỉ. Máy chưa cấu hình trình
             gửi thư thì mailto im lặng không làm gì — đã gặp thật khi thử — nên
             phải có toast báo đã chép, để người dùng không đứng nhìn màn hình
             tự hỏi mình vừa bấm hụt chỗ nào. -->
        <a :href="mailtoLink" @click="copyEmail"
          class="mt-5 w-full border border-gray-200 text-gray-700 rounded-xl py-2.5 text-sm font-semibold text-center hover:border-gray-300 hover:text-gray-900 transition-all break-all">
          {{ contactEmail }}
        </a>
      </div>
    </div>

    <p class="text-sm text-gray-500 leading-relaxed mt-8 text-center">{{ c.note }}</p>
  </div>
</template>

<script>
import { openChat } from '../chat';
import { CONTACT_EMAIL } from '../contact';

// Trang Liên hệ.
//
// Chỉ có hai kênh nên không dựng thành danh mục dài: trợ lý trả lời ngay cho
// câu hỏi về cách dùng, email cho việc cần người thật xem — xoá tài khoản,
// hỏi về dữ liệu, báo lỗi.
//
// Cố ý KHÔNG có số tổng đài. Website là đồ án của sinh viên, không có người
// trực điện thoại; in một số ra rồi không ai nghe máy thì tệ hơn là không in.

const CONTENT = {
  vi: {
    title: 'Liên hệ',
    intro: 'Có hai cách. Trợ lý trả lời ngay, email thì chậm hơn nhưng xử lý được việc cần người xem.',
    chatH: 'Hỏi trợ lý',
    chatP: 'Trả lời ngay, bất kể giờ nào. Trợ lý biết về cách dùng website — đăng tin, tìm kiếm, mã xác nhận, bản đồ. Đây là máy trả lời tự động, không phải người thật.',
    chatBtn: 'Mở trợ lý',
    mailH: 'Gửi email',
    mailP: 'Dành cho việc cần người xem: yêu cầu xoá tài khoản, hỏi về dữ liệu của bạn, hoặc báo lỗi. Nhớ nói rõ email hoặc mã tin liên quan để tra cho nhanh.',
    note: 'Website là đồ án của sinh viên, không có tổng đài. Email thường được trả lời trong vài ngày.',
    copied: 'Đã sao chép địa chỉ email.',
    mailSubject: 'LostPets — liên hệ',
  },
  en: {
    title: 'Contact',
    intro: 'Two ways. The assistant answers immediately; email is slower but reaches a person.',
    chatH: 'Ask the assistant',
    chatP: 'Answers straight away, any time of day. It knows how the site works — posting, searching, claim codes, the map. It is an automated assistant, not a person.',
    chatBtn: 'Open the assistant',
    mailH: 'Send an email',
    mailP: 'For anything that needs a person: deleting your account, questions about your data, or reporting a bug. Mention the email address or listing code involved so it can be found quickly.',
    note: 'This site is a student project and has no phone support. Email is usually answered within a few days.',
    copied: 'Email address copied.',
    mailSubject: 'LostPets — contact',
  },
};

export default {
  name: 'Contact',
  data() {
    return { contactEmail: CONTACT_EMAIL };
  },
  computed: {
    c() {
      return CONTENT[this.$lang] || CONTENT.vi;
    },
    mailtoLink() {
      return `mailto:${this.contactEmail}?subject=${encodeURIComponent(this.c.mailSubject)}`;
    },
  },
  methods: {
    openChat,
    async copyEmail() {
      // Không chặn thẻ a: vẫn để mailto chạy cho ai có trình gửi thư.
      try {
        await navigator.clipboard.writeText(this.contactEmail);
        this.$toast(this.c.copied);
      } catch {
        /* chế độ ẩn danh hoặc trình duyệt cũ: bỏ qua, địa chỉ vẫn hiện trên nút */
      }
    },
  },
};
</script>
