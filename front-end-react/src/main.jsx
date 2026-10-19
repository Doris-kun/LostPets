import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { LanguageProvider } from './context/language.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import './assets/tailwind.css';

// Vue 2:  new Vue({ render: h => h(App) }).$mount('#app')
// React:  createRoot(document.getElementById('root')).render(<App />)
//
// Vue 2:  Vue.mixin(i18nMixin)  — nhét $t() vào mọi component một phát.
// React:  bọc <LanguageProvider> quanh app — mọi component BÊN TRONG nó
//         gọi useLanguage() là lấy được t(). Bọc ở đây nghĩa là toàn app dùng được.
createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <LanguageProvider>
      <ToastProvider>
        <App />
      </ToastProvider>
    </LanguageProvider>
  </React.StrictMode>
);
