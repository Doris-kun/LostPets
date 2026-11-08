import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLanguage } from '../context/language';
import { useTheme } from '../context/theme';

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

export interface ClaimCodeModalProps {
  visible: boolean;
  /** 'show' = khoe mã vừa sinh ra. 'ask' = bắt nhập mã để sửa/xoá. */
  mode: 'show' | 'ask';
  /** Chỉ dùng ở chế độ 'show'. */
  code?: string;
  /** Câu lỗi hiện dưới ô nhập, chế độ 'ask'. */
  error?: string;
  /**
   * Chỉ chế độ 'ask' cần: truyền mã vừa nhập lên cho nơi gọi kiểm tra.
   * Chế độ 'show' chỉ khoe mã rồi đóng, không có gì để gửi đi.
   */
  onSubmit?: (code?: string) => void;
  onClose: () => void;
}

export default function ClaimCodeModal({
  visible,
  mode,
  code,
  error,
  onSubmit,
  onClose,
}: ClaimCodeModalProps) {
  const { t } = useLanguage();
  const { colors } = useTheme();

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
        // scrim là màu DUY NHẤT không class hoá được: nó lưu dạng rgba() đã
        // kèm sẵn độ trong suốt nên không tách thành ba kênh cho Tailwind.
        style={{ backgroundColor: colors.scrim }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View className="rounded-lg bg-background p-xl">
          <Text className="text-center text-[17px] font-extrabold text-text">
            {t(isShow ? 'claim.savedTitle' : 'claim.askTitle')}
          </Text>

          {isShow ? (
            <>
              {/*
                Mã viết CÁCH ĐỀU từng ký tự và cỡ lớn. Mã gồm cả chữ lẫn số nên
                rất dễ nhìn nhầm 0 với O, 1 với I — giãn ra thì chép tay đỡ sai.
              */}
              <Text
                className="my-lg text-center text-[26px] font-extrabold tracking-[3px] text-primary"
                // fontVariant chưa có lớp tiện ích tương đương. Chữ số cùng bề
                // ngang thì mã nhìn thẳng hàng, chép tay đỡ sai.
                style={{ fontVariant: ['tabular-nums'] }}
                selectable
              >
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
              <Text className="mt-md text-center text-[12.5px] leading-[19px] text-text-muted">
                {t('claim.savedText')}
              </Text>
            </>
          ) : (
            <>
              <Text className="mt-md text-center text-[12.5px] leading-[19px] text-text-muted">
                {t('claim.askText')}
              </Text>

              <TextInput
                className="mt-lg rounded-md border-[1.5px] border-border-strong px-md py-3 text-center text-[18px] font-bold tracking-[2px] text-text"
                value={typed}
                onChangeText={(next) => setTyped(next.toUpperCase())}
                placeholder={t('claim.placeholder')}
                placeholderTextColor={colors.textMuted}
                // Mã toàn chữ in hoa và số, nên tắt hết phần bàn phím tự sửa
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={20}
              />

              {!!error && (
                <Text className="mt-sm text-center text-[12.5px] text-danger">{error}</Text>
              )}

              <TouchableOpacity
                className={`mt-lg min-h-11 items-center justify-center rounded-md bg-primary ${
                  !typed.trim() ? 'opacity-45' : ''
                }`}
                onPress={() => onSubmit?.(typed.trim())}
                disabled={!typed.trim()}
                activeOpacity={0.85}
              >
                <Text className="text-[14px] font-bold text-on-primary">{t('claim.submit')}</Text>
              </TouchableOpacity>
            </>
          )}

          {/*
            Ở chế độ hiện mã, đây là nút DUY NHẤT nên phải nổi bật — trước nó
            là chữ xám nhạt, trên nền tối gần như không thấy.
            Ở chế độ nhập mã thì nó chỉ là nút huỷ, để nhạt mới đúng vai.
          */}
          {/*
            min-h-11 nằm ở phần CỐ ĐỊNH của chuỗi, không nằm trong nhánh điều
            kiện. Nhờ vậy cả hai chế độ đều chắc chắn đủ 44pt, và luật 44pt
            cũng đọc được — trước đây nút này viết dạng ba ngôi nên luật chỉ
            đo nhánh đầu rồi bỏ qua nhánh sau.
          */}
          <TouchableOpacity
            className={`mt-md min-h-11 items-center justify-center rounded-md ${
              isShow ? 'bg-primary' : ''
            }`}
            onPress={onClose}
            activeOpacity={0.85}
          >
            <Text
              className={
                isShow
                  ? 'text-[14px] font-bold text-on-primary'
                  : 'text-[13px] font-bold text-text-muted'
              }
            >
              {t(isShow ? 'claim.done' : 'common.cancel')}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
