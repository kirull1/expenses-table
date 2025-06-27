import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import loadEnvVars from './env-loader';

// Загружаем переменные окружения перед запуском приложения
const initApp = async () => {
  try {
    // Загружаем переменные окружения
    await loadEnvVars();
    
    // Запускаем приложение
    ReactDOM.createRoot(document.getElementById('root')).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    );
  } catch (error) {
    console.error('Error initializing app:', error);
    // Показываем сообщение об ошибке
    document.getElementById('root').innerHTML = `
      <div style="text-align: center; padding: 20px;">
        <h2>Ошибка инициализации приложения</h2>
        <p>Пожалуйста, проверьте настройки и перезагрузите страницу.</p>
        <button onclick="window.location.reload()">Перезагрузить</button>
      </div>
    `;
  }
};

// Запускаем инициализацию
initApp();

// Register service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(registration => {
        console.log('SW registered: ', registration);
      })
      .catch(registrationError => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}
