import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dev: runs on :5173 and proxies /api to the Express server on :4000.
// Build: emitted with base /dashboard/ so Express can serve it at /dashboard.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:4000',
      '/styles.css': 'http://localhost:4000',
      '/cart.js': 'http://localhost:4000',
      '/tracker.js': 'http://localhost:4000',
      '/demo-proxy': {
        target: 'http://localhost:4000',
        rewrite: (path) => path.replace(/^\/demo-proxy/, '') || '/',
      },
    },
  },
});
