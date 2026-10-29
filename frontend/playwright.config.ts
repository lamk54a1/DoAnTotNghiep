import { defineConfig } from '@playwright/test';

const frontendUrl = 'http://127.0.0.1:3051';
const backendUrl = 'http://localhost:5000';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 30_000,
  expect: { timeout: 8_000 },
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  use: {
    baseURL: frontendUrl,
    channel: 'chrome',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: [
    {
      command: 'node server.js',
      cwd: '../backend',
      url: backendUrl,
      reuseExistingServer: false,
      timeout: 60_000,
      env: {
        PORT: '5000',
        FRONTEND_URL: frontendUrl,
        BACKEND_URL: backendUrl,
        OFFICIAL_NEWS_SYNC_ENABLED: '0',
        SUPER_ADMIN_EMAIL: 'e2e-root-admin@slna.test',
        SEPAY_ENABLED: '1',
        SEPAY_CHECKOUT_ENABLED: '1',
        SEPAY_WEBHOOK_SECRET: 'e2e-sepay-secret-at-least-24-characters',
      },
    },
    {
      command: 'npm run dev -- --port 3051',
      cwd: '.',
      url: frontendUrl,
      reuseExistingServer: false,
      timeout: 90_000,
      env: {
        NEXT_PUBLIC_API_BASE_URL: `${backendUrl}/api`,
      },
    },
  ],
});
