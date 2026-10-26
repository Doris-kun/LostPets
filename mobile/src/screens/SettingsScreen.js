import { Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/auth';
import { useLanguage } from '../context/language';
import { createThemedStyles, useTheme, useThemedStyles } from '../context/theme';
import { radius, spacing } from '../theme';

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

export default function SettingsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { t, lang, setLang } = useLanguage();
  const { colors, isDark, scheme, setScheme } = useTheme();
  const styles = useThemedStyles(themedStyles);
  const { user, isLoggedIn, isAdmin, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert(t('auth.welcome', { name: user?.name || '' }), t('auth.logoutConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('auth.logout'), style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + spacing.lg, paddingBottom: spacing.xl },
      ]}
    >
      <Text style={styles.screenTitle}>{t('tab.settings')}</Text>

      {/* ---- Tài khoản ---- */}
      <Text style={styles.sectionLabel}>{t('settings.account')}</Text>

      {isLoggedIn ? (
        <View style={styles.card}>
          <View style={styles.accountRow}>
            {/* Vòng tròn chữ cái đầu, thay cho ảnh đại diện mà app chưa có */}
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(user?.name || '?').trim().charAt(0).toUpperCase()}
              </Text>
            </View>

            <View style={styles.accountText}>
              <Text style={styles.accountName}>{user?.name}</Text>
              <Text style={styles.accountEmail} numberOfLines={1}>
                {user?.email}
              </Text>
            </View>

            {isAdmin && (
              <View style={styles.adminTag}>
                <Text style={styles.adminTagText}>ADMIN</Text>
              </View>
            )}
          </View>

          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.8}>
            <Text style={styles.logoutText}>{t('auth.logout')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.guestTitle}>{t('auth.guestTitle')}</Text>
          <Text style={styles.guestText}>{t('auth.guestText')}</Text>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.navigate('Auth')}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryButtonText}>{t('auth.login')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ---- Hiển thị ---- */}
      <Text style={styles.sectionLabel}>{t('settings.display')}</Text>

      <View style={styles.card}>
        <Row label={t('settings.language')}>
          <Choice label="Tiếng Việt" active={lang === 'vi'} onPress={() => setLang('vi')} />
          <Choice label="English" active={lang === 'en'} onPress={() => setLang('en')} />
        </Row>

        <View style={styles.divider} />

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

      {/* ---- Giới thiệu ---- */}
      <Text style={styles.sectionLabel}>{t('settings.about')}</Text>

      <View style={[styles.card, styles.aboutCard]}>
        <Image source={isDark ? LOGO_MARK_DARK : LOGO_MARK} style={styles.aboutLogo} />
        <Text style={styles.aboutName}>LostPets</Text>
        <Text style={styles.aboutSlogan}>{t('brand.slogan')}</Text>
        <Text style={styles.aboutVersion}>
          {t('settings.version')} {APP_VERSION}
        </Text>
      </View>
    </ScrollView>
  );
}

// Một dòng cài đặt: nhãn bên trái, các lựa chọn bên phải.
function Row({ label, children }) {
  const styles = useThemedStyles(themedStyles);

  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.rowChoices}>{children}</View>
    </View>
  );
}

function Choice({ label, active, onPress }) {
  const styles = useThemedStyles(themedStyles);

  return (
    <TouchableOpacity
      style={[styles.choice, active && styles.choiceActive]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={[styles.choiceText, active && styles.choiceTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const themedStyles = createThemedStyles((colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.surface },
    content: { paddingHorizontal: spacing.lg },

    screenTitle: {
      fontSize: 24,
      fontWeight: '800',
      color: colors.text,
      letterSpacing: -0.4,
      marginBottom: spacing.lg,
    },

    sectionLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.textMuted,
      letterSpacing: 0.6,
      marginTop: spacing.lg,
      marginBottom: spacing.sm,
    },

    card: {
      backgroundColor: colors.background,
      borderRadius: radius.lg,
      padding: spacing.lg,
    },

    accountRow: { flexDirection: 'row', alignItems: 'center' },
    avatar: {
      width: 46,
      height: 46,
      borderRadius: radius.full,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    avatarText: { color: colors.onPrimary, fontSize: 19, fontWeight: '800' },
    accountText: { flex: 1, marginLeft: spacing.md },
    accountName: { fontSize: 16, fontWeight: '800', color: colors.text },
    accountEmail: { fontSize: 12.5, color: colors.textMuted, marginTop: 2 },
    adminTag: {
      backgroundColor: colors.surfaceTint,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: radius.full,
    },
    adminTagText: { fontSize: 10, fontWeight: '800', color: colors.teal, letterSpacing: 0.5 },

    logoutButton: {
      marginTop: spacing.lg,
      paddingVertical: 12,
      borderRadius: radius.md,
      borderWidth: 1.5,
      borderColor: colors.border,
      alignItems: 'center',
    },
    logoutText: { fontSize: 14, fontWeight: '700', color: colors.danger },

    guestTitle: { fontSize: 15, fontWeight: '800', color: colors.text },
    guestText: { fontSize: 13, color: colors.textMuted, lineHeight: 19, marginTop: 6 },
    primaryButton: {
      marginTop: spacing.lg,
      backgroundColor: colors.primary,
      paddingVertical: 13,
      borderRadius: radius.md,
      alignItems: 'center',
    },
    primaryButtonText: { color: colors.onPrimary, fontSize: 14, fontWeight: '700' },

    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    rowLabel: { fontSize: 14, fontWeight: '600', color: colors.text },
    rowChoices: { flexDirection: 'row', gap: spacing.sm },
    divider: { height: 1, backgroundColor: colors.borderLight, marginVertical: spacing.md },

    choice: {
      paddingHorizontal: spacing.md,
      paddingVertical: 7,
      borderRadius: radius.full,
      borderWidth: 1.5,
      borderColor: colors.border,
    },
    choiceActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    choiceText: { fontSize: 12.5, fontWeight: '700', color: colors.textSoft },
    choiceTextActive: { color: colors.onPrimary },

    aboutCard: { alignItems: 'center', paddingVertical: spacing.xl },
    aboutLogo: { width: 56, height: 56, resizeMode: 'contain' },
    aboutName: { fontSize: 17, fontWeight: '800', color: colors.text, marginTop: spacing.sm },
    aboutSlogan: { fontSize: 12.5, color: colors.textMuted, marginTop: 3 },
    aboutVersion: { fontSize: 11.5, color: colors.textMuted, marginTop: spacing.md },
  }),
);
