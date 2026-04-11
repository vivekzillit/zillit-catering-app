import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

// Apply persisted theme before React mounts so there's no light-mode flash.
(() => {
  const stored = (() => {
    try {
      return localStorage.getItem('zillit.theme');
    } catch {
      return null;
    }
  })();
  const theme = stored === 'light' ? 'light' : 'dark';
  document.documentElement.classList.toggle('dark', theme === 'dark');
})();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
