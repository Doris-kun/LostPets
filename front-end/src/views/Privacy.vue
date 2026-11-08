<template>
  <div class="max-w-3xl mx-auto px-4 py-10">
    <h1 class="text-3xl font-bold text-gray-900">{{ c.title }}</h1>
    <p class="text-sm text-gray-400 mt-2">{{ c.updated }}</p>
    <p class="text-gray-600 leading-relaxed mt-5">{{ c.intro }}</p>

    <!-- Tóm tắt nhanh. Gần như không ai đọc hết một trang chính sách; bốn điều
         quan trọng nhất phải nằm ngay chỗ mắt rơi xuống đầu tiên. -->
    <div class="mt-7 rounded-2xl border border-orange-100 bg-orange-50/50 p-5">
      <p class="text-sm font-bold text-gray-900">{{ c.summaryH }}</p>
      <ul class="mt-3 space-y-2.5">
        <li v-for="(t, i) in c.summary" :key="`s${i}`"
          class="text-sm text-gray-600 leading-relaxed flex gap-2.5">
          <span class="mt-1.5 w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0"></span>
          <span>{{ t }}</span>
        </li>
      </ul>
    </div>

    <!-- Mục lục. Trang dài mười mục, không có đường nhảy thì người muốn biết
         "giữ dữ liệu bao lâu" phải cuộn mò qua chín mục không liên quan. -->
    <nav class="mt-7 rounded-2xl border border-gray-100 p-5">
      <p class="text-sm font-bold text-gray-900">{{ c.tocH }}</p>
      <ol class="mt-3 grid sm:grid-cols-2 gap-x-6 gap-y-1.5">
        <li v-for="s in c.sections" :key="s.id">
          <a :href="`#${s.id}`" class="text-sm text-gray-500 hover:text-orange-600 transition-colors">
            <span class="text-gray-300 tabular-nums">{{ s.n }}.</span> {{ s.h }}
          </a>
        </li>
      </ol>
    </nav>

    <section v-for="s in c.sections" :key="s.id" :id="s.id" class="mt-10 scroll-mt-24">
      <h2 class="flex items-baseline gap-2.5 text-lg font-bold text-gray-900">
        <span class="text-sm font-semibold text-orange-500 tabular-nums">{{ s.n }}</span>
        {{ s.h }}
      </h2>
      <p v-for="(t, j) in (s.p || [])" :key="`p${j}`"
        class="text-gray-600 leading-relaxed mt-3">{{ t }}</p>
      <ul v-if="s.ul" class="mt-3 space-y-2">
        <li v-for="(t, k) in s.ul" :key="`l${k}`"
          class="text-gray-600 leading-relaxed flex gap-2.5">
          <span class="mt-2 w-1 h-1 rounded-full bg-gray-300 shrink-0"></span>
          <span>{{ t }}</span>
        </li>
      </ul>
    </section>

    <section v-if="contactEmail" class="mt-12 rounded-2xl border border-gray-100 bg-gray-50/70 p-6 text-center">
      <h2 class="text-lg font-bold text-gray-900">{{ c.contactH }}</h2>
      <p class="text-gray-600 leading-relaxed mt-2 max-w-md mx-auto">{{ c.contactP }}</p>
      <div class="mt-4 flex flex-wrap items-center justify-center gap-2.5">
        <a :href="mailtoLink"
          class="bg-gray-900 text-white rounded-xl px-5 py-2.5 text-sm font-semibold hover:bg-gray-800 transition-colors">
          {{ c.sendEmail }}
        </a>
        <!-- Nút chép địa chỉ cho người dùng webmail. Máy chưa đặt trình gửi
             thư mặc định thì bấm mailto chỉ nhận một hộp thoại chọn ứng dụng
             khó hiểu, chứ không soạn được thư. -->
        <button type="button" @click="copyEmail"
          class="border border-gray-200 text-gray-600 rounded-xl px-5 py-2.5 text-sm font-semibold hover:border-gray-300 hover:text-gray-900 transition-all">
          {{ c.copyEmail }}
        </button>
      </div>
    </section>
  </div>
</template>

<script>
// Trang chính sách bảo mật.
//
// Viết từ việc ĐỌC CODE chứ không chép mẫu trên mạng: mỗi câu dưới đây đối
// chiếu được với một dòng trong back-end. Một chính sách mô tả sai việc mình
// làm còn tệ hơn không có, vì nó là cam kết công khai.
//
// Trang này cũng là điều kiện để chuyển ứng dụng Facebook sang chế độ Live —
// Meta bắt buộc có đường dẫn chính sách bảo mật công khai.
//
// Để văn bản ngay trong file thay vì nhét từng đoạn vào i18n.js: đây là văn
// xuôi dài, tách thành bốn chục khoá rời rạc thì không ai đọc lại nổi để
// kiểm xem bản tiếng Việt và tiếng Anh còn khớp nhau không.

// Email công khai để người dùng liên hệ về dữ liệu của họ. Bỏ trống thì mục
// Liên hệ không hiện.
const CONTACT_EMAIL = 'nampham2212004@gmail.com';

const CONTENT = {
  vi: {
    title: 'Chính sách bảo mật',
    updated: 'Cập nhật lần cuối: 4 tháng 11, 2026',
    intro:
      'LostPets là website giúp người mất thú cưng và người nhặt được thú cưng tìm thấy nhau. '
      + 'Đây là đồ án tốt nghiệp của sinh viên, không phải dịch vụ thương mại. Trang này nói rõ '
      + 'website thu những gì, vì sao, và bạn kiểm soát được điều gì.',
    summaryH: 'Bốn điều đáng biết nhất',
    summary: [
      'Cách liên hệ bạn điền trong tin đăng sẽ hiện công khai. Đó là mục đích của tin, không phải sơ suất.',
      'Vị trí bạn ghim được làm nhiễu khoảng 500 mét trước khi lưu. Toạ độ chính xác không bao giờ tồn tại trong hệ thống.',
      'Không quảng cáo, không bán dữ liệu, không mã theo dõi của bên thứ ba.',
      'Bạn xoá tin là xoá thật: bản ghi, ảnh và cả vector dùng cho tìm kiếm đều biến mất cùng lúc.',
    ],
    tocH: 'Nội dung',
    sections: [
      {
        id: 'thong-tin-ban-cung-cap',
        n: 1,
        h: 'Thông tin bạn tự cung cấp',
        p: ['Khi đăng tin — không cần tài khoản:'],
        ul: [
          'Loài, giống, màu lông, khu vực và mô tả con vật.',
          'Cách liên hệ, thường là số điện thoại. Thông tin này HIỆN CÔNG KHAI cho mọi người xem, vì đó chính là mục đích của tin đăng — không có nó thì người nhặt được không báo cho bạn được.',
          'Ảnh con vật, nếu bạn tải lên.',
          'Vị trí trên bản đồ, nếu bạn tự ghim.',
          'Đặc điểm nhận dạng giữ kín, nếu bạn điền. Mục này KHÔNG hiện công khai, chỉ dùng để đối chiếu khi có người nhận là chủ.',
        ],
      },
      {
        id: 'tai-khoan',
        n: 2,
        h: 'Nếu bạn tạo tài khoản',
        ul: [
          'Tên và địa chỉ email.',
          'Mật khẩu được lưu dưới dạng băm bcrypt. Website không giữ mật khẩu gốc và không khôi phục lại được, kể cả quản trị viên.',
          'Nếu bạn đăng nhập bằng Google hoặc Facebook: website nhận mã định danh của bạn ở nhà cung cấp đó, kèm tên và email họ gửi sang. Website KHÔNG nhận mật khẩu Google hay Facebook của bạn.',
        ],
      },
      {
        id: 'thu-tu-dong',
        n: 3,
        h: 'Thông tin thu tự động',
        ul: [
          'Địa chỉ IP, chỉ giữ TRONG BỘ NHỚ máy chủ để đếm số lượt gọi và chặn gửi hàng loạt. Không ghi vào cơ sở dữ liệu, tự xoá sau vài phút.',
          'Một vài thiết lập lưu ngay trên máy bạn: ngôn ngữ đang chọn, vị trí bản đồ gần nhất, danh sách tin bạn đã báo cáo. Những thứ này không gửi về máy chủ.',
        ],
      },
      {
        id: 'vi-tri',
        n: 4,
        h: 'Vị trí được làm nhiễu có chủ ý',
        p: [
          'Nếu bạn ghim vị trí lên bản đồ, toạ độ được làm tròn về lưới khoảng 500 mét ngay trước khi lưu. Toạ độ chính xác không bao giờ tồn tại trong cơ sở dữ liệu.',
          'Lý do: thú cưng thường mất gần nhà. Một điểm ghim chính xác đặt ngay cạnh số điện thoại công khai là đủ để người lạ tìm ra nơi bạn ở.',
        ],
      },
      {
        id: 'khong-lam',
        n: 5,
        h: 'Những gì website không làm',
        ul: [
          'Không bán, không cho thuê, không trao đổi dữ liệu của bạn với bất kỳ ai.',
          'Không có quảng cáo và không nhúng mã theo dõi của mạng quảng cáo.',
          'Không theo dõi vị trí chạy nền. Website chỉ hỏi vị trí khi bạn tự bấm nút, và chỉ dùng ngay lúc đó.',
        ],
      },
      {
        id: 'ben-thu-ba',
        n: 6,
        h: 'Dịch vụ bên thứ ba',
        p: ['Để hoạt động, website gửi một phần dữ liệu tới các dịch vụ sau:'],
        ul: [
          'Cloudinary — lưu ảnh bạn tải lên.',
          'MongoDB Atlas — lưu tin đăng và tài khoản.',
          'Render — máy chủ chạy website.',
          'Google Gemini — phân tích ảnh, hiểu nghĩa câu tìm kiếm, đối chiếu các tin với nhau, và trả lời trong phần trợ lý. Nội dung tin đăng cùng câu bạn gõ được gửi tới dịch vụ này.',
          'Google và Meta — chỉ khi bạn tự bấm nút đăng nhập tương ứng.',
          'OpenStreetMap — ảnh nền bản đồ. Khi bản đồ hiện ra, trình duyệt của bạn gọi thẳng tới máy chủ của họ, nên họ thấy địa chỉ IP của bạn.',
        ],
      },
      {
        id: 'giu-bao-lau',
        n: 7,
        h: 'Giữ trong bao lâu',
        ul: [
          'Tin đã đánh dấu là đã đoàn tụ: tự động xoá sau 30 ngày, xoá cả ảnh đã tải lên.',
          'Tin chưa đoàn tụ: giữ cho tới khi bạn xoá.',
          'Tài khoản: giữ cho tới khi bạn yêu cầu xoá.',
          'Báo cáo tin xấu: xoá cùng lúc với tin bị báo cáo.',
        ],
      },
      {
        id: 'quyen-cua-ban',
        n: 8,
        h: 'Quyền của bạn',
        ul: [
          'Sửa hoặc xoá tin của mình, bằng tài khoản đã dùng để đăng, hoặc bằng mã xác nhận hiện ra một lần lúc đăng tin.',
          'Xoá tin là xoá thật: bản ghi, ảnh trên Cloudinary và vector dùng cho tìm kiếm theo nghĩa đều bị xoá cùng lúc.',
          'Mã xác nhận được lưu dưới dạng băm SHA-256. Nếu bạn mất mã và không có tài khoản, website không tra lại được — hãy liên hệ.',
          'Yêu cầu xoá tài khoản bằng cách liên hệ theo địa chỉ ở cuối trang.',
        ],
      },
      {
        id: 'tre-em',
        n: 9,
        h: 'Trẻ em',
        p: ['Website không hướng tới người dưới 13 tuổi và không cố ý thu thập dữ liệu của họ.'],
      },
      {
        id: 'thay-doi',
        n: 10,
        h: 'Khi chính sách thay đổi',
        p: [
          'Chính sách này có thể được sửa khi website thêm tính năng mới hoặc đổi cách xử lý dữ liệu. '
          + 'Ngày ghi ở đầu trang luôn là lần sửa gần nhất, nên bạn đối chiếu ngày đó là biết mình đang đọc bản nào.',
        ],
      },
    ],
    contactH: 'Còn câu hỏi nào khác?',
    contactP:
      'Nếu bạn muốn hỏi về dữ liệu của mình, hoặc muốn xoá tài khoản, hãy gửi email. '
      + 'Nhớ nói rõ email hoặc mã tin liên quan để tra cho nhanh.',
    sendEmail: 'Gửi email',
    copyEmail: 'Sao chép địa chỉ',
    copied: 'Đã sao chép địa chỉ email.',
    mailSubject: 'LostPets — yêu cầu về dữ liệu',
  },

  en: {
    title: 'Privacy Policy',
    updated: 'Last updated: 4 November 2026',
    intro:
      'LostPets helps people who have lost a pet and people who have found one find each other. '
      + 'It is a student final-year project, not a commercial service. This page explains what the '
      + 'site collects, why, and what you control.',
    summaryH: 'The four things worth knowing',
    summary: [
      'The contact details you put in a listing are shown publicly. That is the point of a listing, not an oversight.',
      'A location pin is blurred to roughly 500 metres before it is saved. Exact coordinates never exist in the system.',
      'No advertising, no selling of data, no third-party trackers.',
      'Deleting a listing deletes it for real: the record, the photo and the search vector all go at once.',
    ],
    tocH: 'Contents',
    sections: [
      {
        id: 'thong-tin-ban-cung-cap',
        n: 1,
        h: 'Information you provide',
        p: ['When you post a listing — no account required:'],
        ul: [
          'Species, breed, colour, area and a description of the animal.',
          'Contact details, usually a phone number. This is PUBLICLY VISIBLE, because that is the point of a listing — without it, whoever finds your pet cannot reach you.',
          'A photo of the animal, if you upload one.',
          'A location pin, if you place one.',
          'A private identifying detail, if you add one. This is NOT shown publicly; it is used only to check someone claiming to be the owner.',
        ],
      },
      {
        id: 'tai-khoan',
        n: 2,
        h: 'If you create an account',
        ul: [
          'Your name and email address.',
          'Your password is stored as a bcrypt hash. The site never keeps the original and cannot recover it, not even an administrator.',
          'If you sign in with Google or Facebook, the site receives your identifier at that provider plus the name and email they send. The site never receives your Google or Facebook password.',
        ],
      },
      {
        id: 'thu-tu-dong',
        n: 3,
        h: 'Information collected automatically',
        ul: [
          'Your IP address, held IN MEMORY only, to count requests and block bulk submissions. It is never written to the database and is discarded within minutes.',
          'A few settings stored on your own device: chosen language, last map position, and which listings you have reported. These are never sent to the server.',
        ],
      },
      {
        id: 'vi-tri',
        n: 4,
        h: 'Location is deliberately blurred',
        p: [
          'If you place a location pin, the coordinates are rounded to a grid of roughly 500 metres before being saved. The exact coordinates never exist in the database.',
          'Why: pets are usually lost close to home. An exact pin next to a publicly visible phone number is enough for a stranger to find where you live.',
        ],
      },
      {
        id: 'khong-lam',
        n: 5,
        h: 'What the site does not do',
        ul: [
          'It does not sell, rent or trade your data with anyone.',
          'It carries no advertising and embeds no advertising trackers.',
          'It does not track location in the background. It asks for your location only when you press the button, and uses it only at that moment.',
        ],
      },
      {
        id: 'ben-thu-ba',
        n: 6,
        h: 'Third-party services',
        p: ['To function, the site sends some data to:'],
        ul: [
          'Cloudinary — stores the photos you upload.',
          'MongoDB Atlas — stores listings and accounts.',
          'Render — hosts the site.',
          'Google Gemini — analyses photos, interprets search phrases, compares listings, and answers in the help assistant. Listing content and what you type are sent to this service.',
          'Google and Meta — only when you press the matching sign-in button.',
          'OpenStreetMap — map imagery. When a map loads, your browser contacts their servers directly, so they see your IP address.',
        ],
      },
      {
        id: 'giu-bao-lau',
        n: 7,
        h: 'How long data is kept',
        ul: [
          'Listings marked as reunited: deleted automatically after 30 days, including the uploaded photo.',
          'Listings not yet reunited: kept until you delete them.',
          'Accounts: kept until you ask for deletion.',
          'Reports about a listing: deleted together with the listing they concern.',
        ],
      },
      {
        id: 'quyen-cua-ban',
        n: 8,
        h: 'Your rights',
        ul: [
          'Edit or delete your own listing, using the account you posted with or the claim code shown once when you posted.',
          'Deletion is real: the record, the photo on Cloudinary and the vector used for semantic search are all removed together.',
          'The claim code is stored as a SHA-256 hash. If you lose it and have no account, the site cannot look it up — please get in touch.',
          'Request account deletion by contacting the address at the bottom of this page.',
        ],
      },
      {
        id: 'tre-em',
        n: 9,
        h: 'Children',
        p: ['The site is not aimed at people under 13 and does not knowingly collect their data.'],
      },
      {
        id: 'thay-doi',
        n: 10,
        h: 'When this policy changes',
        p: [
          'This policy may be revised when the site gains new features or changes how it handles data. '
          + 'The date at the top is always the most recent revision, so you can tell which version you are reading.',
        ],
      },
    ],
    contactH: 'Any other questions?',
    contactP:
      'If you want to ask about your data, or have your account deleted, send an email. '
      + 'Mention the email address or listing code involved so it can be found quickly.',
    sendEmail: 'Send an email',
    copyEmail: 'Copy address',
    copied: 'Email address copied.',
    mailSubject: 'LostPets — data request',
  },
};

export default {
  name: 'Privacy',
  data() {
    return { contactEmail: CONTACT_EMAIL };
  },
  computed: {
    c() {
      return CONTENT[this.$lang] || CONTENT.vi;
    },
    // Điền sẵn tiêu đề thư. Người gửi đỡ phải nghĩ, mà người nhận lọc hộp
    // thư cũng dễ — yêu cầu về dữ liệu không lẫn vào thư rác.
    mailtoLink() {
      return `mailto:${this.contactEmail}?subject=${encodeURIComponent(this.c.mailSubject)}`;
    },
  },
  methods: {
    async copyEmail() {
      try {
        await navigator.clipboard.writeText(this.contactEmail);
        this.$toast(this.c.copied);
      } catch {
        // Trình duyệt cũ hoặc trang không chạy trên HTTPS thì không có
        // clipboard. Hiện thẳng địa chỉ ra để người ta tự bôi đen mà chép,
        // còn hơn bấm xong không thấy gì xảy ra.
        this.$toast(this.contactEmail);
      }
    },
  },
};
</script>
