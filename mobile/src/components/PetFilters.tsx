import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage, type LanguageValue } from '../context/language';
import type { Filters } from '../types';
import { spacing } from '../theme';
import { useTheme } from '../context/theme';

/*
 * Bảng lọc trượt lên từ đáy màn hình.
 *
 * Bên web, bộ lọc nằm ngay trên trang vì màn hình rộng, còn thừa chỗ.
 * Điện thoại hẹp, bày hết ra thì chiếm mất chỗ của danh sách tin — nên gom vào
 * một tấm trượt lên khi cần, dùng xong đẩy xuống.
 *
 * Thành phần này KHÔNG tự gọi API. Nó chỉ nhận lựa chọn hiện tại rồi báo lựa
 * chọn mới về cho HomeScreen qua onApply — ai gọi API thì người đó lo. Tách như
 * vậy để sau này màn khác muốn lọc cũng dùng lại được y nguyên.
 *
 * Cách đóng: nút ✕, nút Back của Android, hoặc hai nút Xoá lọc / Áp dụng.
 *
 * Đã từng làm thêm vuốt-xuống-để-đóng và chạm-nền-để-đóng, nhưng bỏ rồi: cả
 * hai đều không chạy được trên máy thật, mà đã có nút ✕ nhìn thấy rõ thì hai
 * thao tác ẩn kia không đáng để giữ thêm mấy chục dòng dễ hỏng.
 */

// Trạng thái "chưa lọc gì cả". HomeScreen lấy cái này làm giá trị khởi đầu,
// và nút "Xoá lọc" cũng quay về đúng đây.
export const EMPTY_FILTERS: Filters = { species: '', area: '', days: '', sort: 'newest' };

// Đếm xem đang bật mấy điều kiện, để HomeScreen hiện con số nhỏ trên nút Lọc.
// 'newest' là mặc định nên không tính là một điều kiện.
export function countActiveFilters(filters: Filters): number {
  let count = 0;
  if (filters.species) count += 1;
  if (filters.area.trim()) count += 1;
  if (filters.days) count += 1;
  if (filters.sort !== 'newest') count += 1;
  return count;
}

/*
 * value là thứ GỬI LÊN máy chủ, labelKey là thứ HIỆN RA cho người đọc.
 *
 * Phải tách đôi: dữ liệu trong database đang để loài là 'Chó' / 'Mèo' bằng
 * tiếng Việt, nên dù người dùng đang xem giao diện tiếng Anh thì vẫn phải gửi
 * đúng chữ tiếng Việt lên, không thì lọc ra rỗng. Chỉ cái nhãn đổi theo ngôn ngữ.
 */
/** Một lựa chọn trong hàng chip. labelKey để tự dịch, value là thứ gửi lên máy chủ. */
interface ChipOption {
  value: string;
  /**
   * Phải là tên một câu CÓ THẬT trong word.ts.
   *
   * Khai string thì TypeScript cho qua mọi chuỗi, và chip sẽ hiện ra đúng cái
   * tên key thay vì câu chữ — đúng kiểu lỗi mà việc chuyển sang TypeScript
   * sinh ra để chặn.
   */
  labelKey: Parameters<LanguageValue['t']>[0];
}

const SPECIES_OPTIONS: ChipOption[] = [
  { value: '', labelKey: 'filter.allSpecies' },
  { value: 'Chó', labelKey: 'filter.dog' },
  { value: 'Mèo', labelKey: 'filter.cat' },
];

// Gửi lên dưới dạng tham số days — back-end tự quy ra mốc ngày.
const DAYS_OPTIONS: ChipOption[] = [
  { value: '', labelKey: 'filter.days.all' },
  { value: '7', labelKey: 'filter.days.7' },
  { value: '30', labelKey: 'filter.days.30' },
];

const SORT_OPTIONS: ChipOption[] = [
  { value: 'newest', labelKey: 'sort.newest' },
  { value: 'oldest', labelKey: 'sort.oldest' },
];

// Chiều cao tạm cho lần mở đầu tiên, lúc chưa đo được bảng cao bao nhiêu.
const FALLBACK_HEIGHT = 520;

export interface PetFiltersProps {
  visible: boolean;
  /*
   * Màn ngoài đang có câu tìm kiếm hay không.
   *
   * Cần biết vì lúc đó back-end BỎ QUA tham số sort — nó trả về theo thứ
   * hạng khớp, không theo ngày. Vẫn để người dùng bấm "Cũ nhất" thì bấm
   * xong không có gì đổi và không ai giải thích vì sao, nhìn như app hỏng.
   * Bản web khoá đúng chỗ này, mobile làm theo cho khớp.
   */
  searching: boolean;
  /** Bộ lọc đang áp dụng ở màn ngoài. Bảng này sửa trên một bản nháp riêng. */
  value: Filters;
  onClose: () => void;
  onApply: (filters: Filters) => void;
}

export default function PetFilters({
  visible,
  searching,
  value,
  onClose,
  onApply,
}: PetFiltersProps) {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const { colors } = useTheme();

  /*
   * Bản nháp riêng, tách khỏi bộ lọc đang chạy.
   *
   * Người dùng bấm lung tung trong bảng mà danh sách phía sau chưa đổi gì cả —
   * chỉ khi bấm "Áp dụng" mới gửi về. Đóng ngang giữa chừng thì bản nháp bỏ đi,
   * bộ lọc cũ giữ nguyên.
   */
  const [draft, setDraft] = useState(value);

  // Bảng đang bị đẩy xuống bao nhiêu điểm ảnh. 0 là nằm đúng chỗ.
  const translateY = useRef(new Animated.Value(FALLBACK_HEIGHT)).current;

  // Chiều cao thật của bảng, đo được sau lần vẽ đầu tiên.
  const sheetHeight = useRef(FALLBACK_HEIGHT);

  // Mỗi lần mở lại, nạp lại đúng bộ lọc đang chạy và trượt bảng lên.
  useEffect(() => {
    if (!visible) return;

    setDraft(value);
    translateY.setValue(sheetHeight.current);

    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
      // bounciness: 0 -> trượt lên rồi dừng hẳn, không nảy. Bảng to mà nảy
      // trông như bị rung, không chắc chắn.
      bounciness: 0,
      speed: 14,
    }).start();
  }, [visible, value, translateY]);

  /*
   * Trượt bảng xuống rồi mới báo ra ngoài.
   *
   * Gọi onClose() ngay thì Modal biến mất tức khắc, mất hẳn hiệu ứng.
   * Chờ chạy xong hiệu ứng rồi mới gọi thì mắt nhìn thấy nó đi xuống.
   */
  const slideDownThen = (callback: () => void) => {
    Animated.timing(translateY, {
      toValue: sheetHeight.current,
      duration: 220,
      useNativeDriver: true,
    }).start(() => callback());
  };

  const setField = (key: keyof Filters, next: string) =>
    setDraft((prev) => ({ ...prev, [key]: next }));

  return (
    <Modal
      visible={visible}
      transparent
      // animationType="none": tự làm hiệu ứng bằng translateY ở trên, để lúc
      // đóng còn chủ động chờ hiệu ứng chạy xong mới báo ra ngoài.
      animationType="none"
      // Android: trùm lên cả thanh trạng thái, không chừa vệt xám ở đỉnh.
      statusBarTranslucent
      // Android có nút Back vật lý — không bắt thì bấm Back sẽ thoát luôn cả
      // app thay vì chỉ đóng bảng lọc.
      onRequestClose={() => slideDownThen(onClose)}
    >
      {/*
        Màu tối đặt THẲNG trên khung này, không làm thành một lớp riêng.

        Hai lần trước tôi tách ra một lớp phủ riêng rồi dán vào bốn mép khung
        cha — và cả hai lần đều không hiện. Bớt một lớp là bớt một chỗ hỏng:
        khung này chắc chắn cao bằng màn hình (bằng chứng là tấm bảng nằm đúng
        đáy nhờ justifyContent), nên tô màu thẳng lên nó thì không thể trượt.
      */}
      {/*
        BÀN PHÍM CHE MẤT BẢNG LỌC — chỉ xảy ra trên iOS.

        Android tự thu nhỏ cửa sổ lại khi bàn phím bật, nên bảng lọc bị đẩy
        lên trên và vẫn nhìn thấy đủ. iOS KHÔNG làm vậy: bàn phím trượt đè lên
        trên, che mất gần hết bảng, gõ xong không thấy mình gõ gì.

        KeyboardAvoidingView với behavior="padding" chèn thêm một khoảng đệm
        dưới đáy đúng bằng chiều cao bàn phím. Khung này đã có
        justifyContent: flex-end nên bảng lọc tự bị đẩy lên theo.

        Android để undefined, KHÔNG đặt behavior: hệ điều hành đã xử lý rồi,
        đặt thêm là đẩy hai lần, bảng lọc bay lên lưng chừng màn hình.
      */}
      <KeyboardAvoidingView
        className="flex-1 justify-end"
        // scrim không class hoá được: lưu dạng rgba() đã kèm sẵn độ trong suốt
        style={{ backgroundColor: colors.scrim }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Animated.View
          className="rounded-t-[24px] bg-background px-lg pt-lg"
          /*
            Hai thứ này buộc phải ở style, không class hoá được:
              paddingBottom — cộng với vạch Home của máy, mỗi máy một số
              transform    — giá trị hoạt ảnh do Animated giữ, đổi từng khung hình
          */
          style={{ paddingBottom: spacing.lg + insets.bottom, transform: [{ translateY }] }}
          // Đo chiều cao thật để biết phải đẩy xuống bao xa thì khuất hẳn.
          onLayout={(event) => {
            sheetHeight.current = event.nativeEvent.layout.height;
          }}
        >
          <View className="mb-lg flex-row items-center justify-between">
            <Text className="text-[18px] font-extrabold text-text">{t('filter.title')}</Text>

            <TouchableOpacity
              className="h-8 w-8 items-center justify-center rounded-full bg-surface"
              onPress={() => slideDownThen(onClose)}
              activeOpacity={0.7}
              accessibilityLabel={t('filter.close')}
              // Vòng tròn 32x32, nới đều 6 phía cho đủ 44x44. Quanh nó không
              // có nút nào khác nên nới ngang cũng không đụng ai.
              hitSlop={6}
            >
              <Ionicons name="close" size={18} color={colors.textSoft} />
            </TouchableOpacity>
          </View>

          <Field label={t('filter.species')}>
            <ChipGroup
              options={SPECIES_OPTIONS}
              selected={draft.species}
              onSelect={(next) => setField('species', next)}
            />
          </Field>

          <Field label={t('filter.areaLabel')}>
            <TextInput
              className="rounded-md border-[1.5px] border-border-strong bg-background px-md py-[11px] text-[14px] text-text"
              value={draft.area}
              onChangeText={(next) => setField('area', next)}
              placeholder={t('filter.areaPh')}
              placeholderTextColor={colors.textMuted}
              returnKeyType="done"
            />
          </Field>

          <Field label={t('filter.time')}>
            <ChipGroup
              options={DAYS_OPTIONS}
              selected={draft.days}
              onSelect={(next) => setField('days', next)}
            />
          </Field>

          <Field label={t('filter.sort')}>
            {searching ? (
              <Text className="py-1.5 text-[12.5px] leading-[18px] text-text-muted">
                {t('search.sortLocked')}
              </Text>
            ) : (
              <ChipGroup
                options={SORT_OPTIONS}
                selected={draft.sort}
                onSelect={(next) => setField('sort', next)}
              />
            )}
          </Field>

          <View className="mt-xs flex-row gap-md">
            {/*
              Nhãn là "Đóng" / "Exit" nhưng việc nó làm là XOÁ SẠCH BỘ LỌC rồi
              mới đóng — đưa mọi mục về Tất cả / Mọi lúc / Mới nhất và xoá ô
              khu vực. Đây là lựa chọn có chủ ý của người đặt hàng, ghi lại ở
              đây để lần sau đọc code khỏi tưởng là nhầm.

              Muốn đóng mà GIỮ nguyên bộ lọc thì dùng nút ✕ ở góc trên.
            */}
            <TouchableOpacity
              className="min-h-11 flex-1 items-center justify-center rounded-md border-2 border-border-strong"
              onPress={() => slideDownThen(() => onApply(EMPTY_FILTERS))}
              activeOpacity={0.8}
            >
              <Text className="text-[14px] font-bold text-text-soft">{t('filter.clear')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="min-h-11 flex-1 items-center justify-center rounded-md bg-primary"
              onPress={() => slideDownThen(() => onApply(draft))}
              activeOpacity={0.85}
            >
              <Text className="text-[14px] font-bold text-on-primary">{t('filter.apply')}</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// Một nhóm: nhãn chữ nhỏ in hoa, bên dưới là nội dung.
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View className="mb-lg">
      <Text className="mb-sm text-[11px] font-bold tracking-[0.5px] text-text-muted">{label}</Text>
      {children}
    </View>
  );
}

// Hàng nút chọn một-trong-nhiều. Thay cho <select> của web — trên điện thoại
// bấm thẳng vào nút nhanh hơn nhiều so với mở danh sách xổ xuống.
function ChipGroup({
  options,
  selected,
  onSelect,
}: {
  options: ChipOption[];
  selected: string;
  onSelect: (value: string) => void;
}) {
  const { t } = useLanguage();

  return (
    <View className="flex-row flex-wrap gap-sm">
      {options.map((option) => {
        const active = selected === option.value;
        return (
          <TouchableOpacity
            key={option.value || 'any'}
            onPress={() => onSelect(option.value)}
            activeOpacity={0.8}
            // Chip cao 36, nới 4 trên 4 dưới cho đủ 44. Chỉ nới dọc: các chip
            // nằm sát nhau theo hàng ngang, nới ngang là vùng chạm chồng lên
            // nhau, bấm chip này ra chip kia.
            hitSlop={{ top: 5, bottom: 5 }}
            className={`rounded-full border-[1.5px] px-lg py-2 ${
              active ? 'border-primary bg-primary' : 'border-border-strong'
            }`}
          >
            <Text
              className={`text-[13px] font-bold ${active ? 'text-on-primary' : 'text-text-soft'}`}
            >
              {t(option.labelKey)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
