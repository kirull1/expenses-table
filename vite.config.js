import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000, // Используем другой порт
    strictPort: false, // Разрешаем использовать другой порт, если 3000 занят
    hmr: {
      clientPort: 3000, // Явно указываем порт для клиента
      host: 'localhost',
      protocol: 'ws',
      overlay: false // Отключаем оверлей ошибок
    },
    watch: {
      usePolling: true // Использовать polling для файловой системы
    },
    cors: true // Разрешаем CORS
  }
})
