import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api from '../api';
import claim from '../claim';
import { WEB_URL } from '../config';
import { useLanguage } from '../context/language';
import { radius, spacing, statusStyle } from '../theme';
import { createThemedStyles, useTheme, useThemedStyles } from '../context/theme';

/*
 * Màn hình chi tiết một tin.
 *
 * Chứa chữ D (Delete) của CRUD, và nút Sửa dẫn sang màn form.
 * Tương đương pages/PetDetail.jsx bên web, bỏ phần chia sẻ và đánh dấu đoàn tụ.
 */

export default function DetailScreen({ route, navigation }) {
  // Tham số truyền từ màn trước: navigation.navigate('Detail', { id: ... })
  // Tương đương useParams() của react-router bên web.
  const { id } = route.params;
  const { t } = useLanguage();
  const { colors } = useTheme();
  const styles = useThemedStyles(themedStyles);

  const [pet, setPet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  // Đang gửi yêu cầu đánh dấu đoàn tụ -> khoá nút, đổi chữ thành "Đang lưu..."
  const [resolving, setResolving] = useState(false);

  // Tải lại mỗi khi quay về màn này -> sửa tin xong bấm Back là thấy ngay dữ liệu mới
  useFocusEffect(
    useCallback(() => {
      let ignore = false;

      api
        .getPet(id)
        .then(({ data }) => {
          if (!ignore) setPet(data);
        })
        .catch(() => {
          if (!ignore) setPet(null);
        })
        .finally(() => {
          if (!ignore) setLoading(false);
        });

      return () => {
        ignore = true;
      };
    }, [id]),
  );

  const handleResolve = () => {
    Alert.alert(t('detail.resolveTitle'), t('detail.resolveConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.confirm'),
        onPress: async () => {
          setResolving(true);
          try {
            // PUT chỉ gửi trường muốn đổi, các trường khác giữ nguyên.
            const code = await claim.get(id);
            const { data } = await api.updatePet(id, { resolved: true }, code);
            setPet(data);
          } catch (err) {
            const denied = err.response?.status === 403;
            Alert.alert(
              t(denied ? 'error.deniedTitle' : 'error.title'),
              t(denied ? 'error.deniedText' : 'error.saveFailed'),
            );
          } finally {
            setResolving(false);
          }
        },
      },
    ]);
  };

  const handleShare = async () => {
    /*
     * Share của React Native gọi thẳng bảng chia sẻ của HỆ ĐIỀU HÀNH — cái
     * bảng trượt lên có sẵn Zalo, Messenger, Tin nhắn, Sao chép...
     *
     * Web phải dùng navigator.share, mà nó chỉ có trên vài trình duyệt, không
     * có thì phải quay về chép link vào clipboard. Trên điện thoại thì luôn có.
     *
     * Gửi kèm link tới bản web chứ không phải link trong app: người nhận chưa
     * chắc đã cài app, bấm vào vẫn xem được tin bằng trình duyệt.
     */
    const lines = [
      t(pet.type === 'lost' ? 'detail.shareLost' : 'detail.shareFound'),
      `${pet.name || pet.breed} — ${pet.species} · ${pet.breed}`,
      `${t('detail.shareArea')}: ${pet.area}`,
      `${t('detail.shareContact')}: ${pet.contact}`,
      `${WEB_URL}/pet/${pet._id}`,
    ];

    try {
      await Share.share({ message: lines.join('\n'), title: pet.name || pet.breed });
    } catch {
      // Người dùng đóng bảng chia sẻ giữa chừng cũng vào đây. Không phải lỗi,
      // nên không báo gì cả.
    }
  };

  const handleDelete = () => {
    /*
     * React Native KHÔNG có window.confirm() như trình duyệt.
     * Thay bằng Alert.alert() — hộp thoại gốc của hệ điều hành.
     * Nó KHÔNG chặn luồng chạy như confirm(), mà gọi lại qua hàm onPress,
     * nên không viết được kiểu `if (!confirm(...)) return;`.
     */
    Alert.alert(t('detail.deleteTitle'), t('detail.deleteConfirm'), [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          setDeleting(true);
          try {
            // Mã xác nhận được cất lúc đăng tin. Tin cũ hoặc tin đăng từ máy
            // khác thì máy này không giữ mã — gửi rỗng, back-end tự quyết định.
            const code = await claim.get(id);
            await api.deletePet(id, code);
            await claim.remove(id);
            navigation.goBack();
          } catch (err) {
            setDeleting(false);
            const denied = err.response?.status === 403;
            Alert.alert(
              t(denied ? 'error.deleteDeniedTitle' : 'error.title'),
              t(denied ? 'error.deniedText' : 'error.deleteFailed'),
            );
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.teal} />
      </View>
    );
  }

  if (!pet) {
    return (
      <View style={styles.center}>
        <Text style={styles.notFound}>{t('detail.notFound')}</Text>
      </View>
    );
  }

  const status = statusStyle(pet, colors);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {pet.image ? (
        <Image source={{ uri: pet.image }} style={styles.image} />
      ) : (
        <View style={[styles.image, styles.imagePlaceholder]}>
          <Text style={styles.placeholderIcon}>🐾</Text>
        </View>
      )}

      <View style={styles.header}>
        <View style={[styles.badge, { backgroundColor: status.color }]}>
          <Text style={styles.badgeText}>{t(status.labelKey)}</Text>
        </View>
        {!!pet.postId && <Text style={styles.postId}>{pet.postId}</Text>}
      </View>

      {/* Tin đã đoàn tụ: báo rõ bằng một dải màu, không chỉ ẩn nút đi */}
      {pet.resolved && (
        <View style={styles.resolvedBanner}>
          <Text style={styles.resolvedIcon}>✓</Text>
          <Text style={styles.resolvedBannerText}>{t('detail.resolvedBanner')}</Text>
        </View>
      )}

      <Text style={styles.title}>{pet.name || pet.breed}</Text>
      <Text style={styles.subtitle}>
        {pet.species} · {pet.breed}
      </Text>

      <View style={styles.infoRow}>
        <InfoBox label={t('detail.color')} value={pet.color} />
        <InfoBox label={t('detail.area')} value={pet.area} />
      </View>

      {!!pet.description && (
        <View style={styles.block}>
          <Text style={styles.blockLabel}>{t('detail.desc')}</Text>
          <Text style={styles.blockText}>{pet.description}</Text>
        </View>
      )}

      <View style={styles.contactBox}>
        <Text style={styles.contactLabel}>{t('detail.contact')}</Text>
        <Text style={styles.contactValue}>{pet.contact}</Text>
      </View>

      {/* Cảnh báo đặt ngay dưới số liên hệ — đúng lúc người ta sắp bấm gọi */}
      <View style={styles.scamBox}>
        <Text style={styles.scamIcon}>⚠</Text>
        <Text style={styles.scamText}>{t('scam.warning')}</Text>
      </View>

      {/*
        Đặc điểm bí mật. Server chỉ trả trường này về cho CHỦ bài — người đăng
        nhập đúng tài khoản, hoặc máy đang giữ mã xác nhận. Khách xem bài không
        bao giờ nhận được, nên không cần kiểm tra quyền ở đây: không có dữ liệu
        thì ô tự không hiện.
      */}
      {!!pet.secretDetail && (
        <View style={styles.secretBox}>
          <Text style={styles.secretLabel}>🔒  {t('secret.yours')}</Text>
          <Text style={styles.secretValue}>{pet.secretDetail}</Text>
          <Text style={styles.secretHint}>{t('secret.howToUse')}</Text>
        </View>
      )}

      <TouchableOpacity style={styles.shareButton} onPress={handleShare} activeOpacity={0.85}>
        <Text style={styles.shareText}>↗  {t('detail.share')}</Text>
      </TouchableOpacity>

      {/* Chỉ hiện khi tin chưa được đánh dấu — đã đoàn tụ rồi thì không lùi lại */}
      {!pet.resolved && (
        <TouchableOpacity
          style={[styles.resolveButton, resolving && styles.buttonDisabled]}
          onPress={handleResolve}
          disabled={resolving}
          activeOpacity={0.85}
        >
          <Text style={styles.resolveText}>
            {t(resolving ? 'detail.resolving' : 'detail.resolve')}
          </Text>
        </TouchableOpacity>
      )}

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.button, styles.buttonOutline]}
          onPress={() => navigation.navigate('Form', { mode: 'edit', pet })}
        >
          <Text style={styles.buttonOutlineText}>{t('detail.edit')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.buttonDanger, deleting && styles.buttonDisabled]}
          onPress={handleDelete}
          disabled={deleting}
        >
          <Text style={styles.buttonDangerText}>{t(deleting ? 'detail.deleting' : 'detail.delete')}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function InfoBox({ label, value }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(themedStyles);
  return (
    <View style={styles.infoBox}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const themedStyles = createThemedStyles((colors, shadow) =>
  StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  notFound: { color: colors.textMuted, fontSize: 15 },

  image: { width: '100%', height: 220, borderRadius: radius.lg, backgroundColor: colors.surface },
  imagePlaceholder: { justifyContent: 'center', alignItems: 'center' },
  placeholderIcon: { fontSize: 56, opacity: 0.3 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
  },
  badge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: radius.full },
  badgeText: { color: colors.onStatus, fontSize: 12, fontWeight: '700' },
  postId: { fontSize: 12, color: colors.textMuted, fontVariant: ['tabular-nums'] },

  title: { fontSize: 24, fontWeight: '700', color: colors.text, marginTop: spacing.md },
  subtitle: { fontSize: 14, color: colors.textMuted, marginTop: 2 },

  infoRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
  infoBox: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md },
  infoLabel: { fontSize: 11, fontWeight: '700', color: colors.textMuted, letterSpacing: 0.5 },
  infoValue: { fontSize: 14, fontWeight: '600', color: colors.text, marginTop: 4 },

  block: { marginTop: spacing.lg },
  blockLabel: { fontSize: 11, fontWeight: '700', color: colors.textMuted, letterSpacing: 0.5 },
  blockText: { fontSize: 14, color: colors.textSoft, lineHeight: 21, marginTop: 6 },

  contactBox: {
    marginTop: spacing.lg,
    backgroundColor: colors.contactBg,
    borderWidth: 1,
    borderColor: colors.contactBorder,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  contactLabel: { fontSize: 11, fontWeight: '700', color: colors.teal, letterSpacing: 0.5 },
  contactValue: { fontSize: 16, fontWeight: '700', color: colors.text, marginTop: 4 },

  scamBox: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md,
    backgroundColor: colors.warnBg,
    borderWidth: 1,
    borderColor: colors.warnBorder,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 11,
  },
  scamIcon: { fontSize: 14, color: colors.warnText, marginTop: 1 },
  scamText: { flex: 1, fontSize: 12.5, color: colors.warnText, lineHeight: 18 },

  secretBox: {
    marginTop: spacing.md,
    backgroundColor: colors.secretBg,
    borderWidth: 1,
    borderColor: colors.secretBorder,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  secretLabel: { fontSize: 11, fontWeight: "700", color: colors.secretText, letterSpacing: 0.4 },
  secretValue: { fontSize: 14, fontWeight: "600", color: colors.text, marginTop: 6 },
  secretHint: { fontSize: 11.5, color: colors.secretText, lineHeight: 17, marginTop: 6 },

  resolvedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    backgroundColor: colors.surfaceTint,
    borderWidth: 1,
    borderColor: colors.sky,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 11,
  },
  resolvedIcon: { fontSize: 15, fontWeight: '800', color: colors.resolved },
  resolvedBannerText: { flex: 1, fontSize: 13, fontWeight: '700', color: colors.resolved },

  shareButton: {
    marginTop: spacing.xl,
    paddingVertical: 14,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
  },
  shareText: { color: colors.textSoft, fontWeight: '700', fontSize: 14 },

  resolveButton: {
    marginTop: spacing.md,
    paddingVertical: 14,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.resolved,
    alignItems: 'center',
  },
  resolveText: { color: colors.resolved, fontWeight: '700', fontSize: 14 },

  actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonOutline: { borderWidth: 2, borderColor: colors.border },
  buttonOutlineText: { color: colors.textSoft, fontWeight: '700', fontSize: 14 },
  buttonDanger: { backgroundColor: colors.danger },
  buttonDangerText: { color: colors.onPrimary, fontWeight: '700', fontSize: 14 },
  buttonDisabled: { opacity: 0.5 },
  }),
);
