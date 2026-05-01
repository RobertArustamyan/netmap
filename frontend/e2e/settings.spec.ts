/**
 * settings.spec.ts — User account settings page tests
 *
 * Uses the stored auth state from global-setup so no re-login is needed.
 * All tests navigate to /settings via beforeEach to stay independent.
 */

import { test, expect } from "@playwright/test";

test.describe("Account Settings (/settings)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/settings");
    await expect(page).toHaveURL(/\/settings/, { timeout: 10_000 });
  });

  test("navigates to settings from dashboard", async ({ page }) => {
    // Start from the dashboard instead of using beforeEach navigation
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });

    // The header shows the user's email as a link to /settings
    const accountLink = page.getByRole("link", { name: /@/i });
    await expect(accountLink).toBeVisible();
    await accountLink.click();

    await expect(page).toHaveURL(/\/settings/, { timeout: 10_000 });

    // The Account section heading should be present
    await expect(
      page.getByRole("heading", { name: /account/i })
    ).toBeVisible();
  });

  test("displays the current user email (read-only)", async ({ page }) => {
    // The email input is labelled "Email" and must be read-only
    const emailInput = page.getByLabel(/^email$/i);
    await expect(emailInput).toBeVisible();

    // Should carry a real email address (non-empty)
    const value = await emailInput.inputValue();
    expect(value).toMatch(/@/);

    // Must not be editable
    const isReadOnly = await emailInput.evaluate(
      (el) => (el as HTMLInputElement).readOnly
    );
    expect(isReadOnly).toBe(true);
  });

  test("shows change password form", async ({ page }) => {
    // All three password fields must be visible
    await expect(page.getByLabel(/current password/i)).toBeVisible();
    await expect(page.getByLabel(/new password/i)).toBeVisible();
    await expect(page.getByLabel(/confirm new password/i)).toBeVisible();

    // The submit button must be present
    await expect(
      page.getByRole("button", { name: /update password/i })
    ).toBeVisible();
  });

  test("shows an error when current password is wrong", async ({ page }) => {
    // Fill in a clearly wrong current password and a valid new password
    await page.getByLabel(/current password/i).fill("wrong-password-123");
    await page.getByLabel(/new password/i).fill("NewValidPass1!");
    await page.getByLabel(/confirm new password/i).fill("NewValidPass1!");

    await page.getByRole("button", { name: /update password/i }).click();

    // The component re-authenticates before updating; a bad current password
    // must surface an error message visible to the user
    await expect(
      page.getByText(/current password is incorrect/i)
    ).toBeVisible({ timeout: 10_000 });
  });

  test("danger zone section is visible", async ({ page }) => {
    // Section heading
    await expect(
      page.getByRole("heading", { name: /danger zone/i })
    ).toBeVisible();

    // Delete account label / text
    await expect(page.getByText(/delete account/i)).toBeVisible();

    // Confirmation input asking for the word DELETE
    await expect(page.getByLabel(/type.*delete.*to confirm/i)).toBeVisible();

    // The delete button exists but is disabled until the confirmation word is typed
    const deleteBtn = page.getByRole("button", { name: /delete account/i });
    await expect(deleteBtn).toBeVisible();
    await expect(deleteBtn).toBeDisabled();
  });
});
