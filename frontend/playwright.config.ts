import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright configuration for NetMap E2E tests.
 * Tests run against a locally built Next.js app (http://localhost:3000)
 * with a real FastAPI backend (http://localhost:8000).
 *
 * Global setup signs up a test user once and saves the auth storage state to
 * e2e/.auth/user.json so every test file that needs authentication reuses the
 * same session without repeating the login flow.
 */
export default defineConfig({
  testDir: "./e2e",

  /* Give each test 30 s; give each file up to 5 min */
  timeout: 30_000,
  globalTimeout: 5 * 60 * 1_000,

  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,

  /* Reporter: HTML report + list to stdout */
  reporter: [["html"], ["list"]],

  use: {
    baseURL: "http://localhost:3000",

    /* Default storage state — authenticated tests pick this up */
    storageState: "e2e/.auth/user.json",

    /* Collect trace on first retry to help debug CI failures */
    trace: "on-first-retry",

    /* Reasonable navigation timeout */
    navigationTimeout: 15_000,
  },

  projects: [
    /* ── Step 1: global auth setup (no storage state) ── */
    {
      name: "setup",
      testMatch: /global-setup\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        storageState: undefined, // must NOT inherit auth state
      },
    },

    /* ── Step 2: all spec files (chromium only, auth pre-loaded) ── */
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "e2e/.auth/user.json",
      },
      dependencies: ["setup"],
      testIgnore: /global-setup\.ts/,
    },
  ],
});
