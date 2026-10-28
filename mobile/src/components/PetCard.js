import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../context/language';
import { createThemedStyles, useTheme, useThemedStyles } from '../context/theme';
import { radius, shadow as _shadow, spacing, statusStyle } from '../theme';

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
export function timeAgo(date, t, lang) {
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

export default function PetCard({ pet, onPress }) {
  const { t, lang } = useLanguage();
  const { colors, isDark } = useTheme();
  const styles = useThemedStyles(themedStyles);
  const status = statusStyle(pet, colors);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      {/* API trả image là CHUỖI RỖNG khi không có ảnh, không phải null */}
      {pet.image ? (
        <Image source={{ uri: pet.image }} style={styles.cardImage} />
      ) : (
        <View style={[styles.cardImage, styles.cardImagePlaceholder]}>
          <Image source={isDark ? LOGO_MARK_DARK : LOGO_MARK} style={styles.placeholderLogo} />
        </View>
      )}

      <View style={styles.cardBody}>
        <View style={styles.cardTopRow}>
          <View style={[styles.badge, { backgroundColor: status.color }]}>
            <Text style={styles.badgeText}>{t(status.labelKey)}</Text>
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
          {!!pet.postId && <Text style={styles.cardCode}>{pet.postId}</Text>}
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
    badgeText: { color: colors.onStatus, fontSize: 10.5, fontWeight: '800' },
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
  }),
);
