import { defineConfig, devices } from "@playwright/test";

// BASE_URL set: run against that deployment (preview or live) and start no
// server. Unset: build and start the app locally on a dedicated port.
const baseURL = process.env.BASE_URL ?? "http://localhost:3517";
const runLocal = process.env.BASE_URL === undefined;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
    extraHTTPHeaders: process.env.VERCEL_AUTOMATION_BYPASS_SECRET
      ? { "x-vercel-protection-bypass": process.env.VERCEL_AUTOMATION_BYPASS_SECRET }
      : {},
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: runLocal
    ? {
        command: "npm run build && npm run start -- -p 3517",
        url: baseURL,
        // Never reuse: a different server on this port must be a loud error,
        // not a silently tested wrong app.
        reuseExistingServer: false,
        timeout: 180_000,
      }
    : undefined,
});
