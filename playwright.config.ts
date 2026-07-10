import { defineConfig, devices } from "@playwright/test";

const PORT = process.env.PORT || 4173;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : 1,
  reporter: [
    ["html", { outputFolder: "playwright-report" }],
    ["list"],
  ],
  outputDir: "test-results",
  timeout: 30_000,

  use: {
    baseURL: BASE_URL,
    trace: process.env.CI ? "retain-on-failure" : "on-first-retry",
    screenshot: "only-on-failure",
    locale: "tr-TR",
    timezoneId: "Europe/Istanbul",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], locale: "tr-TR" },
    },
    {
      name: "mobile-chrome",
      use: {
        ...devices["Pixel 5"],
        locale: "tr-TR",
      },
    },
  ],

  // Build the app before running tests
  webServer: process.env.CI
    ? {
        command: "npm run build && npx next start -p 4173",
        port: 4173,
        timeout: 120_000,
        reuseExistingServer: !process.env.CI,
        env: {
          NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
          NEXT_PUBLIC_SUPABASE_ANON_KEY:
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
        },
      }
    : undefined,
});
