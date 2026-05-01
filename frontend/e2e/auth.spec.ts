/**
 * auth.spec.ts — Authentication flow tests
 *
 * These tests run WITHOUT stored auth state (unauthenticated browser context).
 * They verify redirect behaviour, form presence, and error messaging.
 */

import { test, expect } from "@playwright/test";

// Override the project-level storageState for this file — we want a clean,
// unauthenticated context.
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("Authentication", () => {
  test("redirects unauthenticated user from /dashboard to /login", async ({
    page,
  }) => {
    await page.goto("/dashboard");

    // Next.js middleware or server-side guard should redirect to /login
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });

  test("shows login form with email and password fields", async ({ page }) => {
    await page.goto("/login");

    // Heading
    await expect(
      page.getByRole("heading", { name: /welcome back/i })
    ).toBeVisible();

    // Labelled inputs
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();

    // Submit button
    await expect(
      page.getByRole("button", { name: /sign in/i })
    ).toBeVisible();
  });

  test("shows signup form and can navigate to it from login", async ({
    page,
  }) => {
    await page.goto("/login");

    // The "Sign up" link should be present on the login page
    const signUpLink = page.getByRole("link", { name: /sign up/i });
    await expect(signUpLink).toBeVisible();

    await signUpLink.click();
    await expect(page).toHaveURL(/\/signup/);

    // Verify sign-up page content
    await expect(
      page.getByRole("heading", { name: /create an account/i })
    ).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /create account/i })
    ).toBeVisible();
  });

  test("shows error on invalid credentials", async ({ page }) => {
    await page.goto("/login");

    await page.getByLabel("Email").fill("nonexistent@netmap-test.dev");
    await page.getByLabel("Password").fill("WrongPassword999!");
    await page.getByRole("button", { name: /sign in/i }).click();

    // An error message should appear — Supabase returns "Invalid login credentials"
    // We just assert that *some* error text is displayed without hardcoding the
    // exact wording, which can vary by Supabase version.
    const error = page.locator("p.text-destructive, [role='alert']").first();
    await expect(error).toBeVisible({ timeout: 10_000 });
    await expect(error).not.toBeEmpty();

    // We should still be on /login
    await expect(page).toHaveURL(/\/login/);
  });
});
