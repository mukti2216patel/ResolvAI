import { defineConfig, devices } from '@playwright/test';

const testClientUrl = 'http://localhost:5174';
const testServerUrl = 'http://localhost:4100';

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './e2e',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: testClientUrl,

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',

    /* Increase expect timeout to help with occasional network/animation delays */
    actionTimeout: 0,
    navigationTimeout: 30000,
  },

  expect: { 
    timeout: 15000 
  },

  /* Configure projects for major browsers (exclude webkit per request to ignore Safari failures) */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
  ],

  /* Run local dev servers before starting the tests */
  webServer: [
    {
      command: `PORT=4100 CLIENT_URL=${testClientUrl} TRUSTED_ORIGINS=${testClientUrl} BETTER_AUTH_URL=${testServerUrl} bun --env-file=.env.test run src/server.ts`,
      url: `${testServerUrl}/api/health`,
      reuseExistingServer: false,
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      command: `VITE_DEV_PORT=5174 VITE_API_PROXY_TARGET=${testServerUrl} bun run dev:client`,
      url: testClientUrl,
      reuseExistingServer: false,
      stdout: 'pipe',
      stderr: 'pipe',
    }
  ],
});