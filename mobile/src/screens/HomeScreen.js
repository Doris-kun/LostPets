import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api from '../api';
import { colors, radius, shadow, spacing, statusStyle } from '../theme';

/*
 * Màn hình danh sách tin — chữ R (Read) trong CRUD.
 *
 * Khác biệt lớn nhất so với web:
 *   <div>  ->  <View>        mọi khối phải là View
 *   <p>    ->  <Text>        MỌI chữ bắt buộc nằm trong <Text>, viết chữ trần
 *                            ra ngoài là app crash ngay
 *   <img>  ->  <Image>       bắt buộc có width/height, không tự co theo ảnh
 *   danh sách -> <FlatList>  thay cho .map(), chỉ vẽ phần đang nhìn thấy nên
 *                            cuộn nhiều tin vẫn mượt
 */

const FILTERS = [
  { value: '', label: 'Tất cả', color: colors.navy },
  { value: 'lost', label: 'Bị mất', color: colors.lost },
  { value: 'found', label: 'Tìm thấy', color: colors.found },
];

// "3 giờ trước" dễ đọc hơn ngày giờ đầy đủ. Quá 30 ngày thì quay về ngày tháng.
function timeAgo(date) {
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Vừa xong';
  if (minutes < 60) return `${minutes} phút trước`;
  if (hours < 24) return `${hours} giờ trước`;
  if (days < 30) return `${days} ngày trước`;
  return new Date(date).toLocaleDateString('vi-VN', { day: 'numeric', month: 'short' });
}

export default function HomeScreen({ navigation }) {
  const [pets, setPets] = useState([]);
  const [total, setTotal] = useState(0);
  const [type, setType] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadPets = useCallback(async (filterType) => {
    try {
      const params = { limit: 50, sort: 'newest' };
      if (filterType) params.type = filterType;

      const { data } = await api.getPets(params);
      setPets(data.pets);
      setTotal(data.total);
      setError('');
    } catch {
      setPets([]);
      setTotal(0);
      setError('Không gọi được máy chủ. Kiểm tra back-end đã chạy chưa và địa chỉ trong src/config.js.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  /*
   * useFocusEffect chạy mỗi khi màn hình được quay lại, khác useEffect chỉ chạy
   * lần đầu. Nhờ vậy đăng tin mới hoặc xoá tin xong, bấm Back về đây là danh
   * sách tự cập nhật — không cần truyền dữ liệu ngược giữa các màn hình.
   */
  useFocusEffect(
    useCallback(() => {
      loadPets(type);
    }, [loadPets, type]),
  );

  const changeFilter = (value) => {
    if (value === type) return;
    setType(value);
    setLoading(true);
  };

  return (
    <View style={styles.container}>
      <Header total={total} loading={loading} error={error} />

      <View style={styles.filterRow}>
        {FILTERS.map((item) => {
          const active = type === item.value;
          return (
            <TouchableOpacity
              key={item.value || 'all'}
              onPress={() => changeFilter(item.value)}
              activeOpacity={0.8}
              style={[
                styles.chip,
                active && { backgroundColor: item.color, borderColor: item.color },
              ]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{item.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.teal} />
        </View>
      ) : (
        <FlatList
          data={pets}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          // Kéo màn hình xuống để tải lại — thao tác quen thuộc trên điện thoại,
          // web không có khái niệm này.
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadPets(type);
              }}
              tintColor={colors.teal}
            />
          }
          ListEmptyComponent={<EmptyState error={error} />}
          renderItem={({ item }) => (
            <PetItem pet={item} onPress={() => navigation.navigate('Detail', { id: item._id })} />
          )}
        />
      )}

      {/* Nút tròn nổi ở góc — kiểu nút quen thuộc trên điện thoại */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('Form', { mode: 'create' })}
        activeOpacity={0.85}
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

function Header({ total, loading, error }) {
  return (
    <View style={styles.header}>
      <Image source={require('../../assets/logo-mark.png')} style={styles.headerLogo} />

      <View style={styles.headerTextBlock}>
        <Text style={styles.headerTitle}>LostPets</Text>
        {/* Slogan — cũng là câu dùng trên web */}
        <Text style={styles.headerSlogan}>Đăng một tin, mở một lối về</Text>
      </View>

      {!loading && !error && (
        <View style={styles.countPill}>
          <Text style={styles.countText}>{total}</Text>
        </View>
      )}
    </View>
  );
}

function PetItem({ pet, onPress }) {
  const status = statusStyle(pet);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      {/* API trả image là CHUỖI RỖNG khi không có ảnh, không phải null */}
      {pet.image ? (
        <Image source={{ uri: pet.image }} style={styles.cardImage} />
      ) : (
        <View style={[styles.cardImage, styles.cardImagePlaceholder]}>
          <Image source={require('../../assets/logo-mark.png')} style={styles.placeholderLogo} />
        </View>
      )}

      <View style={styles.cardBody}>
        <View style={styles.cardTopRow}>
          <View style={[styles.badge, { backgroundColor: status.color }]}>
            <Text style={styles.badgeText}>{status.label}</Text>
          </View>
          <Text style={styles.cardTime}>{timeAgo(pet.date)}</Text>
        </View>

        <Text style={styles.cardTitle} numberOfLines={1}>
          {pet.name || pet.breed}
        </Text>
        <Text style={styles.cardSub} numberOfLines={1}>
          {pet.species} · {pet.breed}
        </Text>

        <View style={styles.cardFooter}>
          <Text style={styles.cardArea} numberOfLines={1}>
            📍 {pet.area}
          </Text>
          {!!pet.postId && <Text style={styles.cardCode}>{pet.postId}</Text>}
        </View>
      </View>
    </TouchableOpacity>
  );
}

function EmptyState({ error }) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIconWrap}>
        <Image source={require('../../assets/logo-mark.png')} style={styles.emptyLogo} />
      </View>
      <Text style={styles.emptyTitle}>{error ? 'Lỗi kết nối' : 'Chưa có tin nào'}</Text>
      <Text style={styles.emptyText}>
        {error || 'Bấm nút + ở góc dưới để đăng tin đầu tiên'}
      </Text>
    </View>
  );
}

/*
 * StyleSheet.create thay cho file CSS.
 *
 * Vài điểm khác CSS trên web:
 *   - flexDirection mặc định là 'column' (web là 'row')
 *   - không có đơn vị: viết 16 chứ không phải '16px'
 *   - tên thuộc tính viết kiểu camelCase: backgroundColor
 *   - không kế thừa: đặt màu chữ ở View cha thì Text con KHÔNG nhận
 */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
  },
  headerLogo: { width: 42, height: 42, resizeMode: 'contain' },
  headerTextBlock: { flex: 1, marginLeft: spacing.md },
  headerTitle: { fontSize: 19, fontWeight: '800', color: colors.navy, letterSpacing: -0.3 },
  headerSlogan: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
  countPill: {
    backgroundColor: colors.surfaceTint,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  countText: { fontSize: 13, fontWeight: '700', color: colors.teal },

  filterRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
  },
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 8,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  chipText: { fontSize: 13, fontWeight: '700', color: colors.textSoft },
  chipTextActive: { color: '#fff' },

  list: { padding: spacing.lg, paddingBottom: 110 },

  card: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    padding: spacing.sm,
    marginBottom: spacing.md,
    ...shadow.card,
  },
  cardImage: { width: 96, height: 96, borderRadius: radius.md, backgroundColor: colors.surfaceTint },
  cardImagePlaceholder: { justifyContent: 'center', alignItems: 'center' },
  placeholderLogo: { width: 52, height: 52, resizeMode: 'contain', opacity: 0.45 },

  cardBody: { flex: 1, paddingLeft: spacing.md, paddingVertical: 2, justifyContent: 'space-between' },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  badge: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: radius.full },
  badgeText: { color: '#fff', fontSize: 10.5, fontWeight: '800' },
  cardTime: { fontSize: 11, color: colors.textMuted },

  cardTitle: { fontSize: 16, fontWeight: '800', color: colors.text, marginTop: 5 },
  cardSub: { fontSize: 12.5, color: colors.textMuted, marginTop: 1 },

  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  cardArea: { flex: 1, fontSize: 12.5, color: colors.textSoft },
  cardCode: { fontSize: 10.5, color: colors.textMuted, marginLeft: spacing.sm },

  empty: { alignItems: 'center', paddingTop: 70, paddingHorizontal: spacing.xl },
  emptyIconWrap: {
    width: 96,
    height: 96,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceTint,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  emptyLogo: { width: 58, height: 58, resizeMode: 'contain', opacity: 0.6 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
  emptyText: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 19,
  },

  fab: {
    position: 'absolute',
    right: spacing.xl,
    bottom: spacing.xl,
    width: 58,
    height: 58,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadow.float,
  },
  fabIcon: { color: '#fff', fontSize: 30, lineHeight: 34, fontWeight: '300' },
});
