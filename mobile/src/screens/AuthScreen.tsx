import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import type { ComponentProps } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import api, { errorEmail, errorStatus, needsVerification } from '../api';
import SocialLogin from '../components/SocialLogin';
import type { RootStackParamList } from '../types';
import { useAuth } from '../context/auth';
import { useLanguage } from '../context/language';
import { useTheme } from '../context/theme';
import { spacing } from '../theme';

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

type Props = NativeStackScreenProps<RootStackParamList, 'Auth'>;

export default function AuthScreen({ navigation }: Props) {
  const { t } = useLanguage();
  const { colors } = useTheme();
  const { login, isLoggedIn } = useAuth();

  /*
   * ĐĂNG NHẬP XONG THÌ VỀ TRANG CHỦ — mọi lối vào, không riêng một lối.
   *
   * Trước đây câu chuyển màn nằm ngay trong hàm bấm nút đăng nhập bằng email.
   * Nên đăng nhập bằng Google thì phiên đã lưu xong mà màn hình vẫn đứng im
   * ở trang Đăng nhập — người dùng tưởng hỏng rồi bấm lại. Canh vào chính
   * trạng thái phiên thì lối nào cũng ăn: email, Google, Facebook, hay bất
   * cứ cách nào thêm về sau.
   *
   * Về Trang chủ chứ KHÔNG quay lại màn trước. Màn trước là Cài đặt — nơi
   * người ta tình cờ đi qua để bấm nút Đăng nhập, không phải nơi họ muốn
   * tới. Đăng nhập xong việc đầu tiên ai cũng làm là xem tin, nên thả thẳng
   * vào đó.
   *
   * navigate (không phải push) nên Trang chủ vốn đã nằm sẵn dưới đáy chồng
   * màn hình sẽ được dùng lại, và màn Đăng nhập bị gỡ khỏi chồng — bấm nút
   * Back sẽ không quay ngược vào trang đăng nhập nữa.
   *
   * Nhớ lại trạng thái lúc mới mở màn hình, chỉ chuyển khi nó CHUYỂN từ chưa
   * đăng nhập sang đã đăng nhập. Nếu không, lỡ ai mở màn này trong lúc đang
   * đăng nhập sẵn thì nó nhảy đi ngay, nhìn như app giật.
   */
  const daDangNhapTuDau = useRef(isLoggedIn);
  useEffect(() => {
    if (isLoggedIn && !daDangNhapTuDau.current) {
      navigation.navigate('Tabs', { screen: 'Home' });
    }
  }, [isLoggedIn, navigation]);

  // false = đang ở tab Đăng nhập, true = tab Đăng ký
  const [isRegister, setIsRegister] = useState(false);

  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  /*
   * Địa chỉ đang chờ xác minh. Chuỗi rỗng = không có gì chờ.
   *
   * Giữ địa chỉ chứ không giữ một cờ true/false, vì nút "Gửi lại thư" cần
   * đúng địa chỉ đó — và nó đến từ MÁY CHỦ, nơi đã chuẩn hoá chữ thường và
   * cắt khoảng trắng, chứ không phải từ ô nhập.
   */
  const [needVerify, setNeedVerify] = useState('');
  const [resending, setResending] = useState(false);

  const resendVerify = async () => {
    setResending(true);
    try {
      await api.resendVerification({ email: needVerify });
    } catch {
      // Nuốt lỗi và vẫn báo "đã gửi": back-end cố ý trả cùng một câu dù email
      // có tài khoản hay không, để chỗ này không thành công cụ dò. Báo khác đi
      // lúc hỏng là tự phá mất điều đó.
    } finally {
      setResending(false);
      Alert.alert(t('verify.resentTitle'), t('verify.resentText'));
    }
  };

  const update = (key: 'name' | 'email' | 'password', value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  useLayoutEffect(() => {
    navigation.setOptions({ title: t(isRegister ? 'auth.register' : 'auth.login') });
  }, [navigation, isRegister, t]);

  // Đổi tab thì xoá lỗi cũ đi, không để lỗi của tab kia còn nằm đó
  const switchTab = (next: boolean) => {
    if (next === isRegister) return;
    setIsRegister(next);
    setError('');
  };

  const handleSubmit = async () => {
    const name = form.name.trim();
    const email = form.email.trim();
    const { password } = form;

    /*
     * Kiểm tra trước ở máy để báo nhanh, đỡ phải đợi một vòng gọi máy chủ.
     * Back-end vẫn kiểm lại lần nữa — không bao giờ tin dữ liệu từ máy khách.
     *
     * Thiếu ĐÚNG MỘT ô thì gọi thẳng tên ô đó ra, người dùng biết ngay phải
     * sửa chỗ nào. Thiếu từ hai ô trở lên thì quay về câu chung: liệt kê hết
     * ra chỉ dài dòng, mà nhìn vào form cũng thấy ngay là còn trống nhiều.
     */
    // Khai kiểu rõ ràng, nếu không TypeScript đoán là string[] và t() từ chối
    // nhận — t() chỉ ăn tên câu có thật trong word.ts.
    const missing: Parameters<typeof t>[0][] = [];
    if (isRegister && !name) missing.push('auth.err.noName');
    if (!email) missing.push('auth.err.noEmail');
    if (!password) missing.push('auth.err.noPassword');

    if (missing.length > 0) {
      setError(t(missing.length === 1 ? missing[0] : 'auth.err.missing'));
      return;
    }
    if (isRegister && password.length < MIN_PASSWORD) {
      setError(t('auth.err.short'));
      return;
    }

    setSending(true);
    setError('');
    setNeedVerify('');

    try {
      const { data } = isRegister
        ? await api.register({ name, email, password })
        : await api.login({ email, password });

      /*
       * Đăng ký KHÔNG còn chắc chắn trả token.
       *
       * Từ back-end PR #104, đăng ký thành công sẽ gửi thư xác minh rồi trả
       * { verifyRequired, email, message } — không có phiên nào cả. Chỉ khi
       * máy chủ chưa khai thiết lập gửi thư nó mới trả token như cũ.
       *
       * Trước đây chỗ này gọi thẳng login(data.token, data.user). Hậu quả:
       * login(undefined, undefined) -> isLoggedIn thành false -> không điều
       * hướng đi đâu, và người dùng ngồi nhìn nút quay mãi trong khi tài
       * khoản đã được tạo thật.
       *
       * Kiểm cả ba thứ chứ không chỉ verifyRequired: thiếu token hay thiếu
       * user thì cũng không dựng được phiên, dù máy chủ có nói gì đi nữa.
       */
      if (needsVerification(data)) {
        setNeedVerify(data.email || email.trim());
        return;
      }

      // Có đủ phiên — useEffect ở trên thấy phiên đổi sẽ lo phần quay lại.
      // needsVerification đã loại hết trường hợp thiếu, nên hai dấu ! ở đây
      // là nói với TypeScript điều nó không tự suy ra qua lời gọi hàm.
      login(data.token!, data.user!);
    } catch (err) {
      const status = errorStatus(err);

      /*
       * 403 = mật khẩu ĐÚNG nhưng chưa xác minh email.
       *
       * Phải tách hẳn khỏi 401. Trước đây bảng dưới không có 403 nên nó rơi
       * xuống câu mặc định "Không gọi được máy chủ, kiểm tra kết nối" —
       * người dùng gõ đúng mật khẩu mà app bảo họ đi kiểm wifi. Họ sẽ tắt
       * bật mạng chứ không đời nào đoán ra là phải đi mở hộp thư.
       *
       * Thân lỗi có sẵn email nên nút gửi lại không phải đoán.
       */
      if (status === 403) {
        setNeedVerify(errorEmail(err) || email.trim());
        return;
      }

      const byStatus: Record<number, Parameters<typeof t>[0]> = {
        400: isRegister ? 'auth.err.short' : 'auth.err.missing',
        401: 'auth.err.wrong',
        409: 'auth.err.taken',
        429: 'auth.err.tooMany',
        503: 'auth.err.off',
      };

      // status có thể là undefined khi không gọi tới được máy chủ, nên tra
      // bằng ?? 0 — không mã HTTP nào là 0 cả, luôn rơi về câu lỗi mạng.
      setError(t(byStatus[status ?? 0] ?? 'auth.err.network'));
    } finally {
      /*
       * finally chứ không phải đặt trong từng nhánh.
       *
       * Trước đây setSending(false) chỉ nằm trong catch, nên bất kỳ đường nào
       * thoát khỏi try mà không ném lỗi đều để nút quay vĩnh viễn. Đó chính
       * là cách lỗi đăng ký ở trên biểu hiện ra. finally chặn cả lớp lỗi này,
       * không riêng lần này.
       */
      setSending(false);
    }
  };

  return (
    /*
     * KeyboardAvoidingView: bàn phím hiện lên thì đẩy nội dung lên theo.
     * Thiếu nó thì ô Mật khẩu nằm khuất dưới bàn phím, gõ không thấy chữ.
     */
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        // contentContainerStyle chưa nhận className
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xl * 2 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="mb-lg flex-row gap-sm rounded-md bg-surface p-1">
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

        {/*
          Khối "cần xác minh email" — THAY CHỖ của câu lỗi đỏ, không phải thêm
          vào bên cạnh.

          Đây không phải lỗi của người dùng: họ gõ đúng hết, chỉ là còn một
          bước chưa làm. Tô đỏ như lỗi thì họ đi dò lại mật khẩu. Dùng bộ màu
          secret (vàng cam) vì nó mang nghĩa "đọc kỹ chỗ này", đúng vai.
        */}
        {!!needVerify && (
          <View className="mt-md rounded-md border-[1.5px] border-secret-border bg-secret-bg p-md">
            <Text className="text-[13px] font-extrabold text-secret-text">
              {t('verify.blockTitle')}
            </Text>
            <Text className="mt-sm text-[12px] leading-[18px] text-text-soft">
              {t('verify.blockText', { email: needVerify })}
            </Text>

            <TouchableOpacity
              className={`mt-md min-h-11 items-center justify-center rounded-md bg-primary ${
                resending ? 'opacity-50' : ''
              }`}
              onPress={resendVerify}
              disabled={resending}
              activeOpacity={0.85}
            >
              <Text className="text-[13px] font-bold text-on-primary">
                {t(resending ? 'verify.sending' : 'verify.resend')}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {!!error && (
          <Text className="mb-md text-[13px] leading-[19px] text-danger">{error}</Text>
        )}

        <TouchableOpacity
          className={`min-h-[54px] items-center justify-center rounded-md bg-primary py-4 ${
            sending ? 'opacity-60' : ''
          }`}
          onPress={handleSubmit}
          disabled={sending}
          activeOpacity={0.85}
        >
          {sending ? (
            <ActivityIndicator color={colors.onPrimary} />
          ) : (
            <Text className="text-[15px] font-bold text-on-primary">
              {t(isRegister ? 'auth.registerAction' : 'auth.loginAction')}
            </Text>
          )}
        </TouchableOpacity>

        {/*
          Chỉ hiện ở tab Đăng nhập.

          Người đang TẠO tài khoản thì chưa có mật khẩu nào để mà quên — bày
          dòng này ra lúc đó chỉ làm họ phân vân mình có bỏ sót bước nào không.
        */}
        {!isRegister && (
          <TouchableOpacity
            className="mt-md min-h-11 items-center justify-center"
            onPress={() => navigation.navigate('ForgotPassword')}
            activeOpacity={0.7}
          >
            <Text className="text-[13px] font-semibold text-primary">{t('auth.forgot')}</Text>
          </TouchableOpacity>
        )}

        {/*
          Đặt DƯỚI phần email chứ không phải trên.

          Trên web nút mạng xã hội hay nằm trên cùng, nhưng ở đây đăng nhập
          bằng email là cách DUY NHẤT chắc chắn chạy được — hai nút kia còn
          tuỳ back-end có bật không. Để thứ chắc chắn chạy lên trước.
        */}
        <SocialLogin />

        <Text className="mt-lg text-center text-[12.5px] leading-[19px] text-text-muted">
          {t('auth.guestText')}
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Tab({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      // 44 là mức tối thiểu cho một vùng chạm trên iOS (Android là 48dp)
      className={`min-h-11 flex-1 items-center justify-center rounded-sm py-2.5 ${
        active ? 'bg-primary' : ''
      }`}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text
        className={`text-[14px] font-bold ${active ? 'text-on-primary' : 'text-text-soft'}`}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

/*
 * Nhận mọi prop của TextInput, cộng thêm label.
 *
 * ComponentProps<typeof TextInput> lấy thẳng kiểu từ chính TextInput, nên
 * không phải chép tay danh sách prop và cũng không bao giờ lạc hậu.
 */
function Field({ label, ...props }: ComponentProps<typeof TextInput> & { label: string }) {
  const { colors } = useTheme();

  return (
    <View className="mb-lg">
      <Text className="mb-1.5 text-[13px] font-semibold text-text">{label}</Text>
      {/*
        accessibilityLabel lấy luôn chữ đang hiện phía trên.

        Chữ đó KHÔNG tự gắn vào ô nhập — React Native không có <label for>
        như web. Trình đọc màn hình đọc được placeholder, nhưng placeholder
        biến mất ngay khi gõ ký tự đầu tiên, nên người dùng mất luôn manh mối
        mình đang ở ô nào. Đặt trước {...props} để chỗ gọi vẫn ghi đè được.
      */}
      <TextInput
        className="rounded-md border-[1.5px] border-border-strong px-md py-3 text-[15px] text-text"
        placeholderTextColor={colors.textMuted}
        accessibilityLabel={label}
        {...props}
      />
    </View>
  );
}
