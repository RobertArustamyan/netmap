"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";
import type { AdminWorkspace } from "./page";
import { adminApi, ApiError } from "@/lib/api";

async function getAccessToken(): Promise<string> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? "";
}

interface PlanEditState {
  tier: string;
  max_members: number;
  max_contacts: number;
}

interface Props {
  initialWorkspaces: AdminWorkspace[];
  error: string | null;
}

export default function WorkspacesClient({ initialWorkspaces, error }: Props) {
  const [workspaces, setWorkspaces] = useState<AdminWorkspace[]>(initialWorkspaces);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<PlanEditState>({
    tier: "free",
    max_members: 5,
    max_contacts: 100,
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  function openEdit(ws: AdminWorkspace) {
    setEditingId(ws.id);
    setEditValues({
      tier: ws.plan_tier,
      max_members: 5,
      max_contacts: 100,
    });
    setSaveError(null);
  }

  function closeEdit() {
    setEditingId(null);
    setSaveError(null);
  }

  async function handleSavePlan(workspaceId: string) {
    setSaving(true);
    setSaveError(null);
    try {
      const token = await getAccessToken();
      const updated = await adminApi.updateWorkspacePlan(token, workspaceId, { tier: editValues.tier }) as AdminWorkspace;
      setWorkspaces((prev) =>
        prev.map((w) => (w.id === workspaceId ? updated : w))
      );
      closeEdit();
    } catch (e) {
      setSaveError(e instanceof ApiError ? e.message : "Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  return (
    <>
      {error && (
        <p className="text-sm text-destructive mb-4">{error}</p>
      )}
      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                Name
              </th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                Owner
              </th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                Members
              </th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                Contacts
              </th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                Plan
              </th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                Created
              </th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {workspaces.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  No workspaces found.
                </td>
              </tr>
            ) : (
              workspaces.map((ws) => (
                <tr key={ws.id} className="hover:bg-accent/30">
                  <td className="px-4 py-3 text-foreground font-medium">
                    {ws.name}
                    <span className="ml-1.5 text-xs text-muted-foreground font-normal">
                      /{ws.slug}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {ws.owner_email}
                  </td>
                  <td className="px-4 py-3 text-foreground">
                    {ws.member_count}
                  </td>
                  <td className="px-4 py-3 text-foreground">
                    {ws.contact_count}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                        ws.plan_tier === "pro"
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {ws.plan_tier}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDate(ws.created_at)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => openEdit(ws)}
                      className="text-sm text-primary hover:underline"
                    >
                      Edit plan
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Plan edit modal */}
      {editingId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-lg border border-border shadow-lg p-6 w-full max-w-sm space-y-4">
            <h3 className="text-base font-semibold text-foreground">
              Edit plan
            </h3>
            <p className="text-sm text-muted-foreground">
              Update the plan tier and limits for this workspace.
            </p>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">
                  Tier
                </label>
                <input
                  type="text"
                  value={editValues.tier}
                  onChange={(e) =>
                    setEditValues((prev) => ({ ...prev, tier: e.target.value }))
                  }
                  placeholder="free / pro"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">
                  Max members
                </label>
                <input
                  type="number"
                  min={1}
                  value={editValues.max_members}
                  onChange={(e) =>
                    setEditValues((prev) => ({
                      ...prev,
                      max_members: parseInt(e.target.value, 10) || 1,
                    }))
                  }
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">
                  Max contacts
                </label>
                <input
                  type="number"
                  min={1}
                  value={editValues.max_contacts}
                  onChange={(e) =>
                    setEditValues((prev) => ({
                      ...prev,
                      max_contacts: parseInt(e.target.value, 10) || 1,
                    }))
                  }
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            {saveError && (
              <p className="text-xs text-destructive">{saveError}</p>
            )}

            <div className="flex justify-end gap-3 pt-1">
              <button
                onClick={closeEdit}
                disabled={saving}
                className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSavePlan(editingId)}
                disabled={saving || editValues.tier.trim() === ""}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
