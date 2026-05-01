/**
 * global-setup.ts — Playwright global auth setup
 *
 * Runs once before all test projects that depend on "setup".
 * Creates (or re-uses) a Supabase test user, signs in via the /login page,
 * and saves browser storage state to e2e/.auth/user.json so every subsequent
 * test file can skip the login flow entirely.
 *
 * Strategy for CI:
 *  1. Try to sign up via Supabase auth REST API.
 *  2. If the user already exists (409 / "User already registered") fall through.
 *  3. Attempt to auto-confirm via the Supabase admin API (service role key).
 *     This is a no-op when email confirmation is disabled in the project.
 *  4. Sign in via the /login page and persist storage state.
 */

import { test as setup, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

const AUTH_FILE = path.join(__dirname, ".auth", "user.json");

// ── Credentials ───────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

// Use a deterministic-ish email so multiple CI runs reuse the same account.
// The Date.now() suffix is stored in an env var that other tests can read.
const TEST_EMAIL =
  process.env.E2E_TEST_EMAIL ??
  `e2e-test-${Date.now()}@netmap-test.dev`;
const TEST_PASSWORD = "E2eTestPass123!";

// Expose to child processes (e.g. if other specs need the email)
process.env.E2E_TEST_EMAIL = TEST_EMAIL;
process.env.E2E_TEST_PASSWORD = TEST_PASSWORD;

// ── Helpers ───────────────────────────────────────────────────────────────────

async function supabaseSignUp(email: string, password: string): Promise<void> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ email, password }),
  });

  // 200 = success, 400 with "User already registered" = already exists
  if (res.ok) return;

  const body = await res.json().catch(() => ({}));
  const msg: string = body?.msg ?? body?.error_description ?? body?.message ?? "";

  // Treat "already registered" as success — we'll log in instead
  if (
    res.status === 400 &&
    (msg.toLowerCase().includes("already") ||
      msg.toLowerCase().includes("registered"))
  ) {
    return;
  }

  // Some Supabase projects return 422 for duplicate email
  if (res.status === 422) return;

  throw new Error(
    `Supabase signUp failed: ${res.status} ${JSON.stringify(body)}`
  );
}

async function supabaseAdminConfirm(email: string): Promise<void> {
  if (!SUPABASE_SERVICE_ROLE_KEY) return; // skip if no service role key

  // List users and find the one with this email
  const listRes = await fetch(
    `${SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(email)}`,
    {
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
    }
  );

  if (!listRes.ok) return; // graceful — confirmation may not be required

  const listData = await listRes.json().catch(() => ({ users: [] }));
  const users: Array<{ id: string; email_confirmed_at?: string }> =
    listData.users ?? listData ?? [];

  const user = users.find(
    (u: { email?: string }) =>
      u.email?.toLowerCase() === email.toLowerCase()
  );
  if (!user) return;
  if (user.email_confirmed_at) return; // already confirmed

  // Confirm via admin PATCH
  await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${user.id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ email_confirm: true }),
  });
}

// ── Setup test ────────────────────────────────────────────────────────────────

setup("authenticate test user", async ({ page }) => {
  // Ensure the auth directory exists
  fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true });

  console.log(`\n[global-setup] Using test email: ${TEST_EMAIL}`);

  // 1. Attempt sign-up (idempotent)
  await supabaseSignUp(TEST_EMAIL, TEST_PASSWORD);

  // 2. Attempt to auto-confirm via admin API (no-op if not needed / no key)
  await supabaseAdminConfirm(TEST_EMAIL);

  // 3. Sign in via the /login page and wait for dashboard redirect
  await page.goto("/login");
  await expect(page).toHaveURL(/\/login/);

  await page.getByLabel("Email").fill(TEST_EMAIL);
  await page.getByLabel("Password").fill(TEST_PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();

  // Wait for successful redirect to /dashboard (up to 15 s)
  await page.waitForURL(/\/dashboard/, { timeout: 15_000 });

  // 4. Save storage state (cookies + localStorage) for reuse
  await page.context().storageState({ path: AUTH_FILE });
  console.log(`[global-setup] Auth state saved to ${AUTH_FILE}`);
});
