import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ReportReason } from '../types';
import { useLanguage } from '../context/language';
import { useTheme } from '../context/theme';

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
      {/*
        Android tự thu nhỏ cửa sổ khi bàn phím bật nên hộp thoại vẫn nhìn đủ.
        iOS KHÔNG làm vậy: bàn phím trượt đè lên trên, che mất danh sách lý do
        lẫn nút Gửi — gõ xong không còn thấy nút đâu mà bấm.

        behavior="padding" chèn một khoảng đệm dưới đáy đúng bằng chiều cao
        bàn phím, khung này căn giữa nên hộp thoại tự co lại và lên theo.

        Android để undefined, KHÔNG đặt behavior: hệ điều hành đã lo rồi, đặt
        thêm là đẩy hai lần. Giống hệt cách PetFilters.tsx đang làm.
      */}
      <KeyboardAvoidingView
        className="flex-1 justify-center px-xl"
        // scrim không class hoá được: nó lưu dạng rgba() đã kèm sẵn độ trong
        // suốt nên không tách thành ba kênh cho Tailwind.
        style={{ backgroundColor: colors.scrim }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* max-h-[86%] chừa chỗ cho thanh trạng thái và bàn phím, không để
            hộp cao bằng đúng màn hình rồi dính sát hai mép. */}
        <View className="max-h-[86%] rounded-lg bg-background p-xl">
          {xong ? (
            <>
              <Ionicons
                name="checkmark-circle"
                size={44}
                color={colors.found}
                // style chứ không className: Ionicons là component của thư viện
                // ngoài, không chắc nó chuyển className thành style. Dùng style thì
                // chắc chắn ăn, và chỗ này chỉ có đúng một thẻ.
                style={{ alignSelf: 'center', marginBottom: 8 }}
              />
              <Text className="text-center text-[17px] font-extrabold text-text">
                {t('report.thanks')}
              </Text>
              <Text className="mt-sm text-center text-[12.5px] leading-[19px] text-text-muted">
                {t('report.thanksSub')}
              </Text>

              <TouchableOpacity
                className="mt-lg min-h-12 items-center justify-center rounded-md bg-primary"
                onPress={onClose}
                activeOpacity={0.85}
              >
                <Text className="text-[14px] font-bold text-on-primary">{t('report.done')}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text className="text-center text-[17px] font-extrabold text-text">
                {t('report.title')}
              </Text>
              <Text className="mt-sm text-center text-[12.5px] leading-[19px] text-text-muted">
                {t('report.subtitle')}
              </Text>

              {/*
                Danh sách lý do có thể dài hơn màn hình khi người dùng phóng
                to cỡ chữ của điện thoại, nên cho cuộn được. Không cuộn thì
                nút Gửi bị đẩy ra ngoài và không ai bấm tới.
              */}
              <ScrollView className="mt-lg" keyboardShouldPersistTaps="handled">
                {LY_DO.map((ma) => {
                  const chon = reason === ma;
                  return (
                    <TouchableOpacity
                      key={ma}
                      /*
                        Chọn rồi thì đổi CẢ viền lẫn nền, không chỉ đổi cái
                        chấm tròn. Nhìn lướt qua là thấy ngay đang chọn dòng
                        nào mà không phải soi từng chấm.

                        min-h-12 = 48, nằm ở phần cố định của chuỗi nên luật
                        44pt đọc được dù hai nhánh màu khác nhau.
                      */
                      className={`mb-sm min-h-12 flex-row items-center gap-md rounded-md border-[1.5px] px-md ${
                        chon ? 'border-primary bg-surface-tint' : 'border-border'
                      }`}
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
                      <Text
                        className={`flex-1 text-[13.5px] leading-[19px] ${
                          chon ? 'font-bold text-text' : 'text-text-soft'
                        }`}
                      >
                        {t(`report.reason.${ma}`)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <TextInput
                className="mt-md min-h-[72px] rounded-md border-[1.5px] border-border-strong px-md py-2.5 text-[13.5px] leading-[19px] text-text"
                value={note}
                onChangeText={setNote}
                placeholder={t('report.notePlaceholder')}
                placeholderTextColor={colors.textMuted}
                multiline
                maxLength={MAX_NOTE}
                textAlignVertical="top"
              />

              {!!error && (
                <Text className="mt-sm text-[12.5px] text-danger">{error}</Text>
              )}

              {/*
                Chưa chọn lý do thì nút mờ đi và không bấm được, thay vì cho
                bấm rồi để máy chủ trả về "Lý do báo cáo không hợp lệ".
              */}
              <TouchableOpacity
                className={`mt-lg min-h-12 items-center justify-center rounded-md bg-primary ${
                  !reason || sending ? 'opacity-45' : ''
                }`}
                onPress={() => reason && onSubmit(reason, note.trim())}
                disabled={!reason || sending}
                activeOpacity={0.85}
              >
                <Text className="text-[14px] font-bold text-on-primary">
                  {t(sending ? 'report.sending' : 'report.send')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="mt-xs min-h-11 items-center justify-center"
                onPress={onClose}
                disabled={sending}
                activeOpacity={0.7}
              >
                <Text className="text-[13px] font-bold text-text-muted">{t('report.cancel')}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
