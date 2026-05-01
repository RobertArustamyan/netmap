/**
 * dashboard.spec.ts — Dashboard page tests
 *
 * Uses the stored auth state from global-setup so no re-login is needed.
 */

import { test, expect } from "@playwright/test";

test.describe("Dashboard", () => {
  test("shows the dashboard page after login", async ({ page }) => {
    await page.goto("/dashboard");

    // Verify we land on the dashboard (not redirected to login)
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });

    // The NetMap brand name appears in the header
    await expect(page.getByText("NetMap")).toBeVisible();

    // Page heading
    await expect(
      page.getByRole("heading", { name: /your workspaces/i })
    ).toBeVisible();
  });

  test("shows create workspace button", async ({ page }) => {
    await page.goto("/dashboard");

    // There should be a link/button to create a new workspace
    const newWorkspaceBtn = page.getByRole("link", { name: /new workspace/i });
    await expect(newWorkspaceBtn).toBeVisible();
  });

  test("can create a new workspace", async ({ page }) => {
    await page.goto("/dashboard/new");

    await expect(
      page.getByRole("heading", { name: /new workspace/i })
    ).toBeVisible();

    const workspaceName = `E2E Test Workspace ${Date.now()}`;

    await page.getByLabel(/workspace name/i).fill(workspaceName);
    await page.getByRole("button", { name: /create workspace/i }).click();

    // After creation the app redirects to /workspace/<id>/graph
    await page.waitForURL(/\/workspace\/.+\/graph/, { timeout: 15_000 });

    // The URL should contain a UUID-like segment
    expect(page.url()).toMatch(/\/workspace\/[0-9a-f-]+\/graph/i);
  });

  test("created workspace appears in the dashboard list", async ({ page }) => {
    // Create a workspace first via the new workspace form
    await page.goto("/dashboard/new");

    const workspaceName = `E2E Listed Workspace ${Date.now()}`;
    await page.getByLabel(/workspace name/i).fill(workspaceName);
    await page.getByRole("button", { name: /create workspace/i }).click();

    // Wait for the redirect to the graph page
    await page.waitForURL(/\/workspace\/.+\/graph/, { timeout: 15_000 });

    // Navigate back to dashboard
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/dashboard/);

    // The workspace card should appear in the list
    await expect(page.getByText(workspaceName)).toBeVisible({ timeout: 10_000 });
  });
});
