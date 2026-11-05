import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage, type LanguageValue } from '../context/language';
import type { Pet } from '../types';
import { THUMB_CARD, thumbnail } from '../image';
import { distanceKm, formatDistanceKm, hasPoint, type Point } from '../map';
import { createThemedStyles, useTheme, useThemedStyles } from '../context/theme';
import { radius, spacing, statusStyle } from '../theme';

/*
 * Thẻ một bài đăng trong danh sách.
 *
 * Tách khỏi HomeScreen vì màn "Bài của tôi" cũng dùng đúng thẻ này. Để nguyên
 * trong HomeScreen thì phải chép lại lần hai, sửa một chỗ quên sửa chỗ kia.
 * Tương đương components/PetCard.jsx bên web.
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
   * null = chưa biết, và lúc đó thẻ hiện "Xem chi tiết →" thay vào. KHÔNG tự
   * xin quyền vị trí ở Trang chủ: ném hộp thoại xin quyền vào mặt người vừa
   * mở app là thô lỗ, và trái với điều trang chính sách vừa cam kết. Toạ độ
   * này chỉ đến từ lần người dùng tự bấm "Gần tôi" trên bản đồ.
   */
  me?: Point | null;
}

export default function PetCard({
  pet,
  onPress,
  showCode = false,
  me = null,
}: PetCardProps) {
  const { t, lang } = useLanguage();
  const { colors, isDark } = useTheme();
  const styles = useThemedStyles(themedStyles);
  const status = statusStyle(pet, colors);

  /*
   * Khoảng cách từ chỗ người xem tới nơi con vật mất.
   *
   * Chuỗi rỗng khi chưa biết vị trí người xem, hoặc khi tin không ghim toạ
   * độ. Dùng hasPoint chứ không tự viết Number(pet.lat): Number(null) ra 0,
   * là một toạ độ hợp lệ giữa Đại Tây Dương.
   */
  const away =
    me && hasPoint(pet)
      ? formatDistanceKm(distanceKm(me, { lat: pet.lat, lng: pet.lng }))
      : '';

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      {/* API trả image là CHUỖI RỖNG khi không có ảnh, không phải null */}
      {pet.image ? (
        <Image source={{ uri: thumbnail(pet.image, THUMB_CARD) }} style={styles.cardImage} />
      ) : (
        <View style={[styles.cardImage, styles.cardImagePlaceholder]}>
          <Image source={isDark ? LOGO_MARK_DARK : LOGO_MARK} style={styles.placeholderLogo} />
        </View>
      )}

      <View style={styles.cardBody}>
        <View style={styles.cardTopRow}>
          <View style={[styles.badge, { backgroundColor: status.color }]}>
            <Text style={[styles.badgeText, { color: status.onColor }]}>{t(status.labelKey)}</Text>
          </View>
          <Text style={styles.cardTime}>{timeAgo(pet.date, t, lang)}</Text>
        </View>

        <Text style={styles.cardTitle} numberOfLines={1}>
          {pet.name || pet.breed}
        </Text>
        <Text style={styles.cardSub} numberOfLines={1}>
          {pet.species} · {pet.breed}
        </Text>

        <View style={styles.cardFooter}>
          <View style={styles.cardAreaRow}>
            <Ionicons name="location" size={12} color={colors.textMuted} />
            <Text style={styles.cardArea} numberOfLines={1}>
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
            <Text style={styles.cardCode}>{pet.postId}</Text>
          ) : away ? (
            <Text style={styles.cardAway}>{t('card.away', { d: away })}</Text>
          ) : (
            <View style={styles.cardMore}>
              <Text style={styles.cardMoreText}>{t('card.detail')}</Text>
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

const themedStyles = createThemedStyles((colors, shadow) =>
  StyleSheet.create({
    card: {
      flexDirection: 'row',
      backgroundColor: colors.background,
      borderRadius: radius.lg,
      padding: spacing.sm,
      marginBottom: spacing.md,
      ...shadow.card,
    },
    cardImage: {
      width: 96,
      height: 96,
      borderRadius: radius.md,
      backgroundColor: colors.surfaceTint,
    },
    cardImagePlaceholder: { justifyContent: 'center', alignItems: 'center' },
    placeholderLogo: { width: 52, height: 52, resizeMode: 'contain', opacity: 0.45 },

    cardBody: {
      flex: 1,
      paddingLeft: spacing.md,
      paddingVertical: 2,
      justifyContent: 'space-between',
    },
    cardTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    badge: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: radius.full },
    // Nền nhãn là màu thương hiệu, giống nhau ở cả hai chế độ, nên chữ trên
    // nó cũng phải trắng ở cả hai — không dùng onPrimary vì màu đó đổi theo chế độ.
    // Màu chữ do statusStyle quyết định lúc vẽ, vì mỗi nhãn một nền khác nhau
    badgeText: { fontSize: 10.5, fontWeight: '800' },
    cardTime: { fontSize: 11, color: colors.textMuted },

    cardTitle: { fontSize: 16, fontWeight: '800', color: colors.text, marginTop: 5 },
    cardSub: { fontSize: 12.5, color: colors.textMuted, marginTop: 1 },

    cardFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 6,
    },
    cardAreaRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 3 },
    cardArea: { flex: 1, fontSize: 12.5, color: colors.textSoft },
    cardCode: { fontSize: 10.5, color: colors.textMuted, marginLeft: spacing.sm },

    // Khoảng cách: đậm hơn mã tin một chút vì nó là thứ người đang tìm thú
    // cưng thật sự dùng để quyết định có mở tin ra hay không.
    cardAway: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.tealText,
      marginLeft: spacing.sm,
      flexShrink: 0,
    },

    cardMore: { flexDirection: 'row', alignItems: 'center', marginLeft: spacing.sm, flexShrink: 0 },
    cardMoreText: { fontSize: 10.5, color: colors.textMuted },
  }),
);
