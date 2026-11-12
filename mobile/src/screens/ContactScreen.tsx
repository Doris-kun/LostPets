import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Linking, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types';
import { CONTACT_EMAIL } from '../contact';
import { useLanguage } from '../context/language';
import { useTheme } from '../context/theme';

/*
 * Màn Liên hệ — tương đương views/Contact.vue bên web (PR #73).
 *
 * VÌ SAO GOM LẠI MỘT CHỖ
 *
 * Trước đây trên điện thoại hai kênh nằm hai nơi: trợ lý ở Cài đặt, còn địa
 * chỉ email thì nằm cuối trang Chính sách bảo mật. Thử nghĩ như người dùng
 * muốn gửi thư cho nhóm — không ai mở "Chính sách bảo mật" để tìm email cả.
 * Tức là địa chỉ đó gần như không tìm thấy được, dù nó vẫn nằm trong app.
 *
 * Giờ một màn giữ cả hai, vào từ Cài đặt. Chính sách bảo mật chỉ còn một nút
 * dẫn sang đây, y như bản web.
 *
 * Chỉ có hai kênh nên không dựng thành danh mục dài. Cố ý KHÔNG có số tổng
 * đài: đây là đồ án của sinh viên, không có người trực điện thoại — in một số
 * ra rồi không ai nghe máy thì tệ hơn là không in.
 */

interface Content {
  title: string;
  intro: string;
  chatH: string;
  chatP: string;
  chatBtn: string;
  mailH: string;
  mailP: string;
  mailBtn: string;
  copied: string;
  note: string;
  mailSubject: string;
}

/*
 * Chữ để ngay trong file này, không đưa vào word.ts.
 *
 * Cùng cách với PrivacyScreen: đây là những đoạn văn dài chỉ dùng đúng một
 * chỗ. Nhét vào kho chữ chung thì kho đó phình ra toàn những câu không ai
 * dùng lại, mà sửa một câu lại phải mở hai file. Bản web cũng để trong chính
 * Contact.vue.
 */
const CONTENT: Record<'vi' | 'en', Content> = {
  vi: {
    title: 'Liên hệ',
    intro:
      'Có hai cách. Trợ lý trả lời ngay, email thì chậm hơn nhưng xử lý được việc cần người xem.',
    chatH: 'Hỏi trợ lý',
    chatP:
      'Trả lời ngay, bất kể giờ nào. Trợ lý biết về cách dùng app — đăng tin, tìm kiếm, mã xác nhận, bản đồ. Đây là máy trả lời tự động, không phải người thật.',
    chatBtn: 'Mở trợ lý',
    mailH: 'Gửi email',
    mailP:
      'Dành cho việc cần người xem: yêu cầu xoá tài khoản, hỏi về dữ liệu của bạn, hoặc báo lỗi. Nhớ nói rõ email hoặc mã tin liên quan để tra cho nhanh.',
    mailBtn: 'Gửi email',
    copied: 'Đã chép địa chỉ',
    note: 'App là đồ án của sinh viên, không có tổng đài. Email thường được trả lời trong vài ngày.',
    mailSubject: 'LostPets — liên hệ',
  },
  en: {
    title: 'Contact',
    intro: 'Two ways. The assistant answers immediately; email is slower but reaches a person.',
    chatH: 'Ask the assistant',
    chatP:
      'Answers straight away, any time of day. It knows how the app works — posting, searching, claim codes, the map. It is an automated assistant, not a person.',
    chatBtn: 'Open the assistant',
    mailH: 'Send an email',
    mailP:
      'For anything that needs a person: deleting your account, questions about your data, or reporting a bug. Mention the email address or listing code involved so it can be found quickly.',
    mailBtn: 'Send email',
    copied: 'Address copied',
    note: 'This app is a student project and has no phone support. Email is usually answered within a few days.',
    mailSubject: 'LostPets — contact',
  },
};

type Props = NativeStackScreenProps<RootStackParamList, 'Contact'>;

export default function ContactScreen({ navigation }: Props) {
  const { lang } = useLanguage();
  const { colors } = useTheme();
  const c = CONTENT[lang] ?? CONTENT.vi;

  useLayoutEffect(() => {
    navigation.setOptions({ title: c.title });
  }, [navigation, c.title]);

  /*
   * Đã chép địa chỉ hay chưa, để đổi chữ trên nút trong vài giây.
   *
   * Phải dọn đồng hồ hẹn giờ lúc rời màn: bấm xong rồi thoát ra ngay thì hẹn
   * giờ vẫn chạy và gọi setState trên một component đã biến mất.
   */
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  /*
   * Bấm nút email làm HAI việc: mở trình gửi thư, và chép địa chỉ.
   *
   * Không phải làm cho đủ. Máy chưa đặt trình gửi thư mặc định thì mailto
   * KHÔNG có gì xảy ra — im lặng hoàn toàn, người dùng đứng nhìn màn hình tự
   * hỏi mình bấm hụt chỗ nào. Bản web đã gặp đúng chuyện đó khi thử trên
   * Windows. Chữ "Đã chép địa chỉ" là đường lui cho trường hợp ấy.
   */
  const sendMail = async () => {
    await Clipboard.setStringAsync(CONTACT_EMAIL);
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 2500);

    const url = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(c.mailSubject)}`;
    // Nuốt lỗi: máy không có ứng dụng nào nhận mailto thì openURL ném, mà
    // địa chỉ thì đã nằm trong clipboard rồi nên người dùng vẫn có đường đi.
    Linking.openURL(url).catch(() => {});
  };

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="p-lg pb-12">
      <Text className="text-[22px] font-extrabold text-text">{c.title}</Text>
      <Text className="mt-sm text-[13.5px] leading-[21px] text-text-soft">{c.intro}</Text>

      {/* ---- Trợ lý ---- */}
      <View className="mt-lg rounded-md border border-ai-border bg-ai-bg p-lg">
        <View className="h-11 w-11 items-center justify-center rounded-md bg-ai-accent">
          <Ionicons name="chatbubble-ellipses" size={20} color={colors.onPrimary} />
        </View>

        <Text className="mt-md text-[15px] font-extrabold text-ai-text">{c.chatH}</Text>
        <Text className="mt-sm text-[12.5px] leading-[19px] text-text-soft">{c.chatP}</Text>

        <TouchableOpacity
          className="mt-md min-h-11 items-center justify-center rounded-md bg-ai-accent"
          onPress={() => navigation.navigate('Chat')}
          activeOpacity={0.85}
        >
          <Text className="text-[14px] font-bold text-on-primary">{c.chatBtn}</Text>
        </TouchableOpacity>
      </View>

      {/*
        Không có địa chỉ thì KHÔNG vẽ thẻ này. Một nút "Gửi email" bấm vào
        không gửi đi đâu còn tệ hơn là không có nút nào.
      */}
      {!!CONTACT_EMAIL && (
        <View className="mt-md rounded-md border border-contact-border bg-contact-bg p-lg">
          <View className="h-11 w-11 items-center justify-center rounded-md bg-primary">
            <Ionicons name="mail-outline" size={20} color={colors.onPrimary} />
          </View>

          <Text className="mt-md text-[15px] font-extrabold text-teal-text">{c.mailH}</Text>
          <Text className="mt-sm text-[12.5px] leading-[19px] text-text-soft">{c.mailP}</Text>

          {/*
            Địa chỉ CỐ Ý không in ra làm chữ, theo bản web. Nói thẳng giới hạn:
            nó VẪN nằm trong đường dẫn mailto nên con bot nào chịu đọc vẫn lấy
            được — đổi nhãn chỉ chặn loại quét hời hợt.
          */}
          <TouchableOpacity
            className="mt-md min-h-11 flex-row items-center justify-center gap-1.5 rounded-md border-[1.5px] border-border-strong bg-surface"
            onPress={sendMail}
            activeOpacity={0.85}
          >
            <Ionicons
              name={copied ? 'checkmark' : 'mail-outline'}
              size={16}
              color={colors.textSoft}
            />
            <Text className="text-[14px] font-bold text-text-soft">
              {copied ? c.copied : c.mailBtn}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <Text className="mt-lg text-center text-[11.5px] leading-[17px] text-text-muted">
        {c.note}
      </Text>
    </ScrollView>
  );
}
