import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // En Windows, con rutas que tienen caracteres especiales (ej. "AÑO"), el watcher nativo
    // puede perder cambios: el sondeo lo hace confiable.
    watch: { usePolling: true, interval: 200 },
  },
});
