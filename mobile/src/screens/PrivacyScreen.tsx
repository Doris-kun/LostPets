import { useLayoutEffect } from 'react';
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types';
import { useLanguage } from '../context/language';
import { createThemedStyles, useThemedStyles } from '../context/theme';
import { radius, spacing } from '../theme';

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

/*
 * Email công khai để người dùng liên hệ về dữ liệu của họ. Bỏ trống thì mục
 * Liên hệ không hiện.
 *
 * PHẢI ĐIỀN TRƯỚC KHI NỘP MẪU CHO META: một chính sách không có chỗ liên hệ
 * thì người dùng không thực hiện được quyền xoá dữ liệu mà chính nó vừa hứa.
 * Bên web cũng đang để trống, hai bên phải điền cùng một địa chỉ.
 */
const CONTACT_EMAIL = '';

interface Section {
  h: string;
  p?: string[];
  ul?: string[];
}

interface Policy {
  title: string;
  updated: string;
  intro: string;
  sections: Section[];
  contactH: string;
  contactP: string;
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
    contactP: 'Mọi câu hỏi về dữ liệu của bạn, hoặc yêu cầu xoá tài khoản, gửi tới ',
  },

  en: {
    title: 'Privacy Policy',
    updated: 'Last updated: 4 November 2026',
    intro:
      'LostPets helps people who have lost a pet and people who have found one find each other. ' +
      'It is a student final-year project, not a commercial service. This app and the website at ' +
      'lostpets-1.onrender.com share one server and one database, so this policy covers both. ' +
      'This page explains what the app collects, why, and what you control.',
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
    contactP: 'For any question about your data, or to request account deletion, write to ',
  },
};

type Props = NativeStackScreenProps<RootStackParamList, 'Privacy'>;

export default function PrivacyScreen({ navigation }: Props) {
  const { t, lang } = useLanguage();
  const styles = useThemedStyles(themedStyles);
  const c = CONTENT[lang];

  useLayoutEffect(() => {
    navigation.setOptions({ title: t('settings.privacy') });
  }, [navigation, t]);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{c.title}</Text>
      <Text style={styles.updated}>{c.updated}</Text>
      <Text style={styles.intro}>{c.intro}</Text>

      {c.sections.map((s) => (
        <View key={s.h} style={styles.section}>
          <Text style={styles.heading}>{s.h}</Text>

          {s.p?.map((text) => (
            <Text key={text} style={styles.para}>
              {text}
            </Text>
          ))}

          {s.ul?.map((text) => (
            <View key={text} style={styles.bulletRow}>
              {/* Chấm tròn vẽ bằng View, không dùng ký tự • — có máy Android
                  không có sẵn ký tự đó trong phông và sẽ hiện ra ô vuông. */}
              <View style={styles.bullet} />
              <Text style={styles.bulletText}>{text}</Text>
            </View>
          ))}
        </View>
      ))}

      {/* Không có email thì KHÔNG vẽ mục Liên hệ: một tiêu đề "Liên hệ" mà bên
          dưới trống rỗng còn tệ hơn là không có mục nào. */}
      {!!CONTACT_EMAIL && (
        <View style={styles.section}>
          <Text style={styles.heading}>{c.contactH}</Text>
          <Text style={styles.para}>{c.contactP}</Text>
          <TouchableOpacity
            style={styles.mailButton}
            onPress={() => Linking.openURL(`mailto:${CONTACT_EMAIL}`)}
            activeOpacity={0.7}
          >
            <Text style={styles.mail}>{CONTACT_EMAIL}</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const themedStyles = createThemedStyles((colors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    content: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },

    title: { fontSize: 22, fontWeight: '800', color: colors.text },
    updated: { fontSize: 12, color: colors.textMuted, marginTop: spacing.xs },
    intro: { fontSize: 13.5, lineHeight: 21, color: colors.textSoft, marginTop: spacing.lg },

    section: { marginTop: spacing.xl },
    heading: { fontSize: 15, fontWeight: '800', color: colors.text, marginBottom: spacing.sm },
    para: { fontSize: 13.5, lineHeight: 21, color: colors.textSoft, marginTop: spacing.sm },

    bulletRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
    bullet: {
      width: 5,
      height: 5,
      borderRadius: radius.full,
      backgroundColor: colors.accentText,
      // Đẩy xuống cho chấm ngang với dòng chữ đầu tiên, không dính lên mép trên
      marginTop: 8,
    },
    bulletText: { flex: 1, fontSize: 13.5, lineHeight: 21, color: colors.textSoft },

    mailButton: {
      alignSelf: 'flex-start',
      justifyContent: 'center',
      // 44 là mức tối thiểu cho một vùng chạm trên iOS (Android là 48dp)
      minHeight: 44,
    },
    mail: { fontSize: 13.5, fontWeight: '700', color: colors.primary },
  }),
);
