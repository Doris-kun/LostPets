import { useLayoutEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import api from '../api';
import { useAuth } from '../context/auth';
import { useLanguage } from '../context/language';
import { createThemedStyles, useTheme, useThemedStyles } from '../context/theme';
import { radius, spacing } from '../theme';

/*
 * Màn đăng nhập và đăng ký — gộp làm một.
 *
 * Web tách đôi thành Login.vue và Register.vue vì có thanh địa chỉ, gõ /login
 * hay /register là tới thẳng. Điện thoại không có thanh địa chỉ, tách đôi thì
 * người dùng phải chuyển màn qua lại chỉ để sửa một lựa chọn — nên gộp lại,
 * đổi bằng hai tab ở đầu màn.
 *
 * Mã xác nhận (claim code) VẪN DÙNG ĐƯỢC song song. Back-end cho sửa/xoá nếu
 * là chủ tài khoản HOẶC cầm đúng mã, nên người ngại đăng ký vẫn đăng bài bình
 * thường như trước.
 */

const MIN_PASSWORD = 6; // khớp với MIN_PASSWORD_LENGTH bên back-end

export default function AuthScreen({ navigation }) {
  const { t } = useLanguage();
  const { colors } = useTheme();
  const styles = useThemedStyles(themedStyles);
  const { login } = useAuth();

  // false = đang ở tab Đăng nhập, true = tab Đăng ký
  const [isRegister, setIsRegister] = useState(false);

  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  useLayoutEffect(() => {
    navigation.setOptions({ title: t(isRegister ? 'auth.register' : 'auth.login') });
  }, [navigation, isRegister, t]);

  // Đổi tab thì xoá lỗi cũ đi, không để lỗi của tab kia còn nằm đó
  const switchTab = (next) => {
    if (next === isRegister) return;
    setIsRegister(next);
    setError('');
  };

  const handleSubmit = async () => {
    const name = form.name.trim();
    const email = form.email.trim();
    const { password } = form;

    // Kiểm tra trước ở máy để báo nhanh, đỡ phải đợi một vòng gọi máy chủ.
    // Back-end vẫn kiểm lại lần nữa — không bao giờ tin dữ liệu từ máy khách.
    if (!email || !password || (isRegister && !name)) {
      setError(t('auth.err.missing'));
      return;
    }
    if (isRegister && password.length < MIN_PASSWORD) {
      setError(t('auth.err.short'));
      return;
    }

    setSending(true);
    setError('');

    try {
      const { data } = isRegister
        ? await api.register({ name, email, password })
        : await api.login({ email, password });

      // data = { token, user }. Cất vào phiên rồi quay lại màn trước.
      login(data.token, data.user);
      navigation.goBack();
    } catch (err) {
      const status = err.response?.status;

      const byStatus = {
        400: isRegister ? 'auth.err.short' : 'auth.err.missing',
        401: 'auth.err.wrong',
        409: 'auth.err.taken',
        429: 'auth.err.tooMany',
        503: 'auth.err.off',
      };

      setError(t(byStatus[status] || 'auth.err.network'));
      setSending(false);
    }
  };

  return (
    /*
     * KeyboardAvoidingView: bàn phím hiện lên thì đẩy nội dung lên theo.
     * Thiếu nó thì ô Mật khẩu nằm khuất dưới bàn phím, gõ không thấy chữ.
     */
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.tabs}>
          <Tab label={t('auth.login')} active={!isRegister} onPress={() => switchTab(false)} />
          <Tab label={t('auth.register')} active={isRegister} onPress={() => switchTab(true)} />
        </View>

        {/* Ô tên chỉ có ở tab Đăng ký */}
        {isRegister && (
          <Field
            label={t('auth.name')}
            value={form.name}
            onChangeText={(v) => update('name', v)}
            placeholder={t('auth.namePh')}
            autoCapitalize="words"
          />
        )}

        <Field
          label={t('auth.email')}
          value={form.email}
          onChangeText={(v) => update('email', v)}
          placeholder={t('auth.emailPh')}
          keyboardType="email-address"
          // Bàn phím điện thoại mặc định viết hoa chữ đầu và tự sửa chính tả.
          // Với email thì cả hai đều phá hỏng những gì người dùng gõ.
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Field
          label={t('auth.password')}
          value={form.password}
          onChangeText={(v) => update('password', v)}
          placeholder={t('auth.passwordPh')}
          secureTextEntry
          autoCapitalize="none"
        />

        {!!error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity
          style={[styles.submit, sending && styles.disabled]}
          onPress={handleSubmit}
          disabled={sending}
          activeOpacity={0.85}
        >
          {sending ? (
            <ActivityIndicator color={colors.onPrimary} />
          ) : (
            <Text style={styles.submitText}>
              {t(isRegister ? 'auth.registerAction' : 'auth.loginAction')}
            </Text>
          )}
        </TouchableOpacity>

        <Text style={styles.note}>{t('auth.guestText')}</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Tab({ label, active, onPress }) {
  const styles = useThemedStyles(themedStyles);

  return (
    <TouchableOpacity
      style={[styles.tab, active && styles.tabActive]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function Field({ label, ...props }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(themedStyles);

  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput style={styles.input} placeholderTextColor={colors.textMuted} {...props} />
    </View>
  );
}

const themedStyles = createThemedStyles((colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },

    tabs: {
      flexDirection: 'row',
      gap: spacing.sm,
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      padding: 4,
      marginBottom: spacing.lg,
    },
    tab: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: radius.sm,
      alignItems: 'center',
    },
    tabActive: { backgroundColor: colors.primary },
    tabText: { fontSize: 14, fontWeight: '700', color: colors.textSoft },
    tabTextActive: { color: colors.onPrimary },

    field: { marginBottom: spacing.lg },
    fieldLabel: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 6 },
    input: {
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: 12,
      fontSize: 15,
      color: colors.text,
    },

    error: {
      fontSize: 13,
      color: colors.danger,
      marginBottom: spacing.md,
      lineHeight: 19,
    },

    submit: {
      backgroundColor: colors.primary,
      paddingVertical: 16,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 54,
    },
    submitText: { color: colors.onPrimary, fontSize: 15, fontWeight: '700' },
    disabled: { opacity: 0.6 },

    note: {
      fontSize: 12.5,
      color: colors.textMuted,
      lineHeight: 19,
      textAlign: 'center',
      marginTop: spacing.lg,
    },
  }),
);
