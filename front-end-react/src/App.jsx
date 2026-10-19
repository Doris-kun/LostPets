import { useState } from 'react';

// BƯỚC 1 — file tạm để kiểm tra Vite + React + Tailwind đã chạy.
// Bước 3 sẽ thay bằng bản dịch thật của App.vue (nav + router).
export default function App() {
  // Vue 2:  data() { return { count: 0 } }   ->  dùng: this.count / this.count++
  // React:  const [count, setCount] = useState(0)
  const [count, setCount] = useState(0);

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-6 px-4">
      <div className="w-14 h-14 bg-gradient-to-br from-orange-400 to-rose-500 rounded-2xl flex items-center justify-center shadow-md">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
          <path d="M4.5 11a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zm15 0a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM7 6.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zm10 0a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM12 22c4 0 7-2.686 7-6 0-1.56-.87-2.985-2.315-4.073C15.692 10.925 13.916 10.5 12 10.5s-3.692.425-4.685 1.427C5.87 13.015 5 14.44 5 16c0 3.314 3 6 7 6z" />
        </svg>
      </div>

      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Lost Pets — React</h1>
        <p className="text-sm text-gray-400 mt-1">Bước 1: Vite + React + Tailwind đã hoạt động</p>
      </div>

      {/* Nút này chứng minh state của React chạy (tương đương data + methods của Vue) */}
      <button
        onClick={() => setCount(count + 1)}
        className="bg-orange-500 text-white px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-orange-600 transition-all shadow-sm"
      >
        Đã bấm {count} lần
      </button>

      <p className="text-xs text-gray-300 font-mono">
        API: {import.meta.env.VITE_API_URL || 'http://localhost:3000'}
      </p>
    </div>
  );
}
