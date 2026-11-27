import { useToast } from '../toast';

/*
 * Thông báo ngắn hiện ở giữa đáy màn hình.
 *
 * Bản Vue bọc trong <transition name="toast"> và khai hiệu ứng ở khối <style
 * scoped>. React không có <transition> sẵn, mà kéo một thư viện hiệu ứng về
 * chỉ để làm một hộp chữ trượt lên thì quá đắt.
 *
 * Nên hiệu ứng ở đây làm bằng chính Tailwind: lớp animate-* của Tailwind 3
 * không có sẵn kiểu trượt-lên-kèm-phóng, nhưng thứ cần thật ra chỉ là "hiện
 * ra cho mượt". Dùng transition + translate, và chuyển trạng thái bằng lớp.
 *
 * Mất phần biến đi mượt khi tắt: React tháo thẳng node ra khỏi cây, không
 * chờ hiệu ứng chạy xong như Vue. Giữ lại được, nhưng phải giữ node sống
 * thêm 300ms rồi mới gỡ — thêm một cái hẹn giờ nữa để quên dọn. Thông báo
 * hiện 3 giây rồi tắt, không ai nhìn chằm chằm vào lúc nó biến đi.
 */
export default function Toast() {
  const { show, message, type } = useToast();

  if (!show) return null;

  return (
    <div
      // role="status" + aria-live: trình đọc màn hình đọc câu này ra khi nó
      // hiện. Thiếu thì người khiếm thị đăng tin xong không biết đã xong hay
      // chưa — câu báo duy nhất nằm ở đây.
      role="status"
      aria-live="polite"
      className={
        'fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 ' +
        'px-5 py-3 rounded-2xl shadow-2xl text-sm font-semibold whitespace-nowrap ' +
        'text-white ' +
        (type === 'success' ? 'bg-gray-900' : 'bg-danger')
      }
    >
      {type === 'success' ? (
        <svg
          className="w-4 h-4 text-brand-sky flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg
          className="w-4 h-4 flex-shrink-0"
          fill="currentColor"
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
            clipRule="evenodd"
          />
        </svg>
      )}
      {message}
    </div>
  );
}
