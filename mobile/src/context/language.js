import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { words } from '../word';

/*
 * Quản lý ngôn ngữ đang dùng (vi / en).
 *
 * Cùng vai trò với front-end-react/src/context/language.jsx bên web, nhưng có
 * MỘT khác biệt lớn phải để ý:
 *
 *   Web:    localStorage.getItem('lang')          -> trả kết quả NGAY
 *   Mobile: AsyncStorage.getItem('lang')          -> trả một Promise, phải chờ
 *
 * Vì phải chờ, không thể đọc ngôn ngữ đã lưu ngay lúc khởi tạo state được.
 * Cách làm: khởi động bằng 'vi', rồi đọc ổ đĩa ở useEffect và đổi lại nếu cần.
 * Người dùng chọn 'en' lần trước sẽ thấy app nháy tiếng Việt vài phần nghìn
 * giây — nhưng lúc đó màn chào vẫn đang che, nên thực tế không ai thấy.
 */

const STORAGE_KEY = 'lang';
const DEFAULT_LANG = 'vi';

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(DEFAULT_LANG);

  // Đọc lựa chọn của lần chạy trước. Chạy đúng một lần lúc app mở.
  useEffect(() => {
    let ignore = false;

    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        // Kiểm tra giá trị đọc lên: file lưu có thể bị sửa tay hoặc hỏng.
        // Không kiểm mà gán bừa thì t() tra vào words[undefined] -> app trắng.
        if (!ignore && (saved === 'vi' || saved === 'en')) setLangState(saved);
      })
      .catch(() => {
        // Không đọc được thì dùng mặc định, không có gì phải báo người dùng.
      });

    return () => {
      ignore = true;
    };
  }, []);

  const setLang = useCallback((nextLang) => {
    setLangState(nextLang);
    // Không await: đổi ngôn ngữ trên màn hình phải xảy ra ngay, còn việc ghi
    // xuống ổ đĩa chậm vài mili giây cũng không ai chờ.
    AsyncStorage.setItem(STORAGE_KEY, nextLang).catch(() => {});
  }, []);

  const toggleLang = useCallback(() => {
    setLang(lang === 'vi' ? 'en' : 'vi');
  }, [lang, setLang]);

  /*
   * Lấy chữ theo key.
   *
   *   t('detail.edit')                  -> 'Chỉnh sửa'
   *   t('time.minutes', { n: 5 })       -> '5 phút trước'
   *
   * Không tìm thấy key thì trả về chính cái key đó, để trên giao diện hiện ra
   * 'detail.edit' — nhìn là biết ngay thiếu chữ, thay vì một khoảng trống câm.
   */
  const t = useCallback(
    (key, params) => {
      let text = words[lang]?.[key] ?? key;

      if (params) {
        for (const [name, value] of Object.entries(params)) {
          text = text.replaceAll(`{${name}}`, String(value));
        }
      }

      return text;
    },
    [lang],
  );

  /*
   * useMemo để object này giữ nguyên qua các lần render khi lang không đổi.
   * Thiếu nó thì mỗi lần render lại sinh object mới -> mọi component đang dùng
   * useLanguage() đều bị vẽ lại, kể cả khi chẳng có gì thay đổi.
   */
  const value = useMemo(() => ({ lang, setLang, toggleLang, t }), [lang, setLang, toggleLang, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);

  // Gọi hook này ở component nằm ngoài LanguageProvider thì context là null,
  // và lỗi thật sẽ hiện ra ở dòng `const { t } = ...` rất khó hiểu.
  // Báo thẳng ở đây cho biết nguyên nhân.
  if (!context) throw new Error('useLanguage phải nằm trong <LanguageProvider>');

  return context;
}
