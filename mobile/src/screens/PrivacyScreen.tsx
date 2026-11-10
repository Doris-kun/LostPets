import { useLayoutEffect, useRef } from 'react';
import type { ComponentRef } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types';
import { useLanguage } from '../context/language';
import { useTheme } from '../context/theme';
import { spacing } from '../theme';

/*
 * Chính sách bảo mật.
 *
 * MỘT chính sách cho cả web lẫn app: cùng một back-end, cùng một cơ sở dữ
 * liệu, cùng dữ liệu người dùng. Nội dung lấy từ front-end/src/views/
 * Privacy.vue của Nam, và bổ sung những thứ chỉ app mới có — camera, thư
 * viện ảnh, GPS, và dữ liệu nằm ngay trong máy.
 *
 * Viết từ việc ĐỌC CODE chứ không chép mẫu trên mạng: mỗi câu dưới đây đối
 * chiếu được với một dòng trong back-end hoặc trong chính app này. Một chính
 * sách mô tả sai việc mình làm còn tệ hơn không có, vì nó là cam kết công khai.
 *
 * Trang này cũng là điều kiện để chuyển ứng dụng Facebook sang chế độ Live —
 * Meta bắt buộc có đường dẫn chính sách bảo mật công khai.
 *
 * Để văn bản ngay trong file thay vì nhét từng đoạn vào word.ts: đây là văn
 * xuôi dài, tách thành bốn chục khoá rời rạc thì không ai đọc lại nổi để kiểm
 * xem bản tiếng Việt và tiếng Anh còn khớp nhau không. Nam làm y vậy bên web.
 */


interface Section {
  h: string;
  p?: string[];
  ul?: string[];
}

interface Policy {
  title: string;
  updated: string;
  intro: string;
  /*
   * Bốn điều quan trọng nhất, đặt ngay đầu trang.
   *
   * Gần như không ai đọc hết một trang chính sách bảo mật. Ai chỉ đọc bốn
   * dòng này rồi thoát ra vẫn nắm được phần quan trọng nhất. Lấy đúng bản
   * web, xem front-end PR #70.
   */
  summaryH: string;
  summary: string[];
  /** Tiêu đề của mục lục bấm được. */
  tocH: string;
  sections: Section[];
  contactH: string;
  contactP: string;
  contactBtn: string;
}

const CONTENT: Record<'vi' | 'en', Policy> = {
  vi: {
    title: 'Chính sách bảo mật',
    updated: 'Cập nhật lần cuối: 4 tháng 11, 2026',
    intro:
      'LostPets giúp người mất thú cưng và người nhặt được thú cưng tìm thấy nhau. Đây là đồ án ' +
      'tốt nghiệp của sinh viên, không phải dịch vụ thương mại. Ứng dụng này và website ' +
      'lostpets-1.onrender.com dùng chung một máy chủ và một cơ sở dữ liệu, nên chính sách này ' +
      'áp dụng cho cả hai. Trang này nói rõ ứng dụng thu những gì, vì sao, và bạn kiểm soát được gì.',
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
        h: '1. Thông tin bạn tự cung cấp',
        p: ['Khi đăng tin — không cần tài khoản:'],
        ul: [
          'Loài, giống, màu lông, khu vực và mô tả con vật.',
          'Cách liên hệ, thường là số điện thoại. Thông tin này HIỆN CÔNG KHAI cho mọi người xem, vì đó chính là mục đích của tin đăng — không có nó thì người nhặt được không báo cho bạn được.',
          'Ảnh con vật, nếu bạn chụp hoặc chọn từ thư viện.',
          'Vị trí trên bản đồ, nếu bạn tự ghim.',
          'Đặc điểm nhận dạng giữ kín, nếu bạn điền. Mục này KHÔNG hiện công khai, chỉ dùng để đối chiếu khi có người nhận là chủ.',
        ],
      },
      {
        h: '2. Nếu bạn tạo tài khoản',
        ul: [
          'Tên và địa chỉ email.',
          'Mật khẩu được lưu dưới dạng băm bcrypt. Máy chủ không giữ mật khẩu gốc và không khôi phục lại được, kể cả quản trị viên.',
          'Nếu bạn đăng nhập bằng Google hoặc Facebook: máy chủ nhận mã định danh của bạn ở nhà cung cấp đó, kèm tên và email họ gửi sang. Ứng dụng KHÔNG nhận mật khẩu Google hay Facebook của bạn.',
        ],
      },
      {
        h: '3. Thông tin thu tự động',
        ul: [
          'Địa chỉ IP, chỉ giữ TRONG BỘ NHỚ máy chủ để đếm số lượt gọi và chặn gửi hàng loạt. Không ghi vào cơ sở dữ liệu, tự xoá sau vài phút.',
          'Ứng dụng KHÔNG thu mã thiết bị, không thu danh bạ, không đọc ảnh nào ngoài tấm bạn tự chọn.',
        ],
      },
      {
        h: '4. Những gì lưu ngay trong máy bạn',
        p: [
          'Ứng dụng lưu vài thứ trong bộ nhớ riêng của nó. Chúng KHÔNG gửi về máy chủ, và gỡ ứng dụng là mất hết:',
        ],
        ul: [
          'Ngôn ngữ và chế độ sáng/tối bạn chọn.',
          'Mã xác nhận của những tin bạn đã đăng từ máy này — để bạn sửa hoặc xoá tin mà không cần nhớ mã.',
          'Danh sách tin bạn đã báo cáo, chỉ để nút không cho bấm lại nhiều lần.',
          'Thẻ đăng nhập, nếu bạn có tài khoản. Đăng xuất là xoá.',
        ],
      },
      {
        h: '5. Quyền ứng dụng xin trên điện thoại',
        p: [
          'Ứng dụng chỉ hỏi quyền ĐÚNG LÚC bạn bấm vào tính năng cần tới nó, không hỏi dồn lúc mở app. Từ chối thì các phần còn lại vẫn dùng bình thường.',
        ],
        ul: [
          'Máy ảnh — chỉ khi bạn bấm "Chụp ảnh" để chụp con vật. Ứng dụng không mở máy ảnh vào lúc nào khác.',
          'Thư viện ảnh — chỉ khi bạn bấm "Chọn từ thư viện". Ứng dụng chỉ nhận đúng tấm bạn chọn, không đọc được những tấm khác.',
          'Vị trí — chỉ khi bạn bấm "Vị trí của tôi" hoặc "Gần tôi". KHÔNG theo dõi chạy nền, và vị trí dùng xong là thôi, trừ khi bạn ghim nó vào tin.',
        ],
      },
      {
        h: '6. Vị trí được làm nhiễu có chủ ý',
        p: [
          'Nếu bạn ghim vị trí lên bản đồ, toạ độ được làm tròn về lưới khoảng 500 mét ngay trước khi lưu. Toạ độ chính xác không bao giờ tồn tại trong cơ sở dữ liệu.',
          'Lý do: thú cưng thường mất gần nhà. Một điểm ghim chính xác đặt ngay cạnh số điện thoại công khai là đủ để người lạ tìm ra nơi bạn ở.',
        ],
      },
      {
        h: '7. Những gì ứng dụng không làm',
        ul: [
          'Không bán, không cho thuê, không trao đổi dữ liệu của bạn với bất kỳ ai.',
          'Không có quảng cáo và không nhúng mã theo dõi của mạng quảng cáo.',
          'Không theo dõi vị trí chạy nền.',
        ],
      },
      {
        h: '8. Dịch vụ bên thứ ba',
        p: ['Để hoạt động, ứng dụng gửi một phần dữ liệu tới các dịch vụ sau:'],
        ul: [
          'Cloudinary — lưu ảnh bạn tải lên.',
          'MongoDB Atlas — lưu tin đăng và tài khoản.',
          'Render — máy chủ chạy dịch vụ.',
          'Google Gemini — phân tích ảnh, hiểu nghĩa câu tìm kiếm, đối chiếu các tin với nhau, và trả lời trong phần trợ lý. Nội dung tin đăng cùng câu bạn gõ được gửi tới dịch vụ này.',
          'Google và Meta — chỉ khi bạn tự bấm nút đăng nhập tương ứng.',
          'OpenStreetMap — ảnh nền bản đồ. Khi bản đồ hiện ra, máy bạn gọi thẳng tới máy chủ của họ, nên họ thấy địa chỉ IP của bạn.',
          'Expo — hạ tầng dựng và cập nhật ứng dụng.',
        ],
      },
      {
        h: '9. Giữ trong bao lâu',
        ul: [
          'Tin đã đánh dấu là đã đoàn tụ: tự động xoá sau 30 ngày, xoá cả ảnh đã tải lên.',
          'Tin chưa đoàn tụ: giữ cho tới khi bạn xoá.',
          'Tài khoản: giữ cho tới khi bạn yêu cầu xoá.',
          'Báo cáo tin xấu: xoá cùng lúc với tin bị báo cáo.',
        ],
      },
      {
        h: '10. Quyền của bạn',
        ul: [
          'Sửa hoặc xoá tin của mình, bằng tài khoản đã dùng để đăng, hoặc bằng mã xác nhận hiện ra một lần lúc đăng tin.',
          'Xoá tin là xoá thật: bản ghi, ảnh trên Cloudinary, và cả vector dùng cho tìm kiếm theo nghĩa đều bị xoá cùng lúc.',
          'Mã xác nhận được lưu dưới dạng băm SHA-256. Nếu bạn mất mã và không có tài khoản, máy chủ không tra lại được — hãy liên hệ.',
          'Rút lại quyền máy ảnh, thư viện ảnh hoặc vị trí bất cứ lúc nào, trong phần Cài đặt của điện thoại.',
          'Yêu cầu xoá tài khoản bằng cách liên hệ theo địa chỉ bên dưới.',
        ],
      },
      {
        h: '11. Trẻ em',
        p: ['Ứng dụng không hướng tới người dưới 13 tuổi và không cố ý thu thập dữ liệu của họ.'],
      },
      {
        h: '12. Thay đổi chính sách',
        p: ['Chính sách này có thể được cập nhật. Ngày ở đầu trang là lần sửa gần nhất.'],
      },
    ],
    contactH: 'Liên hệ',
    contactP:
      'Mọi câu hỏi về dữ liệu của bạn, hoặc yêu cầu xoá tài khoản, có hai cách liên hệ ở màn bên.',
    contactBtn: 'Liên hệ với chúng tôi',
  },

  en: {
    title: 'Privacy Policy',
    updated: 'Last updated: 4 November 2026',
    intro:
      'LostPets helps people who have lost a pet and people who have found one find each other. ' +
      'It is a student final-year project, not a commercial service. This app and the website at ' +
      'lostpets-1.onrender.com share one server and one database, so this policy covers both. ' +
      'This page explains what the app collects, why, and what you control.',
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
        h: '1. Information you provide',
        p: ['When you post a listing — no account required:'],
        ul: [
          'Species, breed, colour, area and a description of the animal.',
          'Contact details, usually a phone number. This is PUBLICLY VISIBLE, because that is the point of a listing — without it, whoever finds your pet cannot reach you.',
          'A photo of the animal, if you take one or pick one from your library.',
          'A location pin, if you place one.',
          'A private identifying detail, if you add one. This is NOT shown publicly; it is used only to check someone claiming to be the owner.',
        ],
      },
      {
        h: '2. If you create an account',
        ul: [
          'Your name and email address.',
          'Your password is stored as a bcrypt hash. The server never keeps the original and cannot recover it, not even an administrator.',
          'If you sign in with Google or Facebook, the server receives your identifier at that provider plus the name and email they send. The app never receives your Google or Facebook password.',
        ],
      },
      {
        h: '3. Information collected automatically',
        ul: [
          'Your IP address, held IN MEMORY only, to count requests and block bulk submissions. It is never written to the database and is discarded within minutes.',
          'The app does NOT collect a device identifier, does not read your contacts, and does not read any photo other than the one you pick.',
        ],
      },
      {
        h: '4. What is stored on your device',
        p: [
          'The app keeps a few things in its own storage. They are NEVER sent to the server, and uninstalling the app removes all of them:',
        ],
        ul: [
          'Your chosen language and light/dark mode.',
          'Claim codes for listings you posted from this device, so you can edit or delete them without memorising the code.',
          'Which listings you have reported, only so the button does not let you report the same one repeatedly.',
          'Your sign-in token, if you have an account. Signing out deletes it.',
        ],
      },
      {
        h: '5. Permissions the app asks for',
        p: [
          'The app asks for a permission only at the MOMENT you use the feature that needs it, never all at once on launch. If you decline, everything else still works.',
        ],
        ul: [
          'Camera — only when you tap "Take a photo" to photograph the animal. The app never opens the camera at any other time.',
          'Photo library — only when you tap "Choose from library". The app receives only the picture you pick and cannot read the others.',
          'Location — only when you tap "Use my location" or "Near me". There is NO background tracking, and the location is discarded after use unless you pin it to a listing.',
        ],
      },
      {
        h: '6. Location is deliberately blurred',
        p: [
          'If you place a location pin, the coordinates are rounded to a grid of roughly 500 metres before being saved. The exact coordinates never exist in the database.',
          'Why: pets are usually lost close to home. An exact pin next to a publicly visible phone number is enough for a stranger to find where you live.',
        ],
      },
      {
        h: '7. What the app does not do',
        ul: [
          'It does not sell, rent or trade your data with anyone.',
          'It carries no advertising and embeds no advertising trackers.',
          'It does not track location in the background.',
        ],
      },
      {
        h: '8. Third-party services',
        p: ['To function, the app sends some data to:'],
        ul: [
          'Cloudinary — stores the photos you upload.',
          'MongoDB Atlas — stores listings and accounts.',
          'Render — hosts the service.',
          'Google Gemini — analyses photos, interprets search phrases, compares listings, and answers in the help assistant. Listing content and what you type are sent to this service.',
          'Google and Meta — only when you press the matching sign-in button.',
          'OpenStreetMap — map imagery. When a map loads, your device contacts their servers directly, so they see your IP address.',
          'Expo — infrastructure for building and updating the app.',
        ],
      },
      {
        h: '9. How long data is kept',
        ul: [
          'Listings marked as reunited: deleted automatically after 30 days, including the uploaded photo.',
          'Listings not yet reunited: kept until you delete them.',
          'Accounts: kept until you ask for deletion.',
          'Reports about a listing: deleted together with the listing they concern.',
        ],
      },
      {
        h: '10. Your rights',
        ul: [
          'Edit or delete your own listing, using the account you posted with or the claim code shown once when you posted.',
          'Deletion is real: the record, the photo on Cloudinary and the vector used for semantic search are all removed together.',
          'The claim code is stored as a SHA-256 hash. If you lose it and have no account, the server cannot look it up — please get in touch.',
          'Withdraw the camera, photo library or location permission at any time, in your phone settings.',
          'Request account deletion by contacting the address below.',
        ],
      },
      {
        h: '11. Children',
        p: ['The app is not aimed at people under 13 and does not knowingly collect their data.'],
      },
      {
        h: '12. Changes',
        p: ['This policy may be updated. The date at the top is the most recent revision.'],
      },
    ],
    contactH: 'Contact',
    contactP:
      'For any question about your data, or to request account deletion, there are two ways to get in touch.',
    contactBtn: 'Contact us',
  },
};

type Props = NativeStackScreenProps<RootStackParamList, 'Privacy'>;

export default function PrivacyScreen({ navigation }: Props) {
  const { t, lang } = useLanguage();
  const { colors } = useTheme();
  const c = CONTENT[lang];

  useLayoutEffect(() => {
    navigation.setOptions({ title: t('settings.privacy') });
  }, [navigation, t]);

  /*
   * Mục lục bấm được, nhảy thẳng tới mục.
   *
   * Mười hai mục trên màn điện thoại mà không có đường nhảy thì người muốn
   * biết "giữ dữ liệu bao lâu" phải cuộn mò qua chín mục không liên quan.
   *
   * Web dùng id trong đường dẫn; trên điện thoại không có khái niệm đó, nên
   * đo vị trí thật của từng mục lúc nó được vẽ ra rồi cuộn tới toạ độ đó.
   */
  /*
   * ComponentRef<typeof ScrollView> chứ không phải ScrollView.
   *
   * React Native 0.88 đổi ScrollView thành component hàm, nên chính tên đó
   * giờ là một HÀM chứ không phải lớp — dùng làm kiểu ref thì TypeScript bảo
   * "không có scrollTo", mà đọc ra thì rất khó hiểu vì câu lệnh nhìn vẫn đúng.
   */
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const tops = useRef<Record<number, number>>({});

  const jump = (i: number) => {
    const y = tops.current[i];
    if (y === undefined) return;
    // Trừ bớt một chút để tiêu đề không dính sát mép trên màn hình.
    scrollRef.current?.scrollTo({ y: Math.max(0, y - spacing.md), animated: true });
  };

  return (
    /*
      contentContainerClassName chứ không phải className cho phần đệm.

      ScrollView có hai lớp: khung ngoài (className) và dải nội dung chạy
      bên trong (contentContainerClassName). Đệm đặt ở khung ngoài thì nó
      bóp khung lại, phần chữ bị cắt khi cuộn tới cuối; đặt ở dải nội dung
      mới là đệm thật. NativeWind có sẵn tên thuộc tính thứ hai này.

      pb-12 = 48px = spacing.xl * 2, chừa chỗ cho thanh điều hướng dưới.
    */
    <ScrollView
      ref={scrollRef}
      className="flex-1 bg-background"
      contentContainerClassName="p-lg pb-12"
    >
      <Text className="text-[22px] font-extrabold text-text">{c.title}</Text>
      <Text className="mt-xs text-[12px] text-text-muted">{c.updated}</Text>
      <Text className="mt-lg text-[13.5px] leading-[21px] text-text-soft">{c.intro}</Text>

      {/*
        Khung tóm tắt. Đặt ngay chỗ mắt rơi xuống đầu tiên, và cho nó nền
        riêng để tách khỏi phần văn xuôi bên dưới — ai chỉ đọc bốn dòng này
        rồi thoát ra vẫn nắm được phần quan trọng nhất.
      */}
      <View className="mt-lg rounded-md border-[1.5px] border-secret-border bg-secret-bg p-md">
        <Text className="mb-sm text-[13.5px] font-extrabold text-secret-text">
          {c.summaryH}
        </Text>
        {c.summary.map((text) => (
          <View key={text} className="mt-sm flex-row gap-sm">
            {/* Chấm đậm hơn chấm thường: bốn dòng này là phần đáng đọc nhất */}
            <View className="mt-2 h-[5px] w-[5px] rounded-full bg-secret-text" />
            <Text className="flex-1 text-[12.5px] leading-[19px] text-text">{text}</Text>
          </View>
        ))}
      </View>

      <View className="mt-lg rounded-md border border-border-light bg-surface px-md">
        <Text className="mt-md text-[11px] font-extrabold tracking-[0.5px] text-text-muted">
          {c.tocH}
        </Text>
        {c.sections.map((s, i) => (
          <TouchableOpacity
            key={s.h}
            // min-h-11 = 44pt, mức tối thiểu cho một vùng chạm trên iOS
            className="min-h-11 flex-row items-center justify-between gap-sm"
            onPress={() => jump(i)}
            activeOpacity={0.7}
          >
            <Text className="flex-1 text-[13px] text-text-soft">{s.h}</Text>
            <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
          </TouchableOpacity>
        ))}
      </View>

      {c.sections.map((s, i) => (
        <View
          key={s.h}
          className="mt-xl"
          onLayout={(e) => {
            tops.current[i] = e.nativeEvent.layout.y;
          }}
        >
          <Text className="mb-sm text-[15px] font-extrabold text-text">{s.h}</Text>

          {s.p?.map((text) => (
            <Text key={text} className="mt-sm text-[13.5px] leading-[21px] text-text-soft">
              {text}
            </Text>
          ))}

          {s.ul?.map((text) => (
            <View key={text} className="mt-sm flex-row gap-sm">
              {/* Chấm tròn vẽ bằng View, không dùng ký tự • — có máy Android
                  không có sẵn ký tự đó trong phông và sẽ hiện ra ô vuông. */}
              <View className="mt-2 h-[5px] w-[5px] rounded-full bg-accent-text" />
              <Text className="flex-1 text-[13.5px] leading-[21px] text-text-soft">
                {text}
              </Text>
            </View>
          ))}
        </View>
      ))}

      {/*
        Mục Liên hệ chỉ còn MỘT nút dẫn sang màn Liên hệ.

        Trước đây hai nút gửi thư và chép địa chỉ nằm ngay đây. Nhưng trang
        chính sách không phải chỗ người ta mở ra khi muốn liên hệ — họ mở nó
        khi muốn biết app thu thập gì. Hai kênh nay gom về một màn riêng, vào
        từ Cài đặt, nên ở đây chỉ cần chỉ đường. Bản web làm y vậy ở PR #73.
      */}
      <View className="mt-xl">
        <Text className="mb-sm text-[15px] font-extrabold text-text">{c.contactH}</Text>
        <Text className="mt-sm text-[13.5px] leading-[21px] text-text-soft">{c.contactP}</Text>

        <TouchableOpacity
          className="mt-md min-h-[46px] flex-row items-center justify-center gap-1.5 rounded-md border-[1.5px] border-primary bg-primary"
          onPress={() => navigation.navigate('Contact')}
          activeOpacity={0.85}
        >
          <Ionicons name="chatbubbles-outline" size={16} color={colors.onPrimary} />
          <Text className="text-[13px] font-bold text-on-primary">{c.contactBtn}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
