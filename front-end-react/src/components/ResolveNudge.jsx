import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api';
import claim from '../claim';
import nudge from '../nudge';
import { useI18n } from '../i18n';
import { showToast } from '../toast';

// Tin phải cũ hơn ngần này mới hỏi. Hỏi ngày hôm sau thì vô duyên — người ta
// vừa đăng xong, còn đang tìm.
const ASK_AFTER_DAYS = 7;
// Trả lời "Chưa" thì im bấy nhiêu ngày. Bấm dấu X thì chỉ im một ngày.
const SNOOZE_NO_DAYS = 7;
const SNOOZE_LATER_DAYS = 1;
// Người đăng nhiều tin thì cũng chỉ dò ngần này, để khỏi bắn một loạt request.
const MAX_CHECKED = 5;

export default function ResolveNudge() {
  const { t } = useI18n();
  // Dải này nằm ở khung chung nên không nhận params trực tiếp; useParams đọc
  // được params của tuyến đường con đang hiện.
  const { id: idDangXem } = useParams();

  const [pet, setPet] = useState(null);
  const [saving, setSaving] = useState(false);

  /*
   * Chốt chặn chạy hai lần.
   *
   * React 19 ở chế độ phát triển chạy effect hai lần. Ở đây hậu quả không
   * phải hỏng mà là LÃNG PHÍ: scan() bắn tới 5 request getPet, chạy hai lần
   * là 10. Mà nudge.markScanned() cũng ghi hai lần.
   *
   * Bản Vue không dính vì created() chỉ chạy một lần.
   */
  const daQuet = useRef(false);

  useEffect(() => {
    if (daQuet.current) return;
    daQuet.current = true;

    let bo = false;

    const quet = async () => {
      if (!nudge.dueForScan()) return;

      const ids = claim.list().slice(0, MAX_CHECKED).filter((id) => nudge.mayAsk(id));
      if (ids.length === 0) return;
      nudge.markScanned();

      const results = await Promise.allSettled(ids.map((id) => api.getPet(id)));
      if (bo) return;

      const open = [];
      results.forEach((result, i) => {
        const id = ids[i];

        if (result.status === 'rejected') {
          /*
           * Tin không còn nữa thì dọn luôn mã trong trình duyệt, khỏi dò lại
           * mãi. CHỈ dọn khi server nói rõ là 404 — mất mạng cũng vào nhánh
           * này, mà xoá mã vì rớt wifi thì người ta mất quyền sửa tin của
           * chính mình.
           */
          const status = result.reason && result.reason.response && result.reason.response.status;
          if (status === 404) {
            claim.remove(id);
            nudge.forget(id);
          }
          return;
        }

        const p = result.value.data;
        if (!p || p.resolved) return;
        if (Date.now() - new Date(p.date).getTime() < ASK_AFTER_DAYS * 86400000) return;
        open.push(p);
      });

      // Hỏi tin cũ nhất trước: nó treo lâu nhất nên khả năng đã xong là cao nhất.
      open.sort((a, b) => new Date(a.date) - new Date(b.date));
      setPet(open[0] || null);
    };

    quet();
    return () => { bo = true; };
  }, []);

  const danhDauDaTim = async () => {
    setSaving(true);
    try {
      await api.updatePet(pet._id, { resolved: true });
      showToast(t('nudge.thanks'));
      setPet(null);
    } catch {
      // Hỏng thì để nguyên dải đó cho họ bấm lại, đừng nuốt mất câu trả lời.
      showToast(t('form.saveError'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const hoan = (soNgay) => {
    nudge.snooze(pet._id, soNgay);
    setPet(null);
  };

  /*
   * Đang đứng ngay trong tin đó thì thôi — trang chi tiết đã có nút riêng,
   * hiện thêm dải này nữa là hỏi cùng một câu hai lần trên một màn hình.
   */
  if (!pet || idDangXem === pet._id) return null;

  const petName = pet.name || pet.breed;
  const ageInDays = Math.floor((Date.now() - new Date(pet.date).getTime()) / 86400000);

  return (
    /*
      Dải hỏi lại, nằm ngay dưới thanh menu. Mỗi lần chỉ hỏi MỘT tin: hỏi dồn
      ba bốn tin một lúc thì người ta bấm bừa cho xong, dữ liệu thu về vô nghĩa.
    */
    <div className="bg-primary-soft border-b border-primary-border">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-center gap-x-3 gap-y-2">
        <p className="text-sm text-gray-900 flex-1 min-w-[15rem]">
          {t(pet.type === 'found' ? 'nudge.askFound' : 'nudge.askLost', {
            name: petName,
            days: ageInDays,
          })}
        </p>

        <button
          type="button"
          onClick={danhDauDaTim}
          disabled={saving}
          className="text-sm font-semibold bg-primary text-on-primary px-3.5 py-1.5 rounded-full hover:bg-primary-dark disabled:opacity-50 transition-colors"
        >
          {saving ? t('nudge.saving') : t('nudge.yes')}
        </button>

        <button
          type="button"
          onClick={() => hoan(SNOOZE_NO_DAYS)}
          disabled={saving}
          className="text-sm font-medium text-primary px-3 py-1.5 rounded-full hover:bg-primary-border disabled:opacity-50 transition-colors"
        >
          {t('nudge.no')}
        </button>

        <button
          type="button"
          onClick={() => hoan(SNOOZE_LATER_DAYS)}
          disabled={saving}
          aria-label={t('nudge.later')}
          className="text-gray-500 hover:text-primary p-1 rounded-full disabled:opacity-50 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
