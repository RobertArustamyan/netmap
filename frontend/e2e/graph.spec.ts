/**
 * graph.spec.ts — Graph canvas tests
 *
 * Uses stored auth state. Creates a workspace + self-contact via the API in
 * beforeAll so there is always at least one member node on the canvas.
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

// ── Setup ─────────────────────────────────────────────────────────────────────

test.beforeAll(async () => {
  const email = process.env.E2E_TEST_EMAIL!;
  const password = process.env.E2E_TEST_PASSWORD!;

  accessToken = await getToken(email, password);

  const apiCtx = await playwrightRequest.newContext();

  // Create workspace
  const wsRes = await apiCtx.post(`${API_BASE}/api/v1/workspaces`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    data: { name: `E2E Graph WS ${Date.now()}` },
  });
  expect(wsRes.ok()).toBeTruthy();
  const workspace = await wsRes.json();
  workspaceId = workspace.id;

  // Ensure member has a complete profile (self-contact) so the graph isn't empty.
  // The backend auto-creates a self-contact on workspace creation via the member
  // record, but we also update the profile here to guarantee profile_complete=true.
  await apiCtx.patch(`${API_BASE}/api/v1/workspaces/${workspaceId}/me`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    data: {
      name: "E2E Graph User",
      job_title: "QA Engineer",
      company: "Playwright Ltd",
    },
  });

  await apiCtx.dispose();
});

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe("Graph page", () => {
  test("graph page loads with canvas", async ({ page }) => {
    await page.goto(`/workspace/${workspaceId}/graph`);

    // React Flow renders an SVG viewport
    // Wait for either the canvas (.react-flow) or the empty/error state
    const canvas = page.locator(".react-flow");
    const emptyState = page.getByText(/no contacts yet/i);
    const errorState = page.getByText(/failed to load/i);

    await expect(canvas.or(emptyState).or(errorState)).toBeVisible({
      timeout: 15_000,
    });

    // We specifically want the canvas (not an error)
    await expect(errorState).not.toBeVisible();
  });

  test("member node appears on the graph", async ({ page }) => {
    await page.goto(`/workspace/${workspaceId}/graph`);

    // Wait for the React Flow canvas to be in the DOM
    await expect(page.locator(".react-flow")).toBeVisible({ timeout: 15_000 });

    // Self-contact nodes have an indigo background and a "Member" badge
    // The ContactNode component renders a span with text "Member" for is_self nodes
    const memberBadge = page.getByText("Member").first();
    await expect(memberBadge).toBeVisible({ timeout: 10_000 });
  });

  test("search input is present on graph page", async ({ page }) => {
    await page.goto(`/workspace/${workspaceId}/graph`);

    // Wait for canvas
    await expect(page.locator(".react-flow")).toBeVisible({ timeout: 15_000 });

    // The floating search input is rendered inside the graph overlay
    const searchInput = page.getByPlaceholder(/search contacts/i);
    await expect(searchInput).toBeVisible({ timeout: 10_000 });

    // Typing should not cause a crash
    await searchInput.fill("test");
    await expect(searchInput).toHaveValue("test");
  });

  test("find path button is present on graph page", async ({ page }) => {
    await page.goto(`/workspace/${workspaceId}/graph`);

    await expect(page.locator(".react-flow")).toBeVisible({ timeout: 15_000 });

    // "Find path" toggle button should appear in the graph toolbar overlay
    const findPathBtn = page.getByRole("button", { name: /find path/i });
    await expect(findPathBtn).toBeVisible({ timeout: 10_000 });
  });
});
