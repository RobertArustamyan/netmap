/**
 * contacts.spec.ts — Contacts page tests
 *
 * Uses stored auth state. Creates a fresh workspace via the backend API in
 * beforeAll so each test run is isolated and repeatable.
 */

import { test, expect, request as playwrightRequest } from "@playwright/test";

// ── Shared state ──────────────────────────────────────────────────────────────

let workspaceId: string;
let accessToken: string;

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

async function getToken(email: string, password: string): Promise<string> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(`Supabase login failed: ${JSON.stringify(body)}`);
  }

  const data = await res.json();
  return data.access_token as string;
}

// ── Setup / teardown ──────────────────────────────────────────────────────────

test.beforeAll(async () => {
  const email = process.env.E2E_TEST_EMAIL!;
  const password = process.env.E2E_TEST_PASSWORD!;

  // Obtain a fresh JWT for direct API calls
  accessToken = await getToken(email, password);

  // Create a dedicated workspace for contacts tests
  const apiCtx = await playwrightRequest.newContext();
  const res = await apiCtx.post(`${API_BASE}/api/v1/workspaces`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    data: { name: `E2E Contacts WS ${Date.now()}` },
  });

  expect(res.ok()).toBeTruthy();
  const workspace = await res.json();
  workspaceId = workspace.id;

  await apiCtx.dispose();
});

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe("Contacts page", () => {
  test("contacts page loads and shows empty state or table", async ({
    page,
  }) => {
    await page.goto(`/workspace/${workspaceId}/contacts`);

    // Either the empty state message or the contacts table should be visible
    const emptyMsg = page.getByText(/no contacts yet/i);
    const table = page.locator("table");

    // At least one of them must be visible
    await expect(emptyMsg.or(table)).toBeVisible({ timeout: 10_000 });
  });

  test("can add a new contact", async ({ page }) => {
    await page.goto(`/workspace/${workspaceId}/contacts`);

    // Click the "Add contact" button (toolbar or empty-state button)
    await page.getByRole("button", { name: /add contact/i }).first().click();

    // The slide-in panel should appear with the "Add contact" heading
    await expect(
      page.getByRole("heading", { name: /add contact/i })
    ).toBeVisible();

    // Fill in the required Name field
    const contactName = `E2E Contact ${Date.now()}`;
    await page.getByLabel(/^Name/i).fill(contactName);

    // Fill optional Company field
    await page.getByLabel(/company/i).fill("Playwright Inc");

    // Save
    await page.getByRole("button", { name: /^save$/i }).click();

    // Panel should close; contact should appear in the table
    await expect(
      page.getByRole("heading", { name: /add contact/i })
    ).not.toBeVisible({ timeout: 5_000 });

    await expect(page.getByText(contactName)).toBeVisible({ timeout: 10_000 });
  });

  test("can search for a contact by name", async ({ page }) => {
    // Pre-create a contact via API for a reliable search target
    const apiCtx = await playwrightRequest.newContext();
    const uniqueName = `SearchTarget-${Date.now()}`;

    const createRes = await apiCtx.post(
      `${API_BASE}/api/v1/workspaces/${workspaceId}/contacts`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        data: { name: uniqueName, company: "SearchCo" },
      }
    );
    expect(createRes.ok()).toBeTruthy();
    await apiCtx.dispose();

    // Load the contacts page
    await page.goto(`/workspace/${workspaceId}/contacts`);

    // Type in the search box
    const searchInput = page.getByPlaceholder(/search by name/i);
    await searchInput.fill(uniqueName);

    // The seeded contact should be visible
    await expect(page.getByText(uniqueName)).toBeVisible({ timeout: 5_000 });

    // An unrelated name should not be visible (search narrows results)
    // Also check that the contact count reflects the filter
    // (can't know exact count but at least our contact is shown)
  });

  test("can delete a contact", async ({ page }) => {
    // Create a contact via API to delete
    const apiCtx = await playwrightRequest.newContext();
    const deleteName = `ToDelete-${Date.now()}`;

    const createRes = await apiCtx.post(
      `${API_BASE}/api/v1/workspaces/${workspaceId}/contacts`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        data: { name: deleteName },
      }
    );
    expect(createRes.ok()).toBeTruthy();
    await apiCtx.dispose();

    // Load the contacts page
    await page.goto(`/workspace/${workspaceId}/contacts`);

    // The contact must be visible before we try to open it
    await expect(page.getByText(deleteName)).toBeVisible({ timeout: 10_000 });

    // Click the row to open the edit panel
    await page.getByText(deleteName).click();

    // The edit panel heading should appear
    await expect(
      page.getByRole("heading", { name: /edit contact/i })
    ).toBeVisible();

    // Click "Delete contact" link/button in the panel
    const deleteBtn = page.getByRole("button", { name: /delete contact/i });
    await expect(deleteBtn).toBeVisible();

    // Handle the browser confirm() dialog
    page.on("dialog", (dialog) => dialog.accept());
    await deleteBtn.click();

    // Panel should close and the contact row should disappear
    await expect(
      page.getByRole("heading", { name: /edit contact/i })
    ).not.toBeVisible({ timeout: 5_000 });

    await expect(page.getByText(deleteName)).not.toBeVisible({
      timeout: 5_000,
    });
  });
});
