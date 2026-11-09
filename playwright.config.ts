import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  timeout: 180000,
  expect: { timeout: 15000 },
  use: {
    baseURL: "http://localhost:4173",
    ...devices["iPhone 13"],
    defaultBrowserType: "chromium",
    acceptDownloads: true,
  },
  projects: [{ name: "mobile-chromium" }],
  reporter: "list",
});
