import { useEffect, useState } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLanguage } from '../context/language';
import { createThemedStyles, useTheme, useThemedStyles } from '../context/theme';
import { radius, spacing } from '../theme';

/*
 * Hộp thoại mã xác nhận — lo hai việc trái ngược nhau nhưng cùng một thứ dữ liệu:
 *
 *   mode="show" — vừa đăng bài xong, HIỆN mã ra để người dùng chép lại
 *   mode="ask"  — sửa/xoá bài đăng từ máy khác, XIN mã người dùng gõ vào
 *
 * Gộp một file vì cả hai cùng khung, cùng kiểu chữ, chỉ khác phần giữa. Tách
 * đôi thì phải sửa hai nơi mỗi lần đổi giao diện.
 *
 * -----------------------------------------------------------------------
 * Vì sao không dùng Alert của hệ điều hành
 *
 * Chế độ "show": iOS không cho bôi đen chữ trong Alert, nên mã hiện ra mà
 * không chép được — đọc xong bấm OK là mất vĩnh viễn.
 *
 * Chế độ "ask": Alert.prompt (có ô nhập) CHỈ CÓ trên iOS, Android không có.
 * Dùng nó thì một nửa người dùng không nhập mã được.
 */

export default function ClaimCodeModal({ visible, mode, code, error, onSubmit, onClose }) {
  const { t } = useLanguage();
  const { colors } = useTheme();
  const styles = useThemedStyles(themedStyles);

  const [typed, setTyped] = useState('');

  // Mở lại thì xoá dấu vết lần trước — không để mã cũ hay chữ "Đã sao chép"
  // còn nằm đó gây hiểu nhầm.
  useEffect(() => {
    if (visible) {
      setTyped('');
    }
  }, [visible]);


  const isShow = mode === 'show';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{t(isShow ? 'claim.savedTitle' : 'claim.askTitle')}</Text>

          {isShow ? (
            <>
              {/*
                Mã viết CÁCH ĐỀU từng ký tự và cỡ lớn. Mã gồm cả chữ lẫn số nên
                rất dễ nhìn nhầm 0 với O, 1 với I — giãn ra thì chép tay đỡ sai.
              */}
              <Text style={styles.code} selectable>
                {code}
              </Text>

              {/*
                Không có nút sao chép.

                Chép vào bộ nhớ tạm của CHÍNH máy này thì vô nghĩa: máy đã tự
                lưu mã rồi. Thứ người dùng thật sự cần là mang mã sang máy
                khác — mà bộ nhớ tạm không đi qua máy khác được.

                Nên chỉ hiện mã thật to, giãn ký tự, cho bôi đen được, và nói
                thẳng là hãy chép ra giấy.
              */}
              <Text style={styles.note}>{t('claim.savedText')}</Text>
            </>
          ) : (
            <>
              <Text style={styles.note}>{t('claim.askText')}</Text>

              <TextInput
                style={styles.input}
                value={typed}
                onChangeText={(next) => setTyped(next.toUpperCase())}
                placeholder={t('claim.placeholder')}
                placeholderTextColor={colors.textMuted}
                // Mã toàn chữ in hoa và số, nên tắt hết phần bàn phím tự sửa
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={20}
              />

              {!!error && <Text style={styles.error}>{error}</Text>}

              <TouchableOpacity
                style={[styles.primaryButton, !typed.trim() && styles.disabled]}
                onPress={() => onSubmit(typed.trim())}
                disabled={!typed.trim()}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryButtonText}>{t('claim.submit')}</Text>
              </TouchableOpacity>
            </>
          )}

          {/*
            Ở chế độ hiện mã, đây là nút DUY NHẤT nên phải nổi bật — trước nó
            là chữ xám nhạt, trên nền tối gần như không thấy.
            Ở chế độ nhập mã thì nó chỉ là nút huỷ, để nhạt mới đúng vai.
          */}
          <TouchableOpacity
            style={isShow ? styles.primaryButton : styles.closeButton}
            onPress={onClose}
            activeOpacity={0.85}
          >
            <Text style={isShow ? styles.primaryButtonText : styles.closeText}>
              {t(isShow ? "claim.done" : "common.cancel")}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const themedStyles = createThemedStyles((colors) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.scrim,
      justifyContent: 'center',
      paddingHorizontal: spacing.xl,
    },
    sheet: {
      backgroundColor: colors.background,
      borderRadius: radius.lg,
      padding: spacing.xl,
    },
    title: {
      fontSize: 17,
      fontWeight: '800',
      color: colors.text,
      textAlign: 'center',
    },

    code: {
      fontSize: 26,
      fontWeight: '800',
      color: colors.primary,
      textAlign: 'center',
      letterSpacing: 3,
      marginVertical: spacing.lg,
      // Chữ số cùng bề ngang, nhìn thẳng hàng hơn
      fontVariant: ['tabular-nums'],
    },

    note: {
      fontSize: 12.5,
      color: colors.textMuted,
      lineHeight: 19,
      textAlign: 'center',
      marginTop: spacing.md,
    },

    input: {
      borderWidth: 1.5,
      borderColor: colors.borderStrong,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: 12,
      fontSize: 18,
      fontWeight: '700',
      letterSpacing: 2,
      textAlign: 'center',
      color: colors.text,
      marginTop: spacing.lg,
    },
    error: {
      fontSize: 12.5,
      color: colors.danger,
      textAlign: 'center',
      marginTop: spacing.sm,
    },

    primaryButton: {
      backgroundColor: colors.primary,
      paddingVertical: 13,
      borderRadius: radius.md,
      alignItems: 'center',
      marginTop: spacing.lg,
    },
    primaryButtonText: { color: colors.onPrimary, fontSize: 14, fontWeight: '700' },
    disabled: { opacity: 0.45 },

    closeButton: { alignItems: 'center', marginTop: spacing.md, padding: spacing.sm },
    closeText: { fontSize: 13, fontWeight: '700', color: colors.textMuted },
  }),
);
