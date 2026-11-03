import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as AuthSession from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import * as Facebook from 'expo-auth-session/providers/facebook';
import * as WebBrowser from 'expo-web-browser';
import api, { errorStatus } from '../api';
import {
  FACEBOOK_APP_ID,
  GOOGLE_CLIENT_ID_ANDROID,
  GOOGLE_CLIENT_ID_IOS,
} from '../config';
import { useAuth } from '../context/auth';
import { useLanguage } from '../context/language';
import { createThemedStyles, useTheme, useThemedStyles } from '../context/theme';
import { radius, spacing } from '../theme';

/*
 * Đăng nhập bằng Google hoặc Facebook. Tương đương SocialLogin.vue bên web.
 *
 * APP KHÔNG TỰ XÁC MINH GÌ CẢ.
 *
 * Nó chỉ mở trình duyệt cho người dùng đăng nhập với Google/Facebook, nhận về
 * một "tờ giấy chứng nhận", rồi chuyển thẳng tờ giấy đó lên back-end.
 * Back-end mới là nơi hỏi lại Google xem giấy có thật không.
 *
 * Phải làm vậy vì app nằm trong tay người dùng, ai cũng mở ra sửa được. Tin
 * lời app nói "tôi là user X" thì ai cũng đăng nhập thành ai cũng được.
 */

/*
 * Đóng lại cửa sổ trình duyệt còn sót sau khi quay về app.
 *
 * Trên Android, mở trình duyệt rồi quay lại app đôi khi để lại một tab trống
 * nằm chồng lên. Gọi hàm này một lần lúc nạp file là xong — Expo khuyên đặt
 * ở cấp module chứ không phải trong component, để nó chạy đúng một lần.
 */
WebBrowser.maybeCompleteAuthSession();

export default function SocialLogin() {
  const { t } = useLanguage();
  const { colors } = useTheme();
  const { login } = useAuth();
  const styles = useThemedStyles(themedStyles);

  /*
   * Nhà cung cấp nào đang bật ở back-end.
   *
   * Hỏi máy chủ chứ không tự đoán: bật hay tắt là do biến môi trường bên đó
   * quyết định. Vẽ nút Google ra rồi bấm vào mới báo "chưa cấu hình" là bắt
   * người dùng chịu hậu quả của việc mình lười hỏi.
   */
  const [providers, setProviders] = useState<{
    google: boolean;
    facebook: boolean;
    googleMobile?: { ios: boolean; android: boolean };
  }>({ google: false, facebook: false });
  const [busy, setBusy] = useState<'google' | 'facebook' | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let ignore = false;
    api
      .authProviders()
      .then(({ data }) => {
        if (!ignore) setProviders(data);
      })
      .catch(() => {
        // Không hỏi được thì giấu cả hai nút đi. Thà thiếu một lối đăng nhập
        // còn hơn bày ra một nút bấm vào là lỗi.
      });
    return () => {
      ignore = true;
    };
  }, []);

  /*
   * Google bắt buộc MỖI NỀN TẢNG một mã riêng, không dùng chung mã của web.
   * Hook này tự chọn đúng mã theo máy đang chạy.
   *
   * responseType: 'id_token' là thứ back-end cần — nó là tờ giấy có chữ ký
   * của Google, xác minh lại được. Access token thì không chứa danh tính.
   */
  const [, googleResult, googlePrompt] = Google.useAuthRequest({
    iosClientId: GOOGLE_CLIENT_ID_IOS || undefined,
    androidClientId: GOOGLE_CLIENT_ID_ANDROID || undefined,
    responseType: AuthSession.ResponseType.IdToken,
  });

  const [, facebookResult, facebookPrompt] = Facebook.useAuthRequest({
    clientId: FACEBOOK_APP_ID || undefined,
  });

  /*
   * Kết quả không về theo kiểu await được: hook trả nó qua một biến state ở
   * lần vẽ sau. Nên phải ngồi canh bằng useEffect thay vì viết thẳng vào chỗ
   * bấm nút.
   */
  useEffect(() => {
    if (!googleResult) return;

    if (googleResult.type === 'dismiss' || googleResult.type === 'cancel') {
      setBusy(null);
      setError(t('social.cancelled'));
      return;
    }
    if (googleResult.type !== 'success') {
      setBusy(null);
      setError(t('social.failed'));
      return;
    }

    const credential = googleResult.params.id_token;
    if (!credential) {
      setBusy(null);
      setError(t('social.failed'));
      return;
    }

    api
      .googleLogin({ credential })
      .then(({ data }) => login(data.token, data.user))
      .catch((err) => setError(t(errorStatus(err) === 503 ? 'social.notSetUp' : 'social.failed')))
      .finally(() => setBusy(null));
    // t đổi khi người dùng đổi ngôn ngữ, nhưng không nên chạy lại cả lượt
    // đăng nhập vì chuyện đó. Chỉ canh đúng kết quả trả về.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [googleResult]);

  useEffect(() => {
    if (!facebookResult) return;

    if (facebookResult.type === 'dismiss' || facebookResult.type === 'cancel') {
      setBusy(null);
      setError(t('social.cancelled'));
      return;
    }
    if (facebookResult.type !== 'success') {
      setBusy(null);
      setError(t('social.failed'));
      return;
    }

    const accessToken = facebookResult.authentication?.accessToken;
    if (!accessToken) {
      setBusy(null);
      setError(t('social.failed'));
      return;
    }

    api
      .facebookLogin({ accessToken })
      .then(({ data }) => login(data.token, data.user))
      .catch((err) => setError(t(errorStatus(err) === 503 ? 'social.notSetUp' : 'social.failed')))
      .finally(() => setBusy(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facebookResult]);

  const start = (nha: 'google' | 'facebook') => {
    // Máy này chưa khai mã ứng dụng thì nói thẳng, đừng mở trình duyệt ra để
    // người dùng gặp một trang lỗi của Google.
    const thieuMa =
      nha === 'google' ? !GOOGLE_CLIENT_ID_IOS && !GOOGLE_CLIENT_ID_ANDROID : !FACEBOOK_APP_ID;
    if (thieuMa) {
      setError(t('social.noId'));
      return;
    }

    setError('');
    setBusy(nha);
    (nha === 'google' ? googlePrompt() : facebookPrompt()).catch(() => {
      setBusy(null);
      setError(t('social.failed'));
    });
  };

  /*
   * Google chỉ dùng được khi back-end có mã CHO ĐÚNG NỀN TẢNG NÀY.
   *
   * Thiếu mã iOS thì iPhone bấm vào sẽ bị Google từ chối, dù Android chạy
   * ngon. Hỏi rồi mới vẽ nút, thay vì vẽ ra để người dùng bấm vào gặp lỗi.
   *
   * googleMobile là trường back-end thêm riêng cho mobile. Bản cũ chưa có
   * thì coi như dùng được, để app không tự tắt mất tính năng.
   */
  const coMaNenTang =
    !providers.googleMobile ||
    (Platform.OS === 'ios' ? providers.googleMobile.ios : providers.googleMobile.android);
  const dungDuocGoogle = providers.google && coMaNenTang;

  // Không cái nào dùng được thì không vẽ gì, kể cả dòng kẻ "hoặc".
  if (!dungDuocGoogle && !providers.facebook) return null;

  return (
    <View style={styles.wrap}>
      {/* Dòng kẻ có chữ "hoặc" ở giữa, ngăn cách với phần đăng nhập bằng email */}
      <View style={styles.divider}>
        <View style={styles.line} />
        <Text style={styles.dividerText}>{t('social.or')}</Text>
        <View style={styles.line} />
      </View>

      {dungDuocGoogle && (
        <TouchableOpacity
          style={styles.button}
          onPress={() => start('google')}
          disabled={busy !== null}
          activeOpacity={0.8}
        >
          {busy === 'google' ? (
            <ActivityIndicator size="small" color={colors.textSoft} />
          ) : (
            <Ionicons name="logo-google" size={18} color={colors.textSoft} />
          )}
          <Text style={styles.buttonText}>
            {t(busy === 'google' ? 'social.working' : 'social.google')}
          </Text>
        </TouchableOpacity>
      )}

      {providers.facebook && (
        <TouchableOpacity
          style={styles.button}
          onPress={() => start('facebook')}
          disabled={busy !== null}
          activeOpacity={0.8}
        >
          {busy === 'facebook' ? (
            <ActivityIndicator size="small" color={colors.textSoft} />
          ) : (
            <Ionicons name="logo-facebook" size={18} color={colors.textSoft} />
          )}
          <Text style={styles.buttonText}>
            {t(busy === 'facebook' ? 'social.working' : 'social.facebook')}
          </Text>
        </TouchableOpacity>
      )}

      {!!error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const themedStyles = createThemedStyles((colors) =>
  StyleSheet.create({
    wrap: { marginTop: spacing.xl },

    divider: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      marginBottom: spacing.lg,
    },
    line: { flex: 1, height: 1, backgroundColor: colors.border },
    dividerText: { fontSize: 12, color: colors.textMuted },

    button: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      // 44 là mức tối thiểu cho một vùng chạm trên iOS (Android là 48dp)
      minHeight: 48,
      borderRadius: radius.md,
      borderWidth: 1.5,
      borderColor: colors.borderStrong,
      marginBottom: spacing.md,
    },
    buttonText: { fontSize: 14, fontWeight: '700', color: colors.textSoft },

    error: { fontSize: 12.5, color: colors.danger, marginTop: spacing.xs },
  }),
);
