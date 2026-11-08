import { useCallback, useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import api, { errorStatus } from '../api';
import type { Pet } from '../types';
import claim from '../claim';
import nudge from '../nudge';
import { useLanguage } from '../context/language';
import { useTheme } from '../context/theme';

/*
 * Dải hỏi "tìm được chưa?", nằm trên đầu Trang chủ.
 *
 * Vì sao phải hỏi: cuộc đoàn tụ diễn ra NGOÀI ĐỜI. Không có dữ liệu nào
 * trong hệ thống đổi khi con vật về nhà, nên app không đoán được. Mà người
 * ta đoàn tụ xong là quên app này tồn tại, chứ không phải nút khó bấm.
 *
 * Và đó chính là con số của Objective 4: tỉ lệ tin được đánh dấu đoàn tụ là
 * bằng chứng app có tác dụng thật.
 *
 * Tương đương ResolveNudge.vue bên web, cùng mọi mốc thời gian.
 */

// Tin phải cũ hơn ngần này mới hỏi. Hỏi ngày hôm sau thì vô duyên — người ta
// vừa đăng xong, còn đang tìm.
const ASK_AFTER_DAYS = 7;

// Trả lời "Chưa" thì im bấy nhiêu ngày. Bấm dấu X thì chỉ im một ngày: bấm X
// nghĩa là "không phải bây giờ", khác hẳn "chưa tìm được".
const SNOOZE_NO_DAYS = 7;
const SNOOZE_LATER_DAYS = 1;

// Người đăng nhiều tin thì cũng chỉ dò ngần này, để khỏi bắn một loạt request.
const MAX_CHECKED = 5;

const DAY_MS = 86400000;

export default function ResolveNudge() {
  const { t } = useLanguage();
  const { colors } = useTheme();

  const [pet, setPet] = useState<Pet | null>(null);
  const [saving, setSaving] = useState(false);

  /*
   * Dò xem có tin nào đáng hỏi không.
   *
   * Chạy lúc màn hình được quay lại, nhưng nudge.dueForScan() chặn lại nếu
   * mới dò trong vòng 12 tiếng — nếu không thì mỗi lần bấm Back về Trang chủ
   * lại bắn năm lượt gọi máy chủ.
   */
  const scan = useCallback(async () => {
    if (!(await nudge.dueForScan())) return;

    const mine = (await claim.list()).slice(0, MAX_CHECKED);
    const askable: string[] = [];
    for (const id of mine) {
      if (await nudge.mayAsk(id)) askable.push(id);
    }
    if (askable.length === 0) return;

    await nudge.markScanned();

    const results = await Promise.allSettled(askable.map((id) => api.getPet(id)));
    const open: Pet[] = [];

    results.forEach((result, i) => {
      const id = askable[i];

      if (result.status === 'rejected') {
        /*
         * Tin không còn nữa thì dọn luôn mã trong máy, khỏi dò lại mãi.
         *
         * CHỈ dọn khi máy chủ nói rõ là 404. Mất mạng cũng rơi vào nhánh này,
         * mà xoá mã vì rớt wifi thì người ta mất quyền sửa tin của chính mình
         * — không lấy lại được, vì máy chủ chỉ lưu bản băm của mã.
         */
        if (errorStatus(result.reason) === 404) {
          claim.remove(id);
          nudge.forget(id);
        }
        return;
      }

      const found = result.value.data;
      if (!found || found.resolved) return;
      if (Date.now() - new Date(found.date).getTime() < ASK_AFTER_DAYS * DAY_MS) return;
      open.push(found);
    });

    // Hỏi tin CŨ NHẤT trước: nó treo lâu nhất nên khả năng đã xong là cao nhất.
    open.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    setPet(open[0] ?? null);
  }, []);

  useFocusEffect(
    useCallback(() => {
      scan();
    }, [scan]),
  );

  if (!pet) return null;

  const name = pet.name || pet.breed;
  const days = Math.floor((Date.now() - new Date(pet.date).getTime()) / DAY_MS);

  const markFound = async () => {
    setSaving(true);
    try {
      await api.updatePet(pet._id, { resolved: true }, await claim.get(pet._id));
      await nudge.forget(pet._id);
      setPet(null);
    } catch {
      /*
       * Hỏng thì ĐỂ NGUYÊN dải đó cho họ bấm lại, đừng nuốt mất câu trả lời.
       * Người dùng vừa nói "con vật về rồi" — mất câu đó là mất đúng thứ cả
       * tính năng này sinh ra để thu.
       */
    } finally {
      setSaving(false);
    }
  };

  const snooze = async (days: number) => {
    await nudge.snooze(pet._id, days);
    setPet(null);
  };

  return (
    /*
     * Nền xanh ngọc nhạt: đây là một câu hỏi thân thiện, không phải cảnh báo.
     * Đỏ để dành cho báo cáo tin xấu, vàng cho việc dọn dữ liệu.
     */
    <View className="mx-lg mb-md gap-md rounded-md border-[1.5px] border-teal-text bg-contact-bg p-md">
      <Text className="text-[13px] leading-[19px] text-text">
        {t(pet.type === 'found' ? 'nudge.askFound' : 'nudge.askLost', { name, days })}
      </Text>

      <View className="flex-row items-center gap-sm">
        <TouchableOpacity
          // 44 là mức tối thiểu cho một vùng chạm trên iOS (Android là 48dp)
          className={`min-h-11 flex-1 items-center justify-center rounded-full bg-found ${
            saving ? 'opacity-45' : ''
          }`}
          onPress={markFound}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator size="small" color={colors.onPrimary} />
          ) : (
            <Text className="text-[13.5px] font-extrabold text-on-found">{t('nudge.yes')}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          className={`min-h-11 flex-1 items-center justify-center rounded-full border-[1.5px] border-teal-text ${
            saving ? 'opacity-45' : ''
          }`}
          onPress={() => snooze(SNOOZE_NO_DAYS)}
          disabled={saving}
          activeOpacity={0.7}
        >
          <Text className="text-[13.5px] font-bold text-teal-text">{t('nudge.no')}</Text>
        </TouchableOpacity>

        {/* Dấu X = "để sau", chỉ im một ngày. Nhãn trợ năng nói rõ vì một cái
            X trơ trọi thì trình đọc màn hình chỉ đọc ra "nút". */}
        <TouchableOpacity
          className={`min-h-11 w-9 items-center justify-center ${saving ? 'opacity-45' : ''}`}
          onPress={() => snooze(SNOOZE_LATER_DAYS)}
          disabled={saving}
          accessibilityLabel={t('nudge.later')}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.7}
        >
          <Ionicons name="close" size={18} color={colors.tealText} />
        </TouchableOpacity>
      </View>
    </View>
  );
}
