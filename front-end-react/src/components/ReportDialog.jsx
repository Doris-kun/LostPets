import { useState } from 'react';
import api from '../api';
import report from '../report';
import { useI18n } from '../i18n';

// Phải trùng danh sách enum trong back-end/api/models/reportModel.js.
// Lưu mã chứ không lưu câu tiếng Việt, nên đổi câu chữ không đụng dữ liệu cũ.
const REASONS = ['scam', 'fake_image', 'wrong_contact', 'offensive', 'duplicate', 'other'];

const MAX_NOTE = 500;

/*
 * Hộp báo cáo một tin xấu.
 *
 * onClose nhận một tham số: đã gửi được hay chưa. Chỗ gọi dùng nó để đổi nút
 * "Báo cáo tin này" thành "Đã báo cáo" — bản Vue làm bằng $emit('close', sent).
 */
export default function ReportDialog({ petId, onClose }) {
  const { t } = useI18n();

  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const close = () => {
    if (sending) return;
    onClose(sent);
  };

  const send = async () => {
    if (!reason || sending) return;
    setSending(true);
    setError('');
    try {
      await api.reportPet(petId, { reason, note: note.trim() });
      // Chỉ ghi nhớ khi server đã nhận thật. Ghi trước mà request hỏng thì
      // người ta mất luôn đường báo cáo vì nút đã chuyển sang "đã gửi".
      report.mark(petId);
      setSent(true);
    } catch (err) {
      const status = err.response && err.response.status;
      setError(
        status === 429
          ? t('report.tooMany')
          : (err.response && err.response.data && err.response.data.message) || t('report.failed'),
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1100] flex items-end sm:items-center justify-center">
      {/*
        Lớp phủ mờ. Chạm vào là đóng — nhưng nó là một thẻ div, không phải nút,
        nên trình đọc màn hình không thấy. Đó là CỐ Ý: người dùng bàn phím đã
        có nút Huỷ ngay trong hộp, thêm một vùng bấm vô danh nữa chỉ làm rối.
      */}
      <div className="absolute inset-0 bg-scrim/50 backdrop-blur-sm" onClick={close} aria-hidden="true" />

      <div className="relative bg-card w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-xl p-6 max-h-[90vh] overflow-y-auto">
        {sent ? (
          <div className="text-center py-4">
            <div className="w-12 h-12 rounded-full bg-primary-soft flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="font-bold text-gray-900">{t('report.thanks')}</p>
            <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">{t('report.thanksSub')}</p>
            <button
              type="button"
              onClick={close}
              className="mt-5 w-full bg-gray-900 text-gray-50 rounded-xl py-2.5 text-sm font-semibold hover:bg-gray-800 transition-colors"
            >
              {t('report.done')}
            </button>
          </div>
        ) : (
          <>
            <h3 className="font-bold text-lg text-gray-900">{t('report.title')}</h3>
            <p className="text-sm text-gray-500 mt-1 mb-4 leading-relaxed">{t('report.subtitle')}</p>

            {REASONS.map((r) => (
              <label
                key={r}
                htmlFor={`reason-${r}`}
                className={
                  'flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all mb-1.5 ' +
                  (reason === r ? 'border-accent-border bg-accent-soft' : 'border-gray-100 hover:border-gray-200')
                }
              >
                {/*
                  name dùng chung cho cả nhóm là đúng: đó là cách trình duyệt
                  biết sáu ô này loại trừ nhau. Nhưng id thì phải khác nhau, vì
                  ô này nằm trong vòng lặp — sáu ô cùng một id là HTML không
                  hợp lệ, và nhãn sẽ trỏ nhầm về ô đầu tiên.
                */}
                <input
                  id={`reason-${r}`}
                  name="reason"
                  type="radio"
                  value={r}
                  checked={reason === r}
                  onChange={() => setReason(r)}
                  className="mt-0.5 accent-primary"
                />
                <span className="text-sm text-gray-700 leading-snug">{t(`report.reason.${r}`)}</span>
              </label>
            ))}

            <textarea
              id="note"
              name="note"
              aria-label={t('report.notePlaceholder')}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={MAX_NOTE}
              rows={3}
              placeholder={t('report.notePlaceholder')}
              className="w-full mt-3 border border-gray-400 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary resize-none"
            />

            {error && <p className="text-xs text-danger mt-2">{error}</p>}

            <div className="flex gap-2 mt-4">
              <button
                type="button"
                onClick={close}
                disabled={sending}
                className="flex-1 border border-gray-400 text-gray-600 rounded-xl py-2.5 text-sm font-semibold hover:border-gray-500 disabled:opacity-50 transition-all"
              >
                {t('report.cancel')}
              </button>
              <button
                type="button"
                onClick={send}
                disabled={!reason || sending}
                className="flex-1 bg-danger text-on-danger rounded-xl py-2.5 text-sm font-semibold hover:bg-danger-dark disabled:opacity-40 transition-colors"
              >
                {sending ? t('report.sending') : t('report.send')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
