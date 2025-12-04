import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Define path aliases to match your imports
      'components': path.resolve(__dirname, './src/components'),
      'pages': path.resolve(__dirname, './src/pages'),
      'utils': path.resolve(__dirname, './src/utils'),
      'contexts': path.resolve(__dirname, './src/contexts'),
      'styles': path.resolve(__dirname, './src/styles'),
      'landingpages': path.resolve(__dirname, './src/landingpages'),
    },
  },
  server: {
    port: 9000,
    open: true,
  }
});
