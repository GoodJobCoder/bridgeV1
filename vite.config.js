import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages serves the site from https://<user>.github.io/bridgeV1/
export default defineConfig(({ command, isPreview }) => ({
  base: command === 'build' || isPreview ? '/bridgeV1/' : '/',
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.js'],
  },
}));
