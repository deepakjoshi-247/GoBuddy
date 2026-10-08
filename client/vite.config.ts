import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'server-ready-notice',
      configureServer(server) {
        server.httpServer?.once('listening', () => {
          setTimeout(() => {
            console.log('\n======================================================');
            console.log('🚀 ChaloNa Web Application is LIVE & READY!');
            console.log('👉 http://localhost:5173/demo (Side-by-Side Demo)');
            console.log('👉 http://localhost:5173/rider/login (Rider Aarav)');
            console.log('👉 http://localhost:5173/passenger/login (Passenger Rohan)');
            console.log('======================================================\n');
          }, 400);
        });
      },
    },
  ],
  optimizeDeps: {
    exclude: ['leaflet'],
    include: [
      'react',
      'react-dom',
      'react-dom/client',
      'react/jsx-runtime',
      'react/jsx-dev-runtime',
      'lucide-react',
      'framer-motion',
    ],
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
