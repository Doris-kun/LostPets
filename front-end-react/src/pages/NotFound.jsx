import { Link } from 'react-router-dom';
import { useLanguage } from '../context/language.jsx';

/*
 * Trang hiện ra khi URL không khớp đường dẫn nào.
 *
 * Dịch từ Vue: src/views/NotFound.vue
 *
 * Bản Vue không cần import gì: $t() có sẵn nhờ Vue.mixin, <router-link> là thẻ
 * toàn cục. Bên React mọi thứ phải import rõ ràng — dài hơn vài dòng, đổi lại
 * nhìn đầu file là biết ngay component này phụ thuộc vào những gì.
 */

export default function NotFound() {
  const { t } = useLanguage();

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 text-center">
      {/* select-none: chặn bôi đen số 404, nó chỉ là hình trang trí */}
      <p className="text-8xl font-bold text-gray-100 select-none">404</p>

      <h1 className="text-xl font-bold text-gray-800 mt-4">{t('404.title')}</h1>
      <p className="text-gray-400 text-sm mt-2">{t('404.sub')}</p>

      <Link
        to="/"
        className="mt-8 inline-flex items-center gap-2 bg-orange-500 text-white px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-orange-600 transition-colors"
      >
        {t('404.back')}
      </Link>
    </div>
  );
}
