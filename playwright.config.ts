import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  // playwright.config.ts
use: { trace: process.env.CI ? 'retain-on-failure' : 'on-first-retry' }

  testDir: 'e2e',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    // add firefox/webkit later if you want
  ],
  // Start a server for the tests. We serve the built app via Vite preview.
  webServer: {
    command: 'npm run preview -- --port=5173',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
