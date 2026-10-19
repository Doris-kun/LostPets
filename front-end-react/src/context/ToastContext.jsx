import { createContext, useContext, useCallback, useEffect, useRef, useState } from 'react';

/*
 * Dịch từ Vue: src/toast.js
 *
 * Vue 2 dùng Vue.observable để tạo 1 store global, file nào import cũng dùng được.
 * React không có cơ chế đó -> dùng Context: state nằm ở Provider bọc ngoài app,
 * component con lấy ra bằng hook useToast().
 */

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  // Vue: Vue.observable({ show: false, message: '', type: 'success' })
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // Vue: biến `let timer = null` ở module scope.
  // React: useRef — giữ giá trị qua các lần re-render mà KHÔNG gây re-render khi đổi.
  const timerRef = useRef(null);

  // useCallback giữ hàm này không bị tạo lại mỗi lần render,
  // nhờ vậy component con dùng nó trong useEffect sẽ không chạy lại vô ích.
  const showToast = useCallback((message, type = 'success', duration = 3000) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast({ show: true, message, type });
    timerRef.current = setTimeout(() => {
      // Chỉ tắt `show`, giữ lại message/type để animation thoát còn chữ mà hiển thị.
      setToast((t) => ({ ...t, show: false }));
    }, duration);
  }, []);

  // Dọn timer khi app bị unmount, tránh setState trên component đã biến mất.
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <ToastContext.Provider value={{ toast, showToast }}>
      {children}
    </ToastContext.Provider>
  );
}

/*
 * Hook để component gọi toast.
 *
 * Vue:   this.$toast('Đã lưu!')            (nhờ Vue.mixin trong main.js)
 * React: const { showToast } = useToast()
 *        showToast('Đã lưu!')
 */
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast() phải được gọi bên trong <ToastProvider>');
  return ctx;
}
