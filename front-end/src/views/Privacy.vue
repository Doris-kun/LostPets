<template>
  <div class="max-w-3xl mx-auto px-4 py-10">
    <h1 class="text-3xl font-bold text-gray-900">{{ c.title }}</h1>
    <p class="text-sm text-gray-400 mt-2">{{ c.updated }}</p>
    <p class="text-gray-600 leading-relaxed mt-6">{{ c.intro }}</p>

    <section v-for="(s, i) in c.sections" :key="i" class="mt-9">
      <h2 class="text-lg font-bold text-gray-900">{{ s.h }}</h2>
      <p v-for="(t, j) in (s.p || [])" :key="`p${j}`"
        class="text-gray-600 leading-relaxed mt-3">{{ t }}</p>
      <ul v-if="s.ul" class="mt-3 space-y-2">
        <li v-for="(t, k) in s.ul" :key="`l${k}`"
          class="text-gray-600 leading-relaxed flex gap-2.5">
          <span class="text-orange-400 mt-2 w-1 h-1 rounded-full bg-orange-400 shrink-0"></span>
          <span>{{ t }}</span>
        </li>
      </ul>
    </section>

    <section v-if="contactEmail" class="mt-9 pt-6 border-t border-gray-100">
      <h2 class="text-lg font-bold text-gray-900">{{ c.contactH }}</h2>
      <p class="text-gray-600 leading-relaxed mt-3">
        {{ c.contactP }}
        <a :href="`mailto:${contactEmail}`" class="text-orange-600 font-semibold hover:underline">{{ contactEmail }}</a>
      </p>
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
//
// PHẢI ĐIỀN TRƯỚC KHI NỘP MẪU CHO META: một chính sách không có chỗ liên hệ
// thì người dùng không thực hiện được quyền xoá dữ liệu mà chính nó hứa.
const CONTACT_EMAIL = 'nampham2212004@gmail.com';

const CONTENT = {
  vi: {
    title: 'Chính sách bảo mật',
    updated: 'Cập nhật lần cuối: 3 tháng 11, 2026',
    intro:
      'LostPets là website giúp người mất thú cưng và người nhặt được thú cưng tìm thấy nhau. '
      + 'Đây là đồ án tốt nghiệp của sinh viên, không phải dịch vụ thương mại. Trang này nói rõ '
      + 'website thu những gì, vì sao, và bạn kiểm soát được điều gì.',
    sections: [
      {
        h: '1. Thông tin bạn tự cung cấp',
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
        h: '2. Nếu bạn tạo tài khoản',
        ul: [
          'Tên và địa chỉ email.',
          'Mật khẩu được lưu dưới dạng băm bcrypt. Website không giữ mật khẩu gốc và không khôi phục lại được, kể cả quản trị viên.',
          'Nếu bạn đăng nhập bằng Google hoặc Facebook: website nhận mã định danh của bạn ở nhà cung cấp đó, kèm tên và email họ gửi sang. Website KHÔNG nhận mật khẩu Google hay Facebook của bạn.',
        ],
      },
      {
        h: '3. Thông tin thu tự động',
        ul: [
          'Địa chỉ IP, chỉ giữ TRONG BỘ NHỚ máy chủ để đếm số lượt gọi và chặn gửi hàng loạt. Không ghi vào cơ sở dữ liệu, tự xoá sau vài phút.',
          'Một vài thiết lập lưu ngay trên máy bạn: ngôn ngữ đang chọn, vị trí bản đồ gần nhất, danh sách tin bạn đã báo cáo. Những thứ này không gửi về máy chủ.',
        ],
      },
      {
        h: '4. Vị trí được làm nhiễu có chủ ý',
        p: [
          'Nếu bạn ghim vị trí lên bản đồ, toạ độ được làm tròn về lưới khoảng 500 mét ngay trước khi lưu. Toạ độ chính xác không bao giờ tồn tại trong cơ sở dữ liệu.',
          'Lý do: thú cưng thường mất gần nhà. Một điểm ghim chính xác đặt ngay cạnh số điện thoại công khai là đủ để người lạ tìm ra nơi bạn ở.',
        ],
      },
      {
        h: '5. Những gì website không làm',
        ul: [
          'Không bán, không cho thuê, không trao đổi dữ liệu của bạn với bất kỳ ai.',
          'Không có quảng cáo và không nhúng mã theo dõi của mạng quảng cáo.',
          'Không theo dõi vị trí chạy nền. Website chỉ hỏi vị trí khi bạn tự bấm nút, và chỉ dùng ngay lúc đó.',
        ],
      },
      {
        h: '6. Dịch vụ bên thứ ba',
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
        h: '7. Giữ trong bao lâu',
        ul: [
          'Tin đã đánh dấu là đã đoàn tụ: tự động xoá sau 30 ngày, xoá cả ảnh đã tải lên.',
          'Tin chưa đoàn tụ: giữ cho tới khi bạn xoá.',
          'Tài khoản: giữ cho tới khi bạn yêu cầu xoá.',
          'Báo cáo tin xấu: xoá cùng lúc với tin bị báo cáo.',
        ],
      },
      {
        h: '8. Quyền của bạn',
        ul: [
          'Sửa hoặc xoá tin của mình, bằng tài khoản đã dùng để đăng, hoặc bằng mã xác nhận hiện ra một lần lúc đăng tin.',
          'Xoá tin là xoá thật: bản ghi, ảnh trên Cloudinary, và cả vector dùng cho tìm kiếm theo nghĩa đều bị xoá cùng lúc.',
          'Mã xác nhận được lưu dưới dạng băm SHA-256. Nếu bạn mất mã và không có tài khoản, website không tra lại được — hãy liên hệ.',
          'Yêu cầu xoá tài khoản bằng cách liên hệ theo địa chỉ bên dưới.',
        ],
      },
      {
        h: '9. Trẻ em',
        p: ['Website không hướng tới người dưới 13 tuổi và không cố ý thu thập dữ liệu của họ.'],
      },
      {
        h: '10. Thay đổi chính sách',
        p: ['Chính sách này có thể được cập nhật. Ngày ở đầu trang là lần sửa gần nhất.'],
      },
    ],
    contactH: 'Liên hệ',
    contactP: 'Mọi câu hỏi về dữ liệu của bạn, hoặc yêu cầu xoá tài khoản, gửi tới ',
  },

  en: {
    title: 'Privacy Policy',
    updated: 'Last updated: 3 November 2026',
    intro:
      'LostPets helps people who have lost a pet and people who have found one find each other. '
      + 'It is a student final-year project, not a commercial service. This page explains what the '
      + 'site collects, why, and what you control.',
    sections: [
      {
        h: '1. Information you provide',
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
        h: '2. If you create an account',
        ul: [
          'Your name and email address.',
          'Your password is stored as a bcrypt hash. The site never keeps the original and cannot recover it, not even an administrator.',
          'If you sign in with Google or Facebook, the site receives your identifier at that provider plus the name and email they send. The site never receives your Google or Facebook password.',
        ],
      },
      {
        h: '3. Information collected automatically',
        ul: [
          'Your IP address, held IN MEMORY only, to count requests and block bulk submissions. It is never written to the database and is discarded within minutes.',
          'A few settings stored on your own device: chosen language, last map position, and which listings you have reported. These are never sent to the server.',
        ],
      },
      {
        h: '4. Location is deliberately blurred',
        p: [
          'If you place a location pin, the coordinates are rounded to a grid of roughly 500 metres before being saved. The exact coordinates never exist in the database.',
          'Why: pets are usually lost close to home. An exact pin next to a publicly visible phone number is enough for a stranger to find where you live.',
        ],
      },
      {
        h: '5. What the site does not do',
        ul: [
          'It does not sell, rent or trade your data with anyone.',
          'It carries no advertising and embeds no advertising trackers.',
          'It does not track location in the background. It asks for your location only when you press the button, and uses it only at that moment.',
        ],
      },
      {
        h: '6. Third-party services',
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
        h: '7. How long data is kept',
        ul: [
          'Listings marked as reunited: deleted automatically after 30 days, including the uploaded photo.',
          'Listings not yet reunited: kept until you delete them.',
          'Accounts: kept until you ask for deletion.',
          'Reports about a listing: deleted together with the listing they concern.',
        ],
      },
      {
        h: '8. Your rights',
        ul: [
          'Edit or delete your own listing, using the account you posted with or the claim code shown once when you posted.',
          'Deletion is real: the record, the photo on Cloudinary and the vector used for semantic search are all removed together.',
          'The claim code is stored as a SHA-256 hash. If you lose it and have no account, the site cannot look it up — please get in touch.',
          'Request account deletion by contacting the address below.',
        ],
      },
      {
        h: '9. Children',
        p: ['The site is not aimed at people under 13 and does not knowingly collect their data.'],
      },
      {
        h: '10. Changes',
        p: ['This policy may be updated. The date at the top is the most recent revision.'],
      },
    ],
    contactH: 'Contact',
    contactP: 'For any question about your data, or to request account deletion, write to ',
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
  },
};
</script>
