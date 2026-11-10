import { Alert, Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../context/auth';
import { forgetPushToken } from '../notify';
import type { MainTabParamList, RootStackParamList } from '../types';
import { useLanguage } from '../context/language';
import { useTheme } from '../context/theme';
import { spacing } from '../theme';

/*
 * Cài đặt — nơi gom mọi thứ "chỉnh một lần rồi thôi".
 *
 * Trước đây ba nút ngôn ngữ, sáng/tối và tài khoản nằm chen chúc ở thanh đầu
 * trang chủ, chiếm chỗ của logo và slogan. Dọn hết vào đây.
 *
 * Bên web những mục này nằm trong menu avatar trên thanh điều hướng. Điện
 * thoại không có chỗ cho menu xổ xuống, nên làm hẳn một màn riêng — đó cũng
 * là lối quen thuộc của app điện thoại.
 */

const APP_VERSION = '1.0.0';

const LOGO_MARK = require('../../assets/logo-mark.png');
const LOGO_MARK_DARK = require('../../assets/logo-mark-dark.png');

type Props = {
  navigation: NativeStackScreenProps<RootStackParamList>['navigation'] &
    NativeStackScreenProps<MainTabParamList>['navigation'];
};

export default function SettingsScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { t, lang, setLang } = useLanguage();
  const { colors, isDark, scheme, setScheme } = useTheme();
  const { user, isLoggedIn, isAdmin, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert(t('auth.welcome', { name: user?.name || '' }), t('auth.logoutConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('auth.logout'),
        style: 'destructive',
        onPress: () => {
          /*
           * Gỡ máy này khỏi danh sách nhận thông báo TRƯỚC khi đăng xuất.
           *
           * Thứ tự quan trọng: đường /auth/push-token đòi đăng nhập, mà
           * logout() xoá thẻ đăng nhập ngay lập tức. Gọi sau thì lệnh xoá nhận
           * 401 và mã vẫn nằm lại trên server — người dùng tiếp theo đăng nhập
           * trên cùng máy này sẽ nhận thông báo của người trước.
           *
           * KHÔNG chờ nó xong mới đăng xuất: bấm Đăng xuất mà màn hình đứng
           * im chờ mạng là cảm giác app treo. Đăng xuất ngay, lệnh xoá chạy
           * tiếp phía sau — forgetPushToken đã nuốt sẵn mọi lỗi mạng.
           */
          forgetPushToken();
          logout();
        },
      },
    ]);
  };

  return (
    <ScrollView
      className="flex-1 bg-surface"
      // contentContainerStyle chưa nhận className. insets.top là số đo của
      // máy nên dù sao cũng phải tính lúc chạy.
      contentContainerStyle={{
        paddingHorizontal: spacing.lg,
        paddingTop: insets.top + spacing.lg,
        paddingBottom: spacing.xl,
      }}
    >
      <Text className="mb-lg text-2xl font-extrabold tracking-[-0.4px] text-text">
        {t('tab.settings')}
      </Text>

      {/* ---- Tài khoản ---- */}
      <Text className="mt-lg mb-sm text-[11px] font-bold tracking-[0.6px] text-text-muted">{t('settings.account')}</Text>

      {isLoggedIn ? (
        <View className="rounded-lg bg-background p-lg">
          <View className="flex-row items-center">
            {/* Vòng tròn chữ cái đầu, thay cho ảnh đại diện mà app chưa có */}
            <View className="h-[46px] w-[46px] items-center justify-center rounded-full bg-primary">
              <Text className="text-[19px] font-extrabold text-on-primary">
                {(user?.name || '?').trim().charAt(0).toUpperCase()}
              </Text>
            </View>

            <View className="ml-md flex-1">
              <Text className="text-base font-extrabold text-text">{user?.name}</Text>
              <Text className="mt-0.5 text-[12.5px] text-text-muted" numberOfLines={1}>
                {user?.email}
              </Text>
            </View>

            {isAdmin && (
              <View className="rounded-full bg-surface-tint px-2 py-[3px]">
                <Text className="text-[10px] font-extrabold tracking-[0.5px] text-teal-text">
                  ADMIN
                </Text>
              </View>
            )}
          </View>

          {/*
            Lối vào trang quản trị. Giấu với người thường CHỈ để cho gọn mắt —
            chặn thật nằm ở back-end (requireAdmin), nên lộ nút ra cũng không
            vào được.
          */}
          {isAdmin && (
            /* Cùng khuôn với nút Đăng xuất để hai nút xếp thẳng hàng */
            <TouchableOpacity
              className="mt-lg min-h-11 items-center justify-center rounded-md border-[1.5px] border-primary py-3"
              onPress={() => navigation.navigate('Admin')}
              activeOpacity={0.8}
            >
              <Text className="text-[14px] font-bold text-primary">{t('admin.link')}</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            className="mt-lg min-h-11 items-center justify-center rounded-md border-[1.5px] border-border-strong py-3"
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <Text className="text-[14px] font-bold text-danger">{t('auth.logout')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View className="rounded-lg bg-background p-lg">
          <Text className="text-[15px] font-extrabold text-text">{t('auth.guestTitle')}</Text>
          <Text className="mt-1.5 text-[13px] leading-[19px] text-text-muted">
            {t('auth.guestText')}
          </Text>

          <TouchableOpacity
            className="mt-lg min-h-11 items-center justify-center rounded-md bg-primary"
            onPress={() => navigation.navigate('Auth')}
            activeOpacity={0.85}
          >
            <Text className="text-[14px] font-bold text-on-primary">{t('auth.login')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ---- Hiển thị ---- */}
      <Text className="mt-lg mb-sm text-[11px] font-bold tracking-[0.6px] text-text-muted">{t('settings.display')}</Text>

      <View className="rounded-lg bg-background p-lg">
        <Row label={t('settings.language')}>
          <Choice label="Tiếng Việt" active={lang === 'vi'} onPress={() => setLang('vi')} />
          <Choice label="English" active={lang === 'en'} onPress={() => setLang('en')} />
        </Row>

        <View className="my-md h-px bg-border-light" />

        <Row label={t('settings.theme')}>
          <Choice
            label={t('settings.themeLight')}
            active={scheme === 'light'}
            onPress={() => setScheme('light')}
          />
          <Choice
            label={t('settings.themeDark')}
            active={scheme === 'dark'}
            onPress={() => setScheme('dark')}
          />
        </Row>
      </View>

      {/* ---- Trợ giúp ---- */}
      {/*
        Trợ lý dọn từ nút nổi ở trang chủ về đây.

        Nút nổi chỉ là một bóng chat tròn, nhìn vào không biết bấm thì ra gì.
        Đặt vào Cài đặt thành hẳn một mục có tên và có mô tả thì người cần giúp
        đỡ sẽ tìm thấy — vì Cài đặt chính là chỗ người ta mở ra khi bí.
      */}
      {/*
        Một dòng duy nhất dẫn sang màn Liên hệ.

        Trước đây chỗ này là một thẻ lồng thẻ: tiêu đề "Trung tâm trợ giúp",
        bên trong một ô nữa dẫn thẳng vào trợ lý. Nhưng trợ lý chỉ là MỘT
        trong hai kênh — địa chỉ email thì nằm tận cuối trang Chính sách bảo
        mật, chỗ không ai nghĩ tới khi muốn gửi thư. Gom cả hai về màn Liên hệ
        rồi thì ở đây chỉ cần một đường dẫn, cùng kiểu với dòng Chính sách bảo
        mật bên dưới.
      */}
      <Text className="mt-lg mb-sm text-[11px] font-bold tracking-[0.6px] text-text-muted">{t('settings.help')}</Text>

      <TouchableOpacity
        // 44 là mức tối thiểu cho một vùng chạm trên iOS (Android là 48dp)
        className="min-h-[52px] flex-row items-center gap-md rounded-lg bg-background px-md py-sm"
        onPress={() => navigation.navigate('Contact')}
        activeOpacity={0.7}
      >
        <Ionicons name="headset-outline" size={20} color={colors.primary} />

        <View className="flex-1">
          <Text className="text-[14px] font-bold text-text">{t('settings.contact')}</Text>
          <Text className="mt-px text-[12px] text-text-muted">{t('settings.contactSub')}</Text>
        </View>

        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </TouchableOpacity>

      {/* ---- Giới thiệu ---- */}
      <Text className="mt-lg mb-sm text-[11px] font-bold tracking-[0.6px] text-text-muted">{t('settings.about')}</Text>

      {/*
        Chính sách bảo mật đặt ngay trên khối giới thiệu.

        Không phải để cho đủ mục: app xin máy ảnh, thư viện ảnh và vị trí —
        ba quyền nhạy cảm — nên người dùng phải tra được ở đâu đó rằng mỗi
        quyền dùng vào việc gì. Meta cũng bắt buộc có đường dẫn chính sách
        công khai mới cho chuyển ứng dụng Facebook sang chế độ Live.
      */}
      <TouchableOpacity
        // 44 là mức tối thiểu cho một vùng chạm trên iOS (Android là 48dp)
        className="mb-md min-h-[52px] flex-row items-center gap-md rounded-lg bg-background px-md"
        onPress={() => navigation.navigate('Privacy')}
        activeOpacity={0.7}
      >
        <Ionicons name="shield-checkmark-outline" size={20} color={colors.tealText} />
        {/* flex-1 ở chính dòng chữ, không thì mũi tên nằm sát chữ */}
        <Text className="flex-1 text-[14px] font-bold text-text">{t('settings.privacy')}</Text>
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
      </TouchableOpacity>

      <View className="items-center rounded-lg bg-background px-lg py-xl">
        {/* resizeMode không có lớp tiện ích tương đương */}
        <Image
          source={isDark ? LOGO_MARK_DARK : LOGO_MARK}
          className="h-14 w-14"
          style={{ resizeMode: 'contain' }}
        />
        <Text className="mt-sm text-[17px] font-extrabold text-text">LostPets</Text>
        <Text className="mt-[3px] text-[12.5px] text-text-muted">{t('brand.slogan')}</Text>
        <Text className="mt-md text-[11.5px] text-text-muted">
          {t('settings.version')} {APP_VERSION}
        </Text>
      </View>
    </ScrollView>
  );
}

// Một dòng cài đặt: nhãn bên trái, các lựa chọn bên phải.
function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View className="flex-row items-center justify-between">
      <Text className="text-[14px] font-semibold text-text">{label}</Text>
      <View className="flex-row gap-sm">{children}</View>
    </View>
  );
}

function Choice({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      className={`rounded-full border-[1.5px] px-md py-[7px] ${
        active ? 'border-primary bg-primary' : 'border-border-strong'
      }`}
      onPress={onPress}
      // Nút cao 30, nới 7 trên 7 dưới cho đủ 44 (chỉ nới dọc)
      hitSlop={{ top: 7, bottom: 7 }}
      activeOpacity={0.8}
    >
      <Text
        className={`text-[12.5px] font-bold ${active ? 'text-on-primary' : 'text-text-soft'}`}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}
