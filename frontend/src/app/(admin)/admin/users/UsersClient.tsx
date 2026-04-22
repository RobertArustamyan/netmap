"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";
import type { AdminUser } from "./page";

const API = process.env.NEXT_PUBLIC_API_URL;

async function getAccessToken(): Promise<string> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? "";
}

interface Props {
  initialUsers: AdminUser[];
}

export default function UsersClient({ initialUsers }: Props) {
  const [users, setUsers] = useState<AdminUser[]>(initialUsers);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete(userId: string) {
    setDeletingId(userId);
    setError(null);
    try {
      const token = await getAccessToken();
      const res = await fetch(`${API}/api/v1/admin/users/${userId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok || res.status === 204) {
        setUsers((prev) => prev.filter((u) => u.id !== userId));
        setConfirmingId(null);
      } else {
        const body = await res.json().catch(() => ({}));
        setError(body?.detail ?? "Failed to delete user.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setDeletingId(null);
    }
  }

  function formatDate(iso: string | null): string {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                Email
              </th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                Superadmin
              </th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                Workspaces
              </th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                Created
              </th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                Last Active
              </th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  No users found.
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="hover:bg-accent/30">
                  <td className="px-4 py-3 text-foreground">{user.email}</td>
                  <td className="px-4 py-3">
                    {user.is_superadmin ? (
                      <span className="inline-block rounded-full px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                        Yes
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-foreground">
                    {user.workspace_count}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDate(user.created_at)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDate(user.last_active_at)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {confirmingId === user.id ? (
                      <span className="inline-flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">Are you sure?</span>
                        <button
                          onClick={() => handleDelete(user.id)}
                          disabled={deletingId === user.id}
                          className="text-destructive hover:underline disabled:opacity-50 font-medium"
                        >
                          {deletingId === user.id ? "Deleting…" : "Confirm"}
                        </button>
                        <button
                          onClick={() => setConfirmingId(null)}
                          className="text-muted-foreground hover:underline"
                        >
                          Cancel
                        </button>
                      </span>
                    ) : (
                      <button
                        onClick={() => setConfirmingId(user.id)}
                        className="text-sm text-destructive hover:underline"
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
