import { defineConfig } from 'vite';

export default defineConfig({
  build: { target: 'chrome80', chunkSizeWarningLimit: 1000 },
  server: { host: '0.0.0.0', allowedHosts: true, watch: { ignored: ['**/.local/**', '**/artifacts/**', '**/android/**', '**/playwright-report/**', '**/test-results/**'] } },
});
