import { useEffect, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ReportReason } from '../types';
import { useLanguage } from '../context/language';
import { createThemedStyles, useTheme, useThemedStyles } from '../context/theme';
import { radius, spacing } from '../theme';

/*
 * Hộp thoại báo cáo tin đăng. Tương đương ReportDialog.vue bên web.
 *
 * Hai trạng thái, cùng một khung:
 *   stage="form"   — chọn lý do, viết thêm nếu muốn, bấm Gửi
 *   stage="thanks" — đã gửi xong, chỉ còn nút Đóng
 *
 * Hộp thoại KHÔNG tự gọi máy chủ. Nó chỉ nhận lý do rồi báo lên nơi gọi.
 * Lý do: sau khi gửi thành công còn phải ghi nhớ "tin này đã báo cáo" và đổi
 * nút ngoài màn hình — những việc đó thuộc về màn hình chi tiết, không thuộc
 * về một cái hộp thoại.
 */

/*
 * Sáu lý do, đúng thứ tự này.
 *
 * Mã lý do phải khớp từng chữ với REASONS trong back-end/api/models/
 * reportModel.js — server từ chối thẳng mã lạ. Còn câu chữ hiện ra thì nằm
 * trong word.ts, nên đổi lời hay thêm tiếng Anh không đụng tới dữ liệu đã lưu.
 *
 * Xếp "Lừa đảo" lên đầu vì đó là lý do nguy hiểm nhất và cũng hay gặp nhất;
 * "Lý do khác" xuống cuối vì ai không tìm thấy mục của mình mới chọn tới nó.
 */
const LY_DO: ReportReason[] = [
  'scam',
  'fake_image',
  'wrong_contact',
  'offensive',
  'duplicate',
  'other',
];

// Khớp MAX_NOTE_CHARS bên back-end. Server cắt bớt phần thừa, nhưng chặn sẵn
// ở đây thì người dùng biết trước, không bị mất chữ mà không hiểu vì sao.
const MAX_NOTE = 500;

export interface ReportModalProps {
  visible: boolean;
  /** 'form' = đang chọn lý do. 'thanks' = gửi xong rồi. */
  stage: 'form' | 'thanks';
  sending: boolean;
  /** Câu lỗi hiện dưới ô ghi chú. */
  error?: string;
  onSubmit: (reason: ReportReason, note: string) => void;
  onClose: () => void;
}

export default function ReportModal({
  visible,
  stage,
  sending,
  error,
  onSubmit,
  onClose,
}: ReportModalProps) {
  const { t } = useLanguage();
  const { colors } = useTheme();
  const styles = useThemedStyles(themedStyles);

  const [reason, setReason] = useState<ReportReason | null>(null);
  const [note, setNote] = useState('');

  // Mở lại thì xoá sạch lần trước. Không để lý do cũ nằm sẵn — người dùng dễ
  // bấm Gửi theo quán tính mà không đọc, thành ra báo cáo sai lý do.
  useEffect(() => {
    if (visible) {
      setReason(null);
      setNote('');
    }
  }, [visible]);

  const xong = stage === 'thanks';

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
          {xong ? (
            <>
              <Ionicons
                name="checkmark-circle"
                size={44}
                color={colors.found}
                style={styles.doneIcon}
              />
              <Text style={styles.title}>{t('report.thanks')}</Text>
              <Text style={styles.note}>{t('report.thanksSub')}</Text>

              <TouchableOpacity style={styles.primaryButton} onPress={onClose} activeOpacity={0.85}>
                <Text style={styles.primaryButtonText}>{t('report.done')}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.title}>{t('report.title')}</Text>
              <Text style={styles.note}>{t('report.subtitle')}</Text>

              {/*
                Danh sách lý do có thể dài hơn màn hình khi người dùng phóng
                to cỡ chữ của điện thoại, nên cho cuộn được. Không cuộn thì
                nút Gửi bị đẩy ra ngoài và không ai bấm tới.
              */}
              <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
                {LY_DO.map((ma) => {
                  const chon = reason === ma;
                  return (
                    <TouchableOpacity
                      key={ma}
                      style={[styles.reasonRow, chon && styles.reasonRowOn]}
                      onPress={() => setReason(ma)}
                      activeOpacity={0.7}
                    >
                      {/*
                        Vòng tròn đánh dấu vẽ bằng icon thật, không dùng ký tự
                        như ● hay ○ — có máy Android không có sẵn những ký tự
                        đó trong phông chữ và sẽ hiện ra ô vuông.
                      */}
                      <Ionicons
                        name={chon ? 'radio-button-on' : 'radio-button-off'}
                        size={19}
                        color={chon ? colors.primary : colors.textMuted}
                      />
                      <Text style={[styles.reasonText, chon && styles.reasonTextOn]}>
                        {t(`report.reason.${ma}`)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <TextInput
                style={styles.input}
                value={note}
                onChangeText={setNote}
                placeholder={t('report.notePlaceholder')}
                placeholderTextColor={colors.textMuted}
                multiline
                maxLength={MAX_NOTE}
                textAlignVertical="top"
              />

              {!!error && <Text style={styles.error}>{error}</Text>}

              {/*
                Chưa chọn lý do thì nút mờ đi và không bấm được, thay vì cho
                bấm rồi để máy chủ trả về "Lý do báo cáo không hợp lệ".
              */}
              <TouchableOpacity
                style={[styles.primaryButton, (!reason || sending) && styles.disabled]}
                onPress={() => reason && onSubmit(reason, note.trim())}
                disabled={!reason || sending}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryButtonText}>
                  {t(sending ? 'report.sending' : 'report.send')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.closeButton}
                onPress={onClose}
                disabled={sending}
                activeOpacity={0.7}
              >
                <Text style={styles.closeText}>{t('report.cancel')}</Text>
              </TouchableOpacity>
            </>
          )}
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
      // Chừa chỗ cho thanh trạng thái và bàn phím, không để hộp cao bằng
      // đúng màn hình rồi dính sát hai mép.
      maxHeight: '86%',
    },

    doneIcon: { alignSelf: 'center', marginBottom: spacing.sm },

    title: { fontSize: 17, fontWeight: '800', color: colors.text, textAlign: 'center' },
    note: {
      fontSize: 12.5,
      color: colors.textMuted,
      lineHeight: 19,
      textAlign: 'center',
      marginTop: spacing.sm,
    },

    list: { marginTop: spacing.lg },

    reasonRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      // 44 là mức tối thiểu cho một vùng chạm trên iOS (Android là 48dp)
      minHeight: 48,
      paddingHorizontal: spacing.md,
      borderRadius: radius.md,
      borderWidth: 1.5,
      borderColor: colors.border,
      marginBottom: spacing.sm,
    },
    // Chọn rồi thì đổi CẢ viền lẫn nền, không chỉ đổi cái chấm tròn. Nhìn
    // lướt qua là thấy ngay đang chọn dòng nào mà không phải soi từng chấm.
    reasonRowOn: { borderColor: colors.primary, backgroundColor: colors.surfaceTint },

    reasonText: { flex: 1, fontSize: 13.5, color: colors.textSoft, lineHeight: 19 },
    reasonTextOn: { color: colors.text, fontWeight: '700' },

    input: {
      borderWidth: 1.5,
      borderColor: colors.borderStrong,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: 10,
      fontSize: 13.5,
      lineHeight: 19,
      color: colors.text,
      marginTop: spacing.md,
      minHeight: 72,
    },

    error: { fontSize: 12.5, color: colors.danger, marginTop: spacing.sm },

    primaryButton: {
      backgroundColor: colors.primary,
      minHeight: 48,
      justifyContent: 'center',
      borderRadius: radius.md,
      alignItems: 'center',
      marginTop: spacing.lg,
    },
    primaryButtonText: { color: colors.onPrimary, fontSize: 14, fontWeight: '700' },
    disabled: { opacity: 0.45 },

    closeButton: {
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 44,
      marginTop: spacing.xs,
    },
    closeText: { fontSize: 13, fontWeight: '700', color: colors.textMuted },
  }),
);
