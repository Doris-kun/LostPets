import { Image, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage, type LanguageValue } from '../context/language';
import type { Pet } from '../types';
import { THUMB_CARD, thumbnail } from '../image';
import { distanceKm, formatDistanceKm, hasPoint, type Point } from '../map';
import { useTheme } from '../context/theme';
import { statusStyle } from '../theme';

/*
 * Thẻ một bài đăng trong danh sách.
 *
 * Tách khỏi HomeScreen vì màn "Bài của tôi" cũng dùng đúng thẻ này. Để nguyên
 * trong HomeScreen thì phải chép lại lần hai, sửa một chỗ quên sửa chỗ kia.
 * Tương đương components/PetCard.jsx bên web.
 *
 * -----------------------------------------------------------------------
 * FILE ĐẦU TIÊN CHUYỂN SANG NATIVEWIND
 *
 * Chọn file này mở màn vì nó nhỏ nhất (221 dòng), xuất hiện ở ba nơi — Trang
 * chủ, Bài của tôi, thẻ nổi trên bản đồ — và đã có sẵn 15 bài test vẽ thật.
 * Chuyển xong mà 15 bài đó vẫn xanh là bằng chứng mạnh nhất có thể có.
 *
 * KHÔNG cần tiền tố dark: ở bất kỳ đâu. Màu là biến CSS, tự đổi theo nút
 * sáng/tối trong Cài đặt — xem scripts/make-global-css.js.
 *
 * BA THỨ KHÔNG CLASS HOÁ ĐƯỢC, và sẽ còn gặp lại ở mọi màn sau:
 *
 *   1. Màu động. statusStyle() chọn màu nhãn theo trạng thái tin lúc chạy,
 *      mà className phải cố định từ lúc biên dịch. Buộc phải style={{...}}.
 *
 *   2. Bóng đổ. shadow.card là một object đã chỉnh tay cho cả iOS lẫn
 *      Android (elevation), khác nhau giữa sáng và tối. Lớp shadow-* của
 *      Tailwind cho ra bóng khác hẳn.
 *
 *   3. Màu truyền vào component khác. Ionicons nhận màu qua prop color,
 *      không phải qua style, nên không có đường nào cho className chen vào.
 */

// require() phải là đường dẫn viết cứng, không ghép chuỗi được, nên khai báo
// sẵn cả hai bản rồi chọn lúc vẽ.
const LOGO_MARK = require('../../assets/logo-mark.png');
const LOGO_MARK_DARK = require('../../assets/logo-mark-dark.png');

/*
 * "3 giờ trước" dễ đọc hơn ngày giờ đầy đủ. Quá 30 ngày thì quay về ngày tháng.
 *
 * Nhận t và lang từ bên ngoài chứ không tự gọi useLanguage(): đây là hàm
 * thường, không phải component, mà hook chỉ gọi được trong component.
 */
export function timeAgo(date: string, t: LanguageValue['t'], lang: LanguageValue['lang']): string {
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return t('time.now');
  if (minutes < 60) return t('time.minutes', { n: minutes });
  if (hours < 24) return t('time.hours', { n: hours });
  if (days < 30) return t('time.days', { n: days });

  // Tháng viết tắt cũng phải đổi theo ngôn ngữ: "20 thg 10" / "Oct 20"
  return new Date(date).toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-US', {
    day: 'numeric',
    month: 'short',
  });
}

export interface PetCardProps {
  pet: Pet;
  onPress: () => void;
  /*
   * Có in mã tin (L-NF4T3P) ở góc thẻ hay không. MẶC ĐỊNH LÀ KHÔNG.
   *
   * Người lướt danh sách không cần tới nó, mà in ra thì vừa rối mắt vừa
   * trông như một thứ gì đó quan trọng mà họ không hiểu. Chỉ chủ tin mới
   * cần biết mã của mình, để tra hoặc đọc cho người khác nghe — nên chỉ màn
   * "Bài của tôi" bật nó lên.
   *
   * Nói rõ để khỏi nhầm: mã tin KHÔNG phải bí mật, lộ ra cũng không làm
   * được gì. Thứ phải giữ kín là MÃ XÁC NHẬN — thứ cho phép sửa và xoá tin,
   * chỉ hiện đúng một lần lúc đăng, và trong database chỉ lưu bản băm.
   * Giấu mã tin đi là vì gọn mắt, không phải vì an toàn.
   *
   * Web làm y vậy, xem front-end PR #61.
   */
  showCode?: boolean;
  /*
   * Chỗ người xem đang đứng, để tính khoảng cách tới nơi con vật mất.
   *
   * null = chưa biết, và lúc đó thẻ hiện "Xem chi tiết ›" thay vào. KHÔNG tự
   * xin quyền vị trí ở Trang chủ: ném hộp thoại xin quyền vào mặt người vừa
   * mở app là thô lỗ, và trái với điều trang chính sách vừa cam kết. Toạ độ
   * này chỉ đến từ lần người dùng tự bấm "Gần tôi" trên bản đồ.
   */
  me?: Point | null;
}

export default function PetCard({ pet, onPress, showCode = false, me = null }: PetCardProps) {
  const { t, lang } = useLanguage();
  const { colors, isDark, shadow } = useTheme();
  const status = statusStyle(pet, colors);

  /*
   * Khoảng cách từ chỗ người xem tới nơi con vật mất.
   *
   * Chuỗi rỗng khi chưa biết vị trí người xem, hoặc khi tin không ghim toạ
   * độ. Dùng hasPoint chứ không tự viết Number(pet.lat): Number(null) ra 0,
   * là một toạ độ hợp lệ giữa Đại Tây Dương.
   */
  const away =
    me && hasPoint(pet) ? formatDistanceKm(distanceKm(me, { lat: pet.lat, lng: pet.lng })) : '';

  return (
    <TouchableOpacity
      /* min-h-24 = 96px: chính là chiều cao tấm ảnh bên trong, nên thẻ
         không bao giờ thấp hơn thế. Khai ra để luật 44pt đo được — thẻ lấy
         chiều cao từ nội dung thì đọc mã nguồn tĩnh không tự suy ra nổi. */
      className="mb-md min-h-24 flex-row rounded-lg bg-background p-sm"
      style={shadow.card}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {/* API trả image là CHUỖI RỖNG khi không có ảnh, không phải null */}
      {pet.image ? (
        <Image
          source={{ uri: thumbnail(pet.image, THUMB_CARD) }}
          className="h-24 w-24 rounded-md bg-surface-tint"
        />
      ) : (
        <View className="h-24 w-24 items-center justify-center rounded-md bg-surface-tint">
          {/* resizeMode không có lớp tiện ích tương đương, phải để nguyên style */}
          <Image
            source={isDark ? LOGO_MARK_DARK : LOGO_MARK}
            className="h-[52px] w-[52px] opacity-45"
            style={{ resizeMode: 'contain' }}
          />
        </View>
      )}

      <View className="flex-1 justify-between py-[2px] pl-md">
        <View className="flex-row items-center justify-between">
          {/* Nền nhãn do statusStyle quyết định lúc chạy -> phải style={{}} */}
          <View
            className="rounded-full px-[9px] py-[3px]"
            style={{ backgroundColor: status.color }}
          >
            <Text className="text-[10.5px] font-extrabold" style={{ color: status.onColor }}>
              {t(status.labelKey)}
            </Text>
          </View>
          <Text className="text-[11px] text-text-muted">{timeAgo(pet.date, t, lang)}</Text>
        </View>

        <Text className="mt-[5px] text-base font-extrabold text-text" numberOfLines={1}>
          {pet.name || pet.breed}
        </Text>
        <Text className="mt-px text-[12.5px] text-text-muted" numberOfLines={1}>
          {pet.species} · {pet.breed}
        </Text>

        <View className="mt-1.5 flex-row items-center justify-between">
          <View className="flex-1 flex-row items-center gap-[3px]">
            <Ionicons name="location" size={12} color={colors.textMuted} />
            <Text className="flex-1 text-[12.5px] text-text-soft" numberOfLines={1}>
              {pet.area}
            </Text>
          </View>

          {/*
            Bên phải hàng dưới cùng. Ba trường hợp, không bao giờ để trống:

              "Bài của tôi"     -> mã tin, thứ chủ tin cần
              biết vị trí       -> khoảng cách tới nơi con vật mất
              chưa biết vị trí  -> lời mời bấm vào

            Để trống một nửa chính là chỗ thầy hướng dẫn nhận xét bên web. Mà
            sửa nửa vời thì người không cho phép định vị vẫn thấy y như cũ.
          */}
          {showCode && pet.postId ? (
            <Text className="ml-sm text-[10.5px] text-text-muted">{pet.postId}</Text>
          ) : away ? (
            // Khoảng cách đậm hơn mã tin một chút: nó là thứ người đang tìm
            // thú cưng thật sự dùng để quyết định có mở tin ra hay không.
            <Text className="ml-sm shrink-0 text-[11px] font-semibold text-teal-text">
              {t('card.away', { d: away })}
            </Text>
          ) : (
            <View className="ml-sm shrink-0 flex-row items-center">
              <Text className="text-[10.5px] text-text-muted">{t('card.detail')}</Text>
              {/* Mũi tên vẽ bằng icon, không dùng ký tự → — có máy Android
                  không có sẵn ký tự đó trong phông và hiện ra ô vuông. Lỗi
                  này đã gặp thật một lần rồi. */}
              <Ionicons name="chevron-forward" size={11} color={colors.textMuted} />
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}
