import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/browser",
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:3000",
    viewport: { width: 1280, height: 800 },
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? {
          executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
          args: [
            "--no-sandbox",
            "--disable-dev-shm-usage",
            "--disable-gpu",
            "--no-zygote",
            "--single-process",
          ],
        }
      : {},
  },
  webServer: [
    {
      command: "npm run dev",
      url: "http://127.0.0.1:3000",
      reuseExistingServer: false,
    },
    {
      command: "npm start",
      url: "http://127.0.0.1:3001/api/health",
      reuseExistingServer: false,
      env: {
        CRM_ADMIN_EMAIL: "browser@example.com",
        CRM_ADMIN_PASSWORD: "browser-test-password",
        CRM_ORIGIN: "http://127.0.0.1:3000",
        CRM_DB_PATH: "test-results/browser.sqlite",
        PORT: "3001",
        NODE_ENV: "test",
      },
    },
  ],
});
