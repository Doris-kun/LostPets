import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './assets/tailwind.css';

// Vue 2:  new Vue({ render: h => h(App) }).$mount('#app')
// React:  createRoot(document.getElementById('root')).render(<App />)
createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
