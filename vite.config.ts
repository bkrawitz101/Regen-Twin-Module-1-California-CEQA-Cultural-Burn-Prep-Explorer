import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  server: {
    fs: {
      strict: false,
      allow: [process.cwd(), '.'],
    },
    proxy: {
      '/api/calvtp': {
        target: 'https://services1.arcgis.com',
        changeOrigin: true,
        rewrite: (path) =>
          path.replace(
            /^\/api\/calvtp/,
            '/jUJYIo9tSA7EHvfZ/arcgis/rest/services'
          ),
      },
      '/api/nominatim': {
        target: 'https://nominatim.openstreetmap.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/nominatim/, ''),
      },
    },
  },
});
