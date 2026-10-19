import { useToast } from '../context/ToastContext.jsx';

/*
 * Hộp thông báo nổi ở giữa đáy màn hình.
 *
 * Dịch từ Vue: src/components/Toast.vue
 *
 * File này CHỈ lo việc vẽ. Nội dung và lúc nào hiện/ẩn do ToastContext.jsx quyết định.
 * Muốn bật thông báo, component khác gọi: showToast('Đã lưu!') hoặc showToast('Lỗi', 'error').
 */

export default function Toast() {
  const { toast } = useToast();
  const isError = toast.type === 'error';

  /*
   * Hiệu ứng vào/ra.
   *
   * Vue có sẵn <transition name="toast"> + CSS .toast-enter / .toast-leave-to:
   * Vue tự thêm/gỡ class đúng lúc, và GIỮ phần tử lại trên DOM cho tới khi
   * animation thoát chạy xong mới xoá.
   *
   * React không có cơ chế đó. Nếu viết {toast.show && <div>...</div>} thì lúc ẩn
   * phần tử bị gỡ khỏi DOM ngay lập tức -> mất hẳn animation thoát, giật cục.
   *
   * Cách làm ở đây: LUÔN giữ thẻ div trên DOM, chỉ đổi opacity + vị trí.
   * Nhờ vậy cả lúc hiện lẫn lúc ẩn đều có animation mượt.
   */
  const animation = toast.show
    ? 'opacity-100 translate-y-0 scale-100'
    : 'opacity-0 translate-y-4 scale-95 pointer-events-none';

  return (
    <div
      /*
       * aria-live: báo cho trình đọc màn hình đọc nội dung mới lên khi nó đổi,
       * vì người khiếm thị không "nhìn thấy" cái hộp vừa trượt lên.
       * Bản Vue thiếu phần này.
       */
      aria-live="polite"
      role="status"
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5
        px-5 py-3 rounded-2xl shadow-2xl text-sm font-semibold whitespace-nowrap
        transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]
        ${isError ? 'bg-rose-500 text-white' : 'bg-gray-900 text-white'}
        ${animation}`}
    >
      {isError ? (
        // Icon dấu chấm than — lỗi
        <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
            clipRule="evenodd"
          />
        </svg>
      ) : (
        // Icon dấu tick — thành công
        <svg
          className="w-4 h-4 text-emerald-400 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
        </svg>
      )}
      {toast.message}
    </div>
  );
}
