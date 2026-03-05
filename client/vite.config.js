// client/vite.config.js
// Tailwind v4: uses @tailwindcss/vite plugin — NO postcss.config.js or tailwind.config.js needed
// Proxy: all /api requests forwarded to Express on port 3001
// INFRA-07: No cors() middleware needed — proxy makes requests appear same-origin
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),  // Replaces postcss tailwindcss + autoprefixer setup entirely
  ],
  server: {
    port: 3000,     // INFRA-10: app opens at localhost:3000
    proxy: {
      '/api': {
        target: 'http://localhost:3001',  // Express backend
        changeOrigin: true,
        // Do NOT set ws: true — breaks Vite HMR WebSocket (see RESEARCH anti-patterns)
      },
    },
  },
});
