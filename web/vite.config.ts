import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Фронтенд (порт 5173) шлёт запросы на /reprice, Vite перенаправляет их на API (порт 3001).
// Так не нужен CORS, и в коде страницы адрес сервера хардкодить не надо.
export default defineConfig({
  root: "web",
  plugins: [react()],
  server: {
    proxy: {
      "/reprice": "http://localhost:3001",
    },
  },
});
