import { defineConfig } from '@playwright/test';

// Uses the locally installed Google Chrome, so no browser download is needed.
export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: { baseURL: 'http://localhost:4173', channel: 'chrome', viewport: { width: 1280, height: 800 } },
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
