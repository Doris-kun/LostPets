import { useLayoutEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import api, { errorStatus } from '../api';
import type { RootStackParamList } from '../types';
import { useLanguage } from '../context/language';
import { useTheme } from '../context/theme';

/*
 * Quên mật khẩu — tương đương ForgotPassword.vue và ResetPassword.vue bên web.
 *
 * MỘT MÀN, HAI BƯỚC
 *
 * Bên web là hai trang vì web có thanh địa chỉ: gõ /reset-password?token=...
 * là tới thẳng trang thứ hai. Trên điện thoại không có thanh địa chỉ, và hai
 * bước này không bao giờ xuất hiện cùng lúc — hoặc người dùng vừa bấm "Quên
 * mật khẩu", hoặc họ vừa bấm đường dẫn trong thư. Nên một màn với hai dạng là
 * đủ, và đỡ một file.
 *
 * Có token (mở từ đường dẫn trong thư) -> ô đặt mật khẩu mới.
 * Không có token                       -> ô nhập email.
 */

const MIN_PASSWORD = 6; // khớp với MIN_PASSWORD_LENGTH bên back-end

type Props = NativeStackScreenProps<RootStackParamList, 'ForgotPassword'>;

export default function ForgotPasswordScreen({ navigation, route }: Props) {
  const { t } = useLanguage();
  const { colors } = useTheme();

  const token = route.params?.token;
  const isReset = !!token;

  useLayoutEffect(() => {
    navigation.setOptions({ title: t(isReset ? 'forgot.resetTitle' : 'forgot.title') });
  }, [navigation, t, isReset]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  /*
   * Đã gửi xong hay chưa.
   *
   * Gửi xong thì THAY HẲN cái form bằng một câu, không để nguyên ô và thêm
   * dòng báo bên dưới: người dùng nhìn thấy ô nhập còn đó rất dễ bấm Gửi lần
   * nữa, mà back-end có bộ đếm chặn — bấm vài lần là bị khoá, trong khi lá
   * thư đầu tiên vẫn đang trên đường tới.
   */
  const [sent, setSent] = useState(false);

  const askLink = async () => {
    const value = email.trim();
    if (!value) {
      setError(t('auth.err.noEmail'));
      return;
    }

    setBusy(true);
    setError('');
    try {
      await api.forgotPassword({ email: value });
      setSent(true);
    } catch (err) {
      /*
       * 503 = máy chủ chưa khai báo phần gửi thư.
       *
       * Tách riêng vì đây KHÔNG phải lỗi của người dùng, mà họ lại là người
       * đứng nhìn. Gộp vào "có lỗi xảy ra" thì họ thử lại mãi một việc không
       * bao giờ chạy được.
       */
      setError(t(errorStatus(err) === 503 ? 'forgot.err.off' : 'forgot.err.failed'));
    } finally {
      setBusy(false);
    }
  };

  const savePassword = async () => {
    if (password.length < MIN_PASSWORD) {
      setError(t('auth.err.short'));
      return;
    }

    setBusy(true);
    setError('');
    try {
      await api.resetPassword({ token: token as string, password });
      setSent(true);
    } catch (err) {
      // 400 = đường dẫn hết hạn hoặc đã dùng rồi. Back-end cho mỗi đường dẫn
      // sống một lần: dùng xong là xoá, nên bấm lại link cũ sẽ rơi vào đây.
      setError(t(errorStatus(err) === 400 ? 'forgot.err.expired' : 'forgot.err.failed'));
    } finally {
      setBusy(false);
    }
  };

  /* ---- Xong việc: thay hẳn form bằng một câu ---- */
  if (sent) {
    return (
      <ScrollView className="flex-1 bg-background" contentContainerClassName="p-lg">
        <View className="items-center pt-xl">
          <View className="h-16 w-16 items-center justify-center rounded-full bg-surface-tint">
            <Ionicons name="checkmark" size={30} color={colors.resolved} />
          </View>

          <Text className="mt-lg text-center text-[16px] font-extrabold text-text">
            {t(isReset ? 'forgot.doneTitle' : 'forgot.sentTitle')}
          </Text>
          <Text className="mt-sm text-center text-[13px] leading-[20px] text-text-soft">
            {t(isReset ? 'forgot.doneText' : 'forgot.sentText')}
          </Text>

          <TouchableOpacity
            className="mt-lg min-h-11 items-center justify-center rounded-md bg-primary px-lg"
            onPress={() => navigation.navigate('Auth')}
            activeOpacity={0.85}
          >
            <Text className="text-[14px] font-bold text-on-primary">{t('auth.loginAction')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerClassName="p-lg" keyboardShouldPersistTaps="handled">
        <Text className="text-[13.5px] leading-[21px] text-text-soft">
          {t(isReset ? 'forgot.resetIntro' : 'forgot.intro')}
        </Text>

        <Text className="mb-1.5 mt-lg text-[13px] font-semibold text-text">
          {t(isReset ? 'auth.password' : 'auth.email')}
        </Text>

        {isReset ? (
          <TextInput
            className="rounded-md border border-border-strong px-md py-[11px] text-[14px] text-text"
            value={password}
            onChangeText={setPassword}
            placeholder={t('auth.passwordPh')}
            accessibilityLabel={t('auth.password')}
            placeholderTextColor={colors.textMuted}
            secureTextEntry
            autoCapitalize="none"
          />
        ) : (
          <TextInput
            className="rounded-md border border-border-strong px-md py-[11px] text-[14px] text-text"
            value={email}
            onChangeText={setEmail}
            placeholder={t('auth.emailPh')}
            accessibilityLabel={t('auth.email')}
            placeholderTextColor={colors.textMuted}
            keyboardType="email-address"
            // Email không bao giờ viết hoa chữ đầu, mà iOS thì tự viết hoa —
            // hỏng chuỗi ngay từ ký tự đầu tiên.
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="send"
            onSubmitEditing={askLink}
          />
        )}

        {!!error && <Text className="mt-sm text-[12.5px] text-danger">{error}</Text>}

        <TouchableOpacity
          className={`mt-lg min-h-11 items-center justify-center rounded-md bg-primary py-3 ${
            busy ? 'opacity-50' : ''
          }`}
          onPress={isReset ? savePassword : askLink}
          disabled={busy}
          activeOpacity={0.85}
        >
          {busy ? (
            <ActivityIndicator color={colors.onPrimary} size="small" />
          ) : (
            <Text className="text-[14px] font-bold text-on-primary">
              {t(isReset ? 'forgot.saveAction' : 'forgot.sendAction')}
            </Text>
          )}
        </TouchableOpacity>

        {/*
          Nói trước rằng câu trả lời sẽ GIỐNG NHAU dù email có tài khoản hay
          không. Back-end cố ý vậy để trang này không thành công cụ dò xem ai
          có tài khoản. Không nói trước thì người gõ nhầm email ngồi chờ mãi
          một lá thư không bao giờ tới mà tưởng mình gõ đúng.
        */}
        {!isReset && (
          <Text className="mt-lg text-center text-[11.5px] leading-[17px] text-text-muted">
            {t('forgot.note')}
          </Text>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
