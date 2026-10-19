import { createContext, useContext, useCallback, useState } from 'react';
import { words } from '../word';

/*
 * Quản lý ngôn ngữ đang dùng (vi / en).
 *
 * Dịch từ Vue: langStore + setLang + i18nMixin trong src/i18n.js.
 *
 * Vue 2 dùng Vue.mixin(i18nMixin) để nhét $t() và $lang vào MỌI component,
 * component không cần khai báo gì cũng gọi được {{ $t('nav.lost') }}.
 * React không có mixin -> dùng Context giống hệt cách ToastContext.jsx đang làm:
 * state nằm ở Provider bọc ngoài app, component con lấy ra bằng hook useLanguage().
 */

const LanguageContext = createContext(null);

// Vue: localStorage.getItem('lang') || 'vi'  — viết thẳng trong Vue.observable.
// Tách ra hàm riêng vì localStorage có thể ném lỗi (trình duyệt chặn cookie/
// chế độ ẩn danh). Lỗi ở đây mà không bắt là trắng nguyên trang web.
function readSavedLanguage() {
  try {
    const saved = localStorage.getItem('lang');
    return saved === 'vi' || saved === 'en' ? saved : 'vi';
  } catch {
    return 'vi';
  }
}

export function LanguageProvider({ children }) {
  // Truyền HÀM vào useState (không phải giá trị) -> React chỉ gọi nó đúng 1 lần
  // lúc khởi tạo, thay vì đọc localStorage lại sau mỗi lần render.
  const [lang, setLangState] = useState(readSavedLanguage);

  // Vue: setLang() sửa langStore.lang rồi ghi localStorage.
  const setLang = useCallback((nextLang) => {
    setLangState(nextLang);
    try {
      localStorage.setItem('lang', nextLang);
    } catch {
      // Không lưu được thì thôi, đổi ngôn ngữ trong phiên này vẫn chạy bình thường.
    }
  }, []);

  /*
   * Lấy chữ theo key.
   *
   * Vue:   {{ $t('nav.lost') }}
   * React: {t('nav.lost')}
   *
   * Không tìm thấy key thì trả về chính cái key đó, để trên giao diện hiện ra
   * 'nav.lost' — nhìn là biết ngay thiếu chữ, thay vì để trống rồi ngồi đoán.
   */
  const t = useCallback(
    (key) => words[lang]?.[key] ?? key,
    [lang],
  );

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

/*
 * Hook để component lấy ngôn ngữ ra dùng.
 *
 *   const { t, lang, setLang } = useLanguage();
 *   <h1>{t('home.all')}</h1>
 *   <button onClick={() => setLang('en')}>EN</button>
 */
export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage() phải được gọi bên trong <LanguageProvider>');
  return ctx;
}
