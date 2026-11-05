import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
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

/*
 * Moi lỗi mỗi nơi để câu mô tả ở một tên khác nhau: Google dùng description,
 * axios dùng message. Gom lại một chỗ thay vì mỗi chỗ bắt lỗi tự mò.
 */
function moTaLoi(err: unknown): string {
  if (typeof err !== 'object' || err === null) return '';
  const o = err as { description?: string; message?: string; code?: string };
  return o.description ?? o.message ?? o.code ?? '';
}

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
  /*
   * Dòng mô tả kỹ thuật kèm theo lỗi, lấy nguyên văn từ Google hoặc back-end.
   *
   * Có vì một câu "Đăng nhập không thành công" không đủ để sửa. Lần dò lỗi
   * vừa rồi mất mấy tiếng chỉ vì không nhìn thấy máy chủ chê cái gì.
   */
  const [detail, setDetail] = useState('');

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
   * CỐ Ý KHÔNG KHAI responseType.
   *
   * Bản trước có khai 'id_token' cho gọn — xin thẳng tờ giấy chứng nhận, khỏi
   * đổi chác. Trên máy thật Google chặn ngay ở trang đăng nhập với "Lỗi 400:
   * invalid_request". Lý do: kiểu xin thẳng đó Google chỉ mở cho mã loại Web.
   * Mã của iOS và Android bắt buộc đi đường hai bước — nhận phiếu trước, đổi
   * phiếu lấy giấy sau — vì app nằm trong tay người dùng nên không được giữ
   * bí mật nào cả.
   *
   * Để trống thì expo-auth-session tự chọn đường hai bước, tự đổi phiếu hộ,
   * rồi đặt kết quả vào đúng chỗ cũ là params.id_token. Nên phần đọc kết quả
   * bên dưới không phải sửa gì.
   */
  const [googleRequest, googleResult, googlePrompt] = Google.useAuthRequest({
    iosClientId: GOOGLE_CLIENT_ID_IOS || undefined,
    androidClientId: GOOGLE_CLIENT_ID_ANDROID || undefined,

    /*
     * TỰ ĐỔI PHIẾU LẤY GIẤY, KHÔNG ĐỂ THƯ VIỆN LÀM HỘ.
     *
     * Để nó tự làm thì nó gọi performAsync(...).then(...) mà KHÔNG có .catch
     * (expo-auth-session/build/providers/Google.js). Nên khi Google từ chối,
     * lỗi rơi vào hư không: kết quả mãi là null, useEffect bên dưới không bao
     * giờ chạy, nút quay "Đang kết nối..." vô tận và không báo gì cả.
     *
     * Đã gặp thật. Tự làm thì bắt được lỗi và nói ra được nó là lỗi gì.
     */
    shouldAutoExchangeCode: false,
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

    /*
     * Google trả về một cái PHIẾU (code), chưa phải giấy chứng nhận. Đổi phiếu
     * lấy giấy ở một địa chỉ khác của Google, kèm code_verifier để chứng minh
     * chính máy này là máy lúc nãy xin phiếu.
     *
     * redirectUri phải GIỐNG HỆT lúc xin phiếu, nếu không Google từ chối. Nên
     * lấy lại từ chính yêu cầu đó thay vì tự dựng lại cho chắc.
     */
    const code = googleResult.params.code;
    const maApp = Platform.OS === 'ios' ? GOOGLE_CLIENT_ID_IOS : GOOGLE_CLIENT_ID_ANDROID;
    if (!code || !googleRequest) {
      setBusy(null);
      setError(t('social.failed'));
      return;
    }

    new AuthSession.AccessTokenRequest({
      clientId: maApp,
      redirectUri: googleRequest.redirectUri,
      code,
      extraParams: { code_verifier: googleRequest.codeVerifier ?? '' },
    })
      .performAsync(Google.discovery)
      .then((ketQua) => {
        const credential = ketQua.idToken;
        if (!credential) throw new Error('Google doi ma xong nhung khong tra ve id_token');
        return api.googleLogin({ credential });
      })
      .then(({ data }) => login(data.token, data.user))
      .catch((err) => {
        setError(t(errorStatus(err) === 503 ? 'social.notSetUp' : 'social.failed'));
        setDetail(moTaLoi(err));
      })
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
      .catch((err) => {
        setError(t(errorStatus(err) === 503 ? 'social.notSetUp' : 'social.failed'));
        setDetail(moTaLoi(err));
      })
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
    setDetail('');
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

  /*
   * TRONG EXPO GO THÌ KHÔNG BAO GIỜ ĐĂNG NHẬP ĐƯỢC — nói thẳng ra.
   *
   * Expo Go không chạy app của mình như một app riêng, nó nạp mã vào trong
   * chính nó. Nên lúc hỏi "app nào đang xin đăng nhập", hệ điều hành trả lời
   * là host.exp.exponent, tức Expo Go, chứ không phải com.lostpets.app.
   * Google đối chiếu với mã Android đã khai thì thấy lệch và chặn ngay, với
   * câu "Lỗi 400: redirect_uri_mismatch".
   *
   * Không có cách nào vá được từ phía app: danh tính đó do hệ điều hành cấp.
   * Vẽ nút ra là chắc chắn đẩy người bấm tới một trang lỗi của Google, nên
   * thay bằng một dòng giải thích.
   *
   * Dùng appOwnership dù nó bị đánh dấu "nên thay bằng executionEnvironment",
   * vì executionEnvironment gộp Expo Go chung với bản development build —
   * mà bản development build thì đăng nhập ĐƯỢC, nó có danh tính riêng. Lấy
   * cái mới sẽ tắt nhầm nút ở chỗ vốn chạy tốt.
   */
  if (Constants.appOwnership === 'expo') {
    return (
      <View style={styles.wrap}>
        <View style={styles.divider}>
          <View style={styles.line} />
          <Text style={styles.dividerText}>{t('social.or')}</Text>
          <View style={styles.line} />
        </View>
        <Text style={styles.note}>{t('social.expoGo')}</Text>
      </View>
    );
  }

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
          style={[styles.button, styles.googleButton]}
          onPress={() => start('google')}
          disabled={busy !== null}
          activeOpacity={0.8}
        >
          {busy === 'google' ? (
            <ActivityIndicator size="small" color={colors.onGoogle} />
          ) : (
            <Ionicons name="logo-google" size={19} color={colors.googleIcon} />
          )}
          <Text style={[styles.buttonText, styles.googleText]}>
            {t(busy === 'google' ? 'social.working' : 'social.google')}
          </Text>
        </TouchableOpacity>
      )}

      {providers.facebook && (
        <TouchableOpacity
          style={[styles.button, styles.facebookButton]}
          onPress={() => start('facebook')}
          disabled={busy !== null}
          activeOpacity={0.8}
        >
          {busy === 'facebook' ? (
            <ActivityIndicator size="small" color={colors.onFacebook} />
          ) : (
            <Ionicons name="logo-facebook" size={19} color={colors.onFacebook} />
          )}
          <Text style={[styles.buttonText, styles.facebookText]}>
            {t(busy === 'facebook' ? 'social.working' : 'social.facebook')}
          </Text>
        </TouchableOpacity>
      )}

      {!!error && <Text style={styles.error}>{error}</Text>}
      {!!detail && <Text style={styles.detail}>{detail}</Text>}
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

    /*
     * Phần dùng chung của hai nút: hình dáng, không màu mè.
     *
     * Trước đây hai nút dùng chung cả màu — cùng nền trong suốt, cùng viền
     * xám, cùng chữ xám nhạt. Nhìn ra hai ô trống giống hệt nhau, phải đọc
     * chữ mới biết cái nào là cái nào. Màu chính là thứ giúp nhận ra nút,
     * nên giờ mỗi bên giữ đúng màu của mình.
     */
    button: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      // 44 là mức tối thiểu cho một vùng chạm trên iOS (Android là 48dp)
      minHeight: 50,
      paddingHorizontal: spacing.lg,
      borderRadius: radius.md,
      marginBottom: spacing.md,
    },

    // Nền trắng, viền xám: đúng bản sáng trong hướng dẫn nút của Google
    googleButton: {
      backgroundColor: colors.googleBg,
      borderWidth: 1.5,
      borderColor: colors.googleBorder,
    },

    // Facebook thì ngược lại: nền đặc một màu, không viền. Nút của họ xưa
    // nay vẫn vậy, và đặt cạnh nút trắng của Google thì tách bạch hẳn.
    facebookButton: { backgroundColor: colors.facebookBg },

    buttonText: { fontSize: 15, fontWeight: '700' },
    googleText: { color: colors.onGoogle },
    facebookText: { color: colors.onFacebook },

    // Dòng báo đang chạy trong Expo Go. Không phải lỗi của người dùng nên
    // để màu chữ mờ, không dùng màu đỏ cảnh báo.
    note: { fontSize: 12.5, lineHeight: 18, color: colors.textMuted },

    error: { fontSize: 12.5, color: colors.danger, marginTop: spacing.xs },

    // Nguyên văn câu máy chủ chê. Chữ nhỏ và mờ vì nó dành cho người sửa
    // lỗi, không phải cho người dùng thường.
    detail: { fontSize: 11.5, lineHeight: 16, color: colors.textMuted, marginTop: 2 },
  }),
);
