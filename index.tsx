
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const startApp = () => {
  try {
    const rootElement = document.getElementById('root');
    if (!rootElement) {
      console.error("Fatal: Root element #root tidak ditemukan!");
      return;
    }

    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    console.log("✅ App initialized successfully");
  } catch (error) {
    console.error("❌ Fatal Error during initialization:", error);
    document.body.innerHTML = `
      <div style="padding: 20px; font-family: sans-serif; text-align: center;">
        <h1 style="color: red;">Maaf, Sistem Gagal Dimuat</h1>
        <p>Terjadi kesalahan saat memulai aplikasi. Silakan bersihkan cache browser atau hubungi admin.</p>
        <pre style="text-align: left; background: #eee; padding: 10px; border-radius: 8px;">${error}</pre>
        <button onclick="location.reload()" style="padding: 10px 20px; background: #4089C9; color: white; border: none; border-radius: 8px; cursor: pointer;">
          Coba Muat Ulang
        </button>
      </div>
    `;
  }
};

startApp();
