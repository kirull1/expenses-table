// Инициализация переменных окружения для клиентской части
const loadEnvVars = async () => {
  // Создаем объект для хранения переменных окружения
  window.ENV_VARS = window.ENV_VARS || {};
  
  // Проверяем, есть ли переменные окружения в process.env
  if (process.env && process.env.SPREADSHEET_ID) {
    console.log("ENV: Loading from process.env");
    window.ENV_VARS.SPREADSHEET_ID = process.env.SPREADSHEET_ID;
    window.ENV_VARS.SERVICE_ACCOUNT_EMAIL = process.env.SERVICE_ACCOUNT_EMAIL;
  } else {
    console.log("ENV: process.env not available, trying API");
    // Если переменные не доступны в process.env, пробуем загрузить через API
    try {
      const response = await fetch('/api/env-info');
      if (response.ok) {
        const data = await response.json();
        console.log("ENV: Loaded from API:", data);
        window.ENV_VARS = {
          ...window.ENV_VARS,
          ...data
        };
      }
    } catch (error) {
      console.error("ENV: Error loading from API:", error);
    }
  }
  
  // Копируем переменные в process.env для совместимости
  window.process = window.process || {};
  window.process.env = window.process.env || {};
  
  if (window.ENV_VARS.SPREADSHEET_ID) {
    window.process.env.SPREADSHEET_ID = window.ENV_VARS.SPREADSHEET_ID;
  }
  
  if (window.ENV_VARS.SERVICE_ACCOUNT_EMAIL) {
    window.process.env.SERVICE_ACCOUNT_EMAIL = window.ENV_VARS.SERVICE_ACCOUNT_EMAIL;
  }
  
  console.log("ENV: Variables loaded:", {
    SPREADSHEET_ID: window.process.env.SPREADSHEET_ID ? "✅" : "❌",
    SERVICE_ACCOUNT_EMAIL: window.process.env.SERVICE_ACCOUNT_EMAIL ? "✅" : "❌"
  });
  
  return window.ENV_VARS;
};

export default loadEnvVars; 