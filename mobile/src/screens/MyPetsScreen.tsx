import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../api';
import PetCard from '../components/PetCard';
import { useAuth } from '../context/auth';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useLanguage } from '../context/language';
import type { MainTabParamList, Pet, RootStackParamList } from '../types';
import { useTheme } from '../context/theme';
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

/*
 * Màn này nằm trong tab, nhưng lại điều hướng sang Detail và Form vốn thuộc
 * Stack bên ngoài. Nên lấy kiểu navigation của Stack: tab tự chuyển tiếp lên
 * cha khi không tự xử lý được.
 */
type Props = {
  navigation: NativeStackScreenProps<RootStackParamList>['navigation'] &
    NativeStackScreenProps<MainTabParamList>['navigation'];
};

export default function MyPetsScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const { colors } = useTheme();
  const { isLoggedIn, loading: authLoading } = useAuth();

  const [pets, setPets] = useState<Pet[]>([]);
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
      <View
        className="flex-1 items-center justify-center bg-background"
        style={{ paddingTop: insets.top }}
      >
        <ActivityIndicator size="large" color={colors.teal} />
      </View>
    );
  }

  if (!isLoggedIn) {
    return (
      <View
        className="flex-1 items-center justify-center bg-background px-xl"
        style={{ paddingTop: insets.top }}
      >
        <Text className="text-center text-base font-extrabold text-text">
          {t('auth.guestTitle')}
        </Text>
        <Text className="mt-1.5 text-center text-[13px] leading-[19px] text-text-muted">
          {t('auth.guestText')}
        </Text>

        <Text
          className="mt-lg text-[14px] font-bold text-primary"
          onPress={() => navigation.navigate('Auth')}
        >
          {t('auth.login')}
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-surface">
      <View
        className="flex-row items-center justify-between bg-background px-lg pb-md"
        // Chừa chỗ cho tai thỏ: mỗi máy một số, phải đo lúc chạy
        style={{ paddingTop: insets.top + spacing.sm }}
      >
        <Text className="text-[19px] font-extrabold tracking-[-0.3px] text-text">
          {t('mine.title')}
        </Text>
        {!hasError && (
          <Text className="text-[13px] text-text-muted">{t('mine.count', { n: pets.length })}</Text>
        )}
      </View>

      <FlatList
        data={pets}
        keyExtractor={(item) => item._id}
        // contentContainerStyle của FlatList chưa nhận className
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xl }}
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
          <View className="items-center px-xl pt-[70px]">
            <Text className="text-center text-base font-extrabold text-text">
              {t(hasError ? 'home.errorTitle' : 'mine.emptyTitle')}
            </Text>
            <Text className="mt-1.5 text-center text-[13px] leading-[19px] text-text-muted">
              {t(hasError ? 'home.errorText' : 'mine.emptyText')}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <PetCard
            pet={item}
            // Chỉ ở đây mới in mã tin: đây là tin của chính người đang xem,
            // họ cần mã để tra cứu hoặc đọc cho người khác.
            showCode
            onPress={() => navigation.navigate('Detail', { id: item._id })}
          />
        )}
      />
    </View>
  );
}
