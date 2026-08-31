import {defineConfig, devices} from "@playwright/test";

const PORT = Number(process.env.PORT ?? 3100);
const baseURL = `http://127.0.0.1:${PORT}`;

/**
 * The journey test runs against a production build so it exercises the same
 * rendering path as a deployment. It needs a populated database — run
 * `pnpm db:import:sheet` (or `pnpm db:seed`) first.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? "line" : [["list"]],
  timeout: 120_000,
  expect: {timeout: 30_000},
  use: {baseURL, trace: "retain-on-failure", locale: "ru-RU"},
  projects: [{name: "chromium", use: {...devices["Desktop Chrome"]}}],
  webServer: {
    command: `corepack pnpm@9.15.4 build && corepack pnpm@9.15.4 start --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
    stdout: "pipe"
  }
});
