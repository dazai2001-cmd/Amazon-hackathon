import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';

const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

export default defineConfig({
  testDir: './tests/browser', fullyParallel: false, workers: 1,
  timeout: 45000, globalTimeout: 8 * 60 * 1000, retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL: 'http://127.0.0.1:8897', viewport: { width: 1920, height: 1080 }, trace: 'retain-on-failure',
    launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || (existsSync(chrome) ? chrome : undefined), args: ['--enable-webgl', '--enable-unsafe-swiftshader', '--use-angle=swiftshader'] } },
  webServer: { command: 'npm run dev', url: 'http://127.0.0.1:8897/api/health', reuseExistingServer: false, timeout: 60000,
    env: { PORT: '8897', TLS_PORT: '8898', PHONE_BASE_URL: 'https://127.0.0.1:8898', DATA_DIR: '.local/browser-test-data' } },
});
