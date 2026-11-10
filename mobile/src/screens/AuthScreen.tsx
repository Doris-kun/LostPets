import { useEffect, useLayoutEffect, useRef, useState } from 'react';
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
import type { ComponentProps } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import api, { errorStatus } from '../api';
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

    try {
      const { data } = isRegister
        ? await api.register({ name, email, password })
        : await api.login({ email, password });

      // data = { token, user }. Cất vào phiên là xong — useEffect ở trên
      // thấy phiên đổi sẽ lo phần quay lại màn trước.
      login(data.token, data.user);
    } catch (err) {
      const status = errorStatus(err);

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
      <TextInput
        className="rounded-md border-[1.5px] border-border-strong px-md py-3 text-[15px] text-text"
        placeholderTextColor={colors.textMuted}
        {...props}
      />
    </View>
  );
}
