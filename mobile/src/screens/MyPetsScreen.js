import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../api';
import PetCard from '../components/PetCard';
import { useAuth } from '../context/auth';
import { useLanguage } from '../context/language';
import { createThemedStyles, useTheme, useThemedStyles } from '../context/theme';
import { spacing } from '../theme';

/*
 * Bài của tôi — tương đương views/MyPets.vue bên web.
 *
 * Gọi /pets/mine, back-end lọc theo chủ tài khoản lấy từ token. Không truyền
 * id người dùng lên: ai gửi token nào thì server tự biết người đó là ai, nên
 * không ai xem được bài của người khác bằng cách sửa tham số.
 *
 * Chưa đăng nhập thì màn này mời đăng nhập thay vì gọi API rồi nhận 401.
 */

export default function MyPetsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const { colors } = useTheme();
  const styles = useThemedStyles(themedStyles);
  const { isLoggedIn, loading: authLoading } = useAuth();

  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasError, setHasError] = useState(false);

  const loadMine = useCallback(async () => {
    try {
      const { data } = await api.myPets();
      setPets(data.pets);
      setHasError(false);
    } catch {
      setPets([]);
      setHasError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  /*
   * Tải lại mỗi khi quay về tab này — đăng bài mới hoặc xoá bài xong là thấy
   * ngay, không phải tự làm mới.
   *
   * authLoading: lúc app vừa mở, AsyncStorage chưa đọc xong nên chưa biết đã
   * đăng nhập hay chưa. Gọi API lúc đó thì thiếu token -> nhận 401 oan.
   */
  useFocusEffect(
    useCallback(() => {
      if (authLoading) return;

      if (!isLoggedIn) {
        setPets([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      loadMine();
    }, [authLoading, isLoggedIn, loadMine]),
  );

  if (authLoading || loading) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.teal} />
      </View>
    );
  }

  if (!isLoggedIn) {
    return (
      <View style={[styles.center, { paddingTop: insets.top, paddingHorizontal: spacing.xl }]}>
        <Text style={styles.emptyTitle}>{t('auth.guestTitle')}</Text>
        <Text style={styles.emptyText}>{t('auth.guestText')}</Text>

        <Text style={styles.linkButton} onPress={() => navigation.navigate('Auth')}>
          {t('auth.login')}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Text style={styles.title}>{t('mine.title')}</Text>
        {!hasError && <Text style={styles.count}>{t('mine.count', { n: pets.length })}</Text>}
      </View>

      <FlatList
        data={pets}
        keyExtractor={(item) => item._id}
        contentContainerStyle={[styles.list, { paddingBottom: spacing.xl }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadMine();
            }}
            tintColor={colors.teal}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>
              {t(hasError ? 'home.errorTitle' : 'mine.emptyTitle')}
            </Text>
            <Text style={styles.emptyText}>
              {t(hasError ? 'home.errorText' : 'mine.emptyText')}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <PetCard
            pet={item}
            onPress={() => navigation.navigate('Detail', { id: item._id })}
          />
        )}
      />
    </View>
  );
}

const themedStyles = createThemedStyles((colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.surface },
    center: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background,
    },

    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.md,
      backgroundColor: colors.background,
    },
    title: { fontSize: 19, fontWeight: '800', color: colors.text, letterSpacing: -0.3 },
    count: { fontSize: 13, color: colors.textMuted },

    list: { padding: spacing.lg },

    empty: { alignItems: 'center', paddingTop: 70, paddingHorizontal: spacing.xl },
    emptyTitle: { fontSize: 16, fontWeight: '800', color: colors.text, textAlign: 'center' },
    emptyText: {
      fontSize: 13,
      color: colors.textMuted,
      marginTop: 6,
      textAlign: 'center',
      lineHeight: 19,
    },

    linkButton: {
      marginTop: spacing.lg,
      fontSize: 14,
      fontWeight: '700',
      color: colors.primary,
    },
  }),
);
