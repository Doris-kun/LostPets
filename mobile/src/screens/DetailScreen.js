import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api from '../api';
import claim from '../claim';
import { colors, radius, spacing, statusStyle } from '../theme';

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

  const [pet, setPet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

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

  const handleDelete = () => {
    /*
     * React Native KHÔNG có window.confirm() như trình duyệt.
     * Thay bằng Alert.alert() — hộp thoại gốc của hệ điều hành.
     * Nó KHÔNG chặn luồng chạy như confirm(), mà gọi lại qua hàm onPress,
     * nên không viết được kiểu `if (!confirm(...)) return;`.
     */
    Alert.alert('Xoá báo cáo', 'Bạn có chắc muốn xoá tin này?', [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Xoá',
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
              denied ? 'Không xoá được' : 'Lỗi',
              denied
                ? 'Tin này đăng từ máy khác nên máy bạn không giữ mã xác nhận.'
                : 'Xoá không thành công. Thử lại sau.',
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
        <Text style={styles.notFound}>Không tìm thấy thú cưng này.</Text>
      </View>
    );
  }

  const status = statusStyle(pet);

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
          <Text style={styles.badgeText}>{status.label}</Text>
        </View>
        {!!pet.postId && <Text style={styles.postId}>{pet.postId}</Text>}
      </View>

      <Text style={styles.title}>{pet.name || pet.breed}</Text>
      <Text style={styles.subtitle}>
        {pet.species} · {pet.breed}
      </Text>

      <View style={styles.infoRow}>
        <InfoBox label="MÀU LÔNG" value={pet.color} />
        <InfoBox label="KHU VỰC" value={pet.area} />
      </View>

      {!!pet.description && (
        <View style={styles.block}>
          <Text style={styles.blockLabel}>MÔ TẢ</Text>
          <Text style={styles.blockText}>{pet.description}</Text>
        </View>
      )}

      <View style={styles.contactBox}>
        <Text style={styles.contactLabel}>LIÊN HỆ</Text>
        <Text style={styles.contactValue}>{pet.contact}</Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.button, styles.buttonOutline]}
          onPress={() => navigation.navigate('Form', { mode: 'edit', pet })}
        >
          <Text style={styles.buttonOutlineText}>Chỉnh sửa</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.buttonDanger, deleting && styles.buttonDisabled]}
          onPress={handleDelete}
          disabled={deleting}
        >
          <Text style={styles.buttonDangerText}>{deleting ? 'Đang xoá...' : 'Xoá báo cáo'}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function InfoBox({ label, value }) {
  return (
    <View style={styles.infoBox}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
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
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
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
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
    borderRadius: radius.md,
    padding: spacing.md,
  },
  contactLabel: { fontSize: 11, fontWeight: '700', color: colors.teal, letterSpacing: 0.5 },
  contactValue: { fontSize: 16, fontWeight: '700', color: colors.text, marginTop: 4 },

  actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xl },
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
  buttonDangerText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  buttonDisabled: { opacity: 0.5 },
});
