import { useI18n } from '../i18n';

/*
 * Ô "chưa có ảnh" dùng chung cho mọi chỗ hiện tin.
 *
 * Trước đây mỗi chỗ tự vẽ một biểu tượng ảnh gãy trên nền xám. Vấn đề là biểu
 * tượng đó mang nghĩa "ảnh tải lỗi" — người xem tưởng web hỏng, trong khi sự
 * thật chỉ là người đăng không kèm ảnh. Mà đăng tin không ảnh là chuyện rất
 * bình thường: người vừa mất chó thì đang vội, lục tìm ảnh cũ là việc sau.
 *
 * Nên đổi sang dấu chân thú trên nền pha màu theo loại tin: nhìn là biết cố ý,
 * và vẫn đọc được ngay tin đó thuộc loại nào.
 */
/*
 * Ba tông pha, mỗi tông đi với một loại tin.
 *
 * Dấu chân làm mờ còn 80% cho nó lùi lại sau chữ, nhưng KHÔNG mờ hơn: khi
 * `label` tắt (thẻ nhỏ trong lưới) thì dấu chân là thứ duy nhất nói "chưa có
 * ảnh", nên nó phải đạt 3:1 như mọi hình mang nghĩa. Đo ở mức 80%: 3.30:1 /
 * 3.22:1 / 4.22:1 — mờ xuống 40% thì chỉ còn 1.4:1, nhìn như ô trống trơn.
 *
 * Chữ nhãn thì để màu ĐẶC. Chữ 12px là chữ thường, ngưỡng 4.5:1, mà làm mờ
 * 70% là tụt xuống 2.7:1.
 */
const TINTS = {
  lost: { bg: 'bg-lost-soft', icon: 'text-lost-text/80', text: 'text-lost-text' },
  found: { bg: 'bg-found-soft', icon: 'text-found-text/80', text: 'text-found-text' },
  resolved: { bg: 'bg-primary-soft', icon: 'text-primary/80', text: 'text-primary' },
};

export default function NoPhoto({ type = 'lost', resolved = false, label = true }) {
  const { t } = useI18n();

  // Đã đoàn tụ thì màu đó thắng, bất kể tin vốn thuộc loại nào.
  const tint = resolved ? TINTS.resolved : TINTS[type] || TINTS.lost;

  return (
    <div className={'w-full h-full flex flex-col items-center justify-center gap-2 ' + tint.bg}>
      <svg
        className={'w-10 h-10 ' + tint.icon}
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
      >
        <ellipse cx="9.6" cy="6.2" rx="2.1" ry="2.7" />
        <ellipse cx="14.4" cy="6.2" rx="2.1" ry="2.7" />
        <ellipse cx="5.6" cy="10.6" rx="2" ry="2.6" />
        <ellipse cx="18.4" cy="10.6" rx="2" ry="2.6" />
        <path d="M12 12.8c-2.9 0-5.2 2.1-5.2 4.4 0 2.2 1.7 3.8 4.1 3.8h2.2c2.4 0 4.1-1.6 4.1-3.8 0-2.3-2.3-4.4-5.2-4.4z" />
      </svg>
      {/* Thẻ nhỏ trong lưới thì chữ chen chúc, chỉ để dấu chân là đủ. */}
      {label && <span className={'text-xs font-medium ' + tint.text}>{t('photo.none')}</span>}
    </div>
  );
}
