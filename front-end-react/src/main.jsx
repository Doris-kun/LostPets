import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import router from './router.jsx';
import './assets/tailwind.css';

/*
 * Điểm khởi động.
 *
 *   Vue 2:  new Vue({ router, render: h => h(App) }).$mount('#app')
 *   React:  createRoot(...).render(<RouterProvider router={router} />)
 *
 * KHÔNG bọc provider nào ở đây, và đó là chủ ý.
 *
 * Bản Vue gọi Vue.mixin(i18nMixin) để nhét $t() vào mọi component một phát.
 * Lối React thông thường là bọc <LanguageProvider> quanh app — nhánh React cũ
 * cũng làm vậy. Nhưng i18n.js, auth.js, toast.js và chat.js ở đây tự giữ
 * store ở cấp module rồi, nên hook của chúng chạy được từ bất cứ đâu mà
 * không cần ai bọc.
 *
 * Được thêm một thứ: mã KHÔNG phải component vẫn gọi t() được — bộ chặn lỗi
 * của axios chẳng hạn. Bọc provider thì giá trị nằm trong cây React, ngoài
 * cây không với tới.
 */
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
