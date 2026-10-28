import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '../context/language';
import { radius, spacing } from '../theme';
import { createThemedStyles, useTheme, useThemedStyles } from '../context/theme';

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
export const EMPTY_FILTERS = { species: '', area: '', days: '', sort: 'newest' };

// Đếm xem đang bật mấy điều kiện, để HomeScreen hiện con số nhỏ trên nút Lọc.
// 'newest' là mặc định nên không tính là một điều kiện.
export function countActiveFilters(filters) {
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
const SPECIES_OPTIONS = [
  { value: '', labelKey: 'filter.allSpecies' },
  { value: 'Chó', labelKey: 'filter.dog' },
  { value: 'Mèo', labelKey: 'filter.cat' },
];

// Gửi lên dưới dạng tham số days — back-end tự quy ra mốc ngày.
const DAYS_OPTIONS = [
  { value: '', labelKey: 'filter.days.all' },
  { value: '7', labelKey: 'filter.days.7' },
  { value: '30', labelKey: 'filter.days.30' },
];

const SORT_OPTIONS = [
  { value: 'newest', labelKey: 'sort.newest' },
  { value: 'oldest', labelKey: 'sort.oldest' },
];

// Chiều cao tạm cho lần mở đầu tiên, lúc chưa đo được bảng cao bao nhiêu.
const FALLBACK_HEIGHT = 520;

export default function PetFilters({ visible, value, onClose, onApply }) {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const { colors } = useTheme();
  const styles = useThemedStyles(themedStyles);

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
  const slideDownThen = (callback) => {
    Animated.timing(translateY, {
      toValue: sheetHeight.current,
      duration: 220,
      useNativeDriver: true,
    }).start(() => callback());
  };

  const setField = (key, next) => setDraft((prev) => ({ ...prev, [key]: next }));

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
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Animated.View
          style={[
            styles.sheet,
            { paddingBottom: spacing.lg + insets.bottom, transform: [{ translateY }] },
          ]}
          // Đo chiều cao thật để biết phải đẩy xuống bao xa thì khuất hẳn.
          onLayout={(event) => {
            sheetHeight.current = event.nativeEvent.layout.height;
          }}
        >
          <View style={styles.titleRow}>
            <Text style={styles.sheetTitle}>{t('filter.title')}</Text>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => slideDownThen(onClose)}
              activeOpacity={0.7}
              accessibilityLabel={t('filter.close')}
            >
              <Text style={styles.closeIcon}>✕</Text>
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
              style={styles.input}
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
            <ChipGroup
              options={SORT_OPTIONS}
              selected={draft.sort}
              onSelect={(next) => setField('sort', next)}
            />
          </Field>

          <View style={styles.actions}>
            {/*
              Nhãn là "Đóng" / "Exit" nhưng việc nó làm là XOÁ SẠCH BỘ LỌC rồi
              mới đóng — đưa mọi mục về Tất cả / Mọi lúc / Mới nhất và xoá ô
              khu vực. Đây là lựa chọn có chủ ý của người đặt hàng, ghi lại ở
              đây để lần sau đọc code khỏi tưởng là nhầm.

              Muốn đóng mà GIỮ nguyên bộ lọc thì dùng nút ✕ ở góc trên.
            */}
            <TouchableOpacity
              style={[styles.button, styles.buttonGhost]}
              onPress={() => slideDownThen(() => onApply(EMPTY_FILTERS))}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonGhostText}>{t('filter.clear')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.buttonPrimary]}
              onPress={() => slideDownThen(() => onApply(draft))}
              activeOpacity={0.85}
            >
              <Text style={styles.buttonPrimaryText}>{t('filter.apply')}</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// Một nhóm: nhãn chữ nhỏ in hoa, bên dưới là nội dung.
function Field({ label, children }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(themedStyles);
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

// Hàng nút chọn một-trong-nhiều. Thay cho <select> của web — trên điện thoại
// bấm thẳng vào nút nhanh hơn nhiều so với mở danh sách xổ xuống.
function ChipGroup({ options, selected, onSelect }) {
  const { t } = useLanguage();
  const { colors } = useTheme();
  const styles = useThemedStyles(themedStyles);

  return (
    <View style={styles.chipRow}>
      {options.map((option) => {
        const active = selected === option.value;
        return (
          <TouchableOpacity
            key={option.value || 'any'}
            onPress={() => onSelect(option.value)}
            activeOpacity={0.8}
            style={[styles.chip, active && styles.chipActive]}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>
              {t(option.labelKey)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const themedStyles = createThemedStyles((colors, shadow) =>
  StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: colors.scrim,
  },

  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },

  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeIcon: { fontSize: 15, fontWeight: '700', color: colors.textSoft, lineHeight: 18 },

  field: { marginBottom: spacing.lg },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },

  chipRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 9,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, fontWeight: '700', color: colors.textSoft },
  chipTextActive: { color: colors.onPrimary },

  input: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 11,
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.background,
  },

  actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xs },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonGhost: { borderWidth: 2, borderColor: colors.border },
  buttonGhostText: { color: colors.textSoft, fontWeight: '700', fontSize: 14 },
  buttonPrimary: { backgroundColor: colors.primary },
  buttonPrimaryText: { color: colors.onPrimary, fontWeight: '700', fontSize: 14 },
  }),
);
