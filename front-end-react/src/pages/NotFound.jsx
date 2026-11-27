import { Link } from 'react-router-dom';
import { useI18n } from '../i18n';

/*
 * Trang 404.
 *
 * Trong giai đoạn chuyển từ Vue sang React, trang này còn gánh thêm một việc
 * nữa: mọi đường dẫn chưa kịp chuyển đều rơi vào đây. Nhờ vậy bản React luôn
 * dựng được và chạy được, thay vì gãy ở một tuyến đường trỏ tới trang chưa
 * tồn tại.
 */
export default function NotFound() {
  const { t } = useI18n();

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 text-center">
      {/*
        Con số 404 là hình trang trí, không mang thông tin — câu giải thích
        thật nằm ở thẻ h1 ngay dưới. Để trình đọc màn hình đọc "bốn không bốn"
        chỉ làm người nghe rối thêm.
      */}
      <p className="text-8xl font-bold text-gray-100 select-none" aria-hidden="true">
        404
      </p>
      <h1 className="text-xl font-bold text-gray-800 mt-4">{t('404.title')}</h1>
      <p className="text-gray-500 text-sm mt-2">{t('404.sub')}</p>
      <Link
        to="/"
        className="mt-8 inline-flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-primary-dark transition-colors"
      >
        {t('404.back')}
      </Link>
    </div>
  );
}
