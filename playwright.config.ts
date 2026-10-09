import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/mobile", workers: 1, timeout: 45000,
  use: { baseURL: "http://localhost:3112", browserName: "chromium", hasTouch: true,
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH, args: ["--no-sandbox", "--disable-dev-shm-usage"] } : {},
    screenshot: "only-on-failure", trace: "retain-on-failure" },
  webServer: { command: "node scripts/mobile-server.mjs", url: "http://localhost:3112/login", timeout: 120000, reuseExistingServer: false, gracefulShutdown: { signal: "SIGTERM", timeout: 5000 } },
});
