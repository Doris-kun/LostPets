import { useEffect, useRef, useState } from 'react';
import api from '../api';
import { useChat, setChatOpen } from '../chat';
import { useI18n } from '../i18n';

const MAX_CHARS = 1000;
// Server chỉ nhận 20 lượt. Cắt bớt phần cũ nhất nhưng luôn giữ lời chào mở đầu.
const MAX_SENT_TURNS = 18;

const SUGGESTION_KEYS = ['chat.s1', 'chat.s2', 'chat.s3'];

export default function ChatWidget() {
  const { t } = useI18n();

  /*
   * Trạng thái mở/đóng nằm ở kho dùng chung (chat.js) chứ không ở đây, để
   * trang Liên hệ mở được hộp chat bằng nút "Hỏi trợ lý" — trang đó không
   * phải cha của component này nên không truyền prop xuống được.
   */
  const { open } = useChat();

  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [messages, setMessages] = useState([]);

  const scrollRef = useRef(null);

  /*
   * Cuộn xuống đáy SAU khi trình duyệt vẽ xong.
   *
   * Gọi ngay sau setMessages thì scrollHeight còn là của lần vẽ trước, cuộn
   * xong vẫn hụt mất tin nhắn mới nhất. requestAnimationFrame thay cho
   * $nextTick của Vue.
   */
  const cuonXuongDay = () => {
    requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
  };

  /*
   * Lời chào và cuộn xuống đáy phải chạy cả khi hộp được mở TỪ NƠI KHÁC,
   * không riêng khi người ta bấm nút tròn ở góc màn hình.
   *
   * Thay cho watch: open(isOpen) của bản Vue.
   */
  useEffect(() => {
    if (!open) return;
    setMessages((cu) => (cu.length === 0 ? [{ role: 'assistant', content: t('chat.greeting') }] : cu));
    cuonXuongDay();
    // t đổi khi người dùng đổi ngôn ngữ; không thêm lời chào lần nữa vì chuyện
    // đó — điều kiện length === 0 ở trên đã chặn, nhưng để t ra ngoài cho rõ ý.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const gui = async (preset) => {
    const text = (preset || draft).trim();
    if (!text || loading) return;

    const moi = [...messages, { role: 'user', content: text.slice(0, MAX_CHARS) }];
    setMessages(moi);
    setDraft('');
    setError('');
    setLoading(true);
    cuonXuongDay();

    try {
      /*
       * Gửi đi bản `moi` chứ không đọc lại state `messages`.
       *
       * setMessages chưa có hiệu lực trong cùng lượt này, nên đọc `messages`
       * ở đây là gửi lịch sử THIẾU chính câu người dùng vừa gõ — trợ lý trả
       * lời câu trước đó.
       */
      const history = moi.slice(-MAX_SENT_TURNS);
      const { data } = await api.chat(history);
      setMessages((cu) => [...cu, { role: 'assistant', content: data.reply }]);
    } catch (err) {
      const status = err.response && err.response.status;
      if (status === 504 || status === 429) setError(t('chat.busy'));
      else if (status === 503) setError(t('chat.off'));
      else setError(t('chat.error'));
    } finally {
      setLoading(false);
      cuonXuongDay();
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end">
      {open && (
        <div className="mb-3 w-[21rem] max-w-[calc(100vw-2.5rem)] bg-card rounded-2xl border border-gray-200 shadow-xl flex flex-col overflow-hidden">
          {/*
            Dải cam→ngọc thì chữ phải là `on-brand`: chữ trắng chỉ được
            2.46:1 ở đầu dải. Chữ phụ cũng KHÔNG làm mờ — để `opacity-90` là
            tụt còn 4.14:1 ở giữa dải, mà 11px vẫn tính là chữ thường.
          */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-brand-orange to-brand-teal text-on-brand">
            <div>
              <p className="text-sm font-bold">{t('chat.title')}</p>
              <p className="text-[11px]">{t('chat.subtitle')}</p>
            </div>
            <button
              type="button"
              onClick={() => setChatOpen(false)}
              aria-label={t('chat.close')}
              className="p-1 rounded-lg hover:bg-card/20 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5 h-80 bg-gray-50">
            {messages.map((m, i) => (
              <div
                // Tin nhắn chỉ thêm vào cuối, không bao giờ chèn giữa hay xoá,
                // nên chỉ số là khoá ổn định ở đây.
                // eslint-disable-next-line react/no-array-index-key
                key={i}
                className={'flex ' + (m.role === 'user' ? 'justify-end' : 'justify-start')}
              >
                <div
                  className={
                    'max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed whitespace-pre-line shadow-sm ' +
                    (m.role === 'user'
                      ? 'bg-primary text-on-primary rounded-br-sm'
                      : 'bg-card text-gray-700 border border-gray-100 rounded-bl-sm')
                  }
                >
                  {m.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-card border border-gray-100 rounded-2xl rounded-bl-sm px-3.5 py-2.5 shadow-sm">
                  <div className="flex gap-1">
                    {[0, 150, 300].map((tre) => (
                      <span
                        key={tre}
                        // Bậc 400, không phải 300: ba chấm này là dấu hiệu duy
                        // nhất cho biết đang chờ trả lời, nên là hình MANG
                        // NGHĨA — ngưỡng 3:1. Bậc 300 chỉ được 1.53:1.
                        className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: `${tre}ms` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {error && <p className="text-xs text-danger text-center px-2">{error}</p>}
          </div>

          {/* Gợi ý sẵn, chỉ hiện khi chưa hỏi gì */}
          {messages.length <= 1 && !loading && (
            <div className="px-3 pb-2 flex flex-wrap gap-1.5 bg-gray-50">
              {SUGGESTION_KEYS.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => gui(t(key))}
                  className="text-[11px] border border-gray-400 bg-card text-gray-600 rounded-full px-2.5 py-1 hover:border-accent hover:text-accent transition-colors"
                >
                  {t(key)}
                </button>
              ))}
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              gui();
            }}
            className="flex items-end gap-2 p-2.5 border-t border-gray-100 bg-card"
          >
            <textarea
              id="draft"
              name="draft"
              rows={1}
              maxLength={MAX_CHARS}
              aria-label={t('chat.placeholder')}
              placeholder={t('chat.placeholder')}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              /*
                Enter để gửi, Shift+Enter để xuống dòng.
                Thay cho @keydown.enter.exact.prevent của Vue — phải tự kiểm
                từng phím bổ trợ, không thì người gõ tiếng Việt bằng bộ gõ
                đang chọn chữ mà bấm Enter là gửi nhầm câu dở.
              */
              onKeyDown={(e) => {
                if (e.key !== 'Enter') return;
                if (e.shiftKey || e.ctrlKey || e.altKey || e.metaKey) return;
                if (e.nativeEvent.isComposing) return;
                e.preventDefault();
                gui();
              }}
              className="flex-1 resize-none border border-gray-400 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
            />
            <button
              type="submit"
              disabled={loading || !draft.trim()}
              aria-label={t('chat.send')}
              className="bg-primary text-on-primary p-2.5 rounded-xl hover:bg-primary-dark disabled:opacity-40 transition-all shrink-0"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                <path d="M3.4 2.6a1 1 0 0 0-1.3 1.2l1.7 5.2H11a1 1 0 1 1 0 2H3.8l-1.7 5.2a1 1 0 0 0 1.3 1.2l14-7a1 1 0 0 0 0-1.8l-14-7z" />
              </svg>
            </button>
          </form>
        </div>
      )}

      {/* Nút tròn mở/đóng */}
      <button
        type="button"
        onClick={() => setChatOpen(!open)}
        aria-label={t('chat.title')}
        aria-expanded={open}
        className="w-14 h-14 rounded-full bg-gradient-to-br from-brand-orange to-brand-teal text-on-brand shadow-lg hover:shadow-xl flex items-center justify-center transition-all"
      >
        {!open ? (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M21 12a8 8 0 0 1-11.6 7.1L3 21l1.9-6.4A8 8 0 1 1 21 12z" />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        )}
      </button>
    </div>
  );
}
