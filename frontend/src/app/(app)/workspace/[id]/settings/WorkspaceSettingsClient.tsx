"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { workspacesApi, authApi, billingApi, ApiError } from "@/lib/api";

interface WorkspaceRead {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  created_at: string;
}

interface MemberRead {
  user_id: string;
  role: "admin" | "member";
  joined_at: string;
  email: string;
  display_name: string | null;
}

interface Props {
  workspace: WorkspaceRead;
  members: MemberRead[];
  currentUserId: string;
  isAdmin: boolean;
}

async function getAccessToken(): Promise<string> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? "";
}

export default function WorkspaceSettingsClient({
  workspace,
  members: initialMembers,
  currentUserId,
  isAdmin,
}: Props) {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const workspaceId = params?.id ?? workspace.id;

  // ── Section 1: General ───────────────────────────────────────────────────
  const [workspaceName, setWorkspaceName] = useState(workspace.name);
  const [nameError, setNameError] = useState("");
  const [nameSaving, startNameSave] = useTransition();

  async function handleSaveName() {
    setNameError("");
    try {
      const token = await getAccessToken();
      await workspacesApi.update(token, workspaceId, { name: workspaceName });
      router.refresh();
    } catch (e) {
      setNameError(e instanceof ApiError ? e.message : "Failed to save name.");
    }
  }

  // ── Section 2: Members & Invite ──────────────────────────────────────────
  const [members, setMembers] = useState<MemberRead[]>(initialMembers);
  const [inviteUrl, setInviteUrl] = useState("");
  const [inviteCopied, setInviteCopied] = useState(false);
  const [inviteRotating, startInviteRotate] = useTransition();
  const [inviteError, setInviteError] = useState("");

  async function handleRotateLink() {
    setInviteError("");
    try {
      const token = await getAccessToken();
      const data = await authApi.generateInvite(token, workspaceId);
      setInviteUrl(data.invite_url);
    } catch {
      setInviteError("Failed to rotate invite link.");
    }
  }

  function handleCopyInvite() {
    const url = inviteUrl || `${window.location.origin}/invite/...`;
    navigator.clipboard.writeText(url).then(() => {
      setInviteCopied(true);
      setTimeout(() => setInviteCopied(false), 2000);
    });
  }

  async function handleRoleChange(userId: string, newRole: "admin" | "member") {
    try {
      const token = await getAccessToken();
      await workspacesApi.updateMember(token, workspaceId, userId, { role: newRole });
      setMembers((prev) =>
        prev.map((m) => (m.user_id === userId ? { ...m, role: newRole } : m))
      );
    } catch {
      // silently ignore
    }
  }

  async function handleRemoveMember(userId: string) {
    try {
      const token = await getAccessToken();
      await workspacesApi.removeMember(token, workspaceId, userId);
      setMembers((prev) => prev.filter((m) => m.user_id !== userId));
    } catch {
      // silently ignore
    }
  }

  // ── Section 3: Billing / Plan ────────────────────────────────────────────
  const [billingTier, setBillingTier] = useState<"free" | "pro" | null>(null);
  const [billingLoading, setBillingLoading] = useState(true);
  const [billingNotConfigured, setBillingNotConfigured] = useState(false);
  const [billingActionLoading, setBillingActionLoading] = useState(false);
  const [billingError, setBillingError] = useState("");

  useEffect(() => {
    async function fetchBillingStatus() {
      try {
        const token = await getAccessToken();
        const data = await billingApi.getStatus(token, workspaceId);
        setBillingTier(data.tier === "pro" ? "pro" : "free");
      } catch (e) {
        if (e instanceof ApiError && e.status === 503) {
          setBillingNotConfigured(true);
        }
      } finally {
        setBillingLoading(false);
      }
    }
    fetchBillingStatus();
  }, [workspaceId]);

  async function handleUpgrade() {
    setBillingError("");
    setBillingActionLoading(true);
    try {
      const token = await getAccessToken();
      const data = await billingApi.createCheckout(token, workspaceId);
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      }
    } catch (e) {
      if (e instanceof ApiError && e.status === 503) {
        setBillingNotConfigured(true);
      } else {
        setBillingError(
          e instanceof ApiError ? e.message : "Failed to start checkout. Please try again."
        );
      }
    } finally {
      setBillingActionLoading(false);
    }
  }

  async function handleManageSubscription() {
    setBillingError("");
    setBillingActionLoading(true);
    try {
      const token = await getAccessToken();
      const data = await billingApi.createPortal(token, workspaceId);
      if (data.portal_url) {
        window.location.href = data.portal_url;
      }
    } catch (e) {
      if (e instanceof ApiError && e.status === 503) {
        setBillingNotConfigured(true);
      } else {
        setBillingError(
          e instanceof ApiError ? e.message : "Failed to open billing portal. Please try again."
        );
      }
    } finally {
      setBillingActionLoading(false);
    }
  }

  // ── Section 4: Danger zone ───────────────────────────────────────────────
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleting, startDelete] = useTransition();

  async function handleDeleteWorkspace() {
    if (deleteConfirmName !== workspace.name) {
      setDeleteError("Workspace name does not match.");
      return;
    }
    setDeleteError("");
    try {
      const token = await getAccessToken();
      await workspacesApi.remove(token, workspaceId);
      router.push("/dashboard");
    } catch {
      setDeleteError("Failed to delete workspace.");
    }
  }

  // ────────────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto px-6 py-10 space-y-10">
      {/* ── Section 1: General ─────────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">General</h2>
        <div className="rounded-lg border border-border p-6 space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="workspace-name"
              className="text-sm font-medium text-foreground"
            >
              Workspace name
            </label>
            <input
              id="workspace-name"
              type="text"
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {nameError && (
              <p className="text-xs text-destructive">{nameError}</p>
            )}
          </div>
          <button
            onClick={() => startNameSave(() => { handleSaveName(); })}
            disabled={nameSaving || workspaceName.trim() === ""}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {nameSaving ? "Saving…" : "Save"}
          </button>
        </div>
      </section>

      {/* ── Section 2: Members & Invite ─────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">
          Members &amp; Invite
        </h2>
        <div className="rounded-lg border border-border p-6 space-y-6">
          {/* Invite link */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Invite link</p>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={inviteUrl || "(generate a link to see it here)"}
                className="flex-1 rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground focus:outline-none"
              />
              <button
                onClick={handleCopyInvite}
                className="rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors"
              >
                {inviteCopied ? "Copied!" : "Copy"}
              </button>
            </div>
            <button
              onClick={() =>
                startInviteRotate(() => { handleRotateLink(); })
              }
              disabled={inviteRotating}
              className="text-sm text-primary hover:underline disabled:opacity-50"
            >
              {inviteRotating ? "Rotating…" : "Rotate link"}
            </button>
            {inviteError && (
              <p className="text-xs text-destructive">{inviteError}</p>
            )}
          </div>

          {/* Members table */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Members</p>
            <div className="rounded-md border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground">
                      Email
                    </th>
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground">
                      Role
                    </th>
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground">
                      Joined
                    </th>
                    {isAdmin && (
                      <th className="text-right px-4 py-2 font-medium text-muted-foreground">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {members.map((member) => {
                    const isOwner = member.user_id === workspace.owner_id;
                    const isSelf = member.user_id === currentUserId;
                    const canEdit = isAdmin && !isOwner && !isSelf;

                    return (
                      <tr key={member.user_id} className="hover:bg-accent/30">
                        <td className="px-4 py-2 text-foreground">
                          {member.email}
                          {isOwner && (
                            <span className="ml-2 text-xs text-muted-foreground">
                              (owner)
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2">
                          <span
                            className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                              member.role === "admin"
                                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {isOwner ? "owner" : member.role}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-muted-foreground">
                          {new Date(member.joined_at).toLocaleDateString()}
                        </td>
                        {isAdmin && (
                          <td className="px-4 py-2 text-right space-x-2">
                            {canEdit && (
                              <>
                                <button
                                  onClick={() =>
                                    handleRoleChange(
                                      member.user_id,
                                      member.role === "admin"
                                        ? "member"
                                        : "admin"
                                    )
                                  }
                                  className="text-xs text-primary hover:underline"
                                >
                                  {member.role === "admin"
                                    ? "Make member"
                                    : "Make admin"}
                                </button>
                                <button
                                  onClick={() =>
                                    handleRemoveMember(member.user_id)
                                  }
                                  className="text-xs text-destructive hover:underline"
                                >
                                  Remove
                                </button>
                              </>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 3: Plan & Billing ───────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Plan &amp; Billing</h2>
        <div className="rounded-lg border border-border p-6 space-y-4">
          {billingLoading ? (
            <p className="text-sm text-muted-foreground">Loading plan info…</p>
          ) : billingNotConfigured ? (
            <p className="text-sm text-muted-foreground">
              Billing not configured.{" "}
              <Link href="/plans" className="underline hover:opacity-75 transition-opacity">
                View plans
              </Link>
            </p>
          ) : billingTier === "pro" ? (
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">Pro plan</span>
                  <span className="rounded-full bg-primary/15 text-primary text-xs font-semibold px-2 py-0.5">
                    Active
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Unlimited members and contacts.
                </p>
              </div>
              <button
                onClick={handleManageSubscription}
                disabled={billingActionLoading}
                className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {billingActionLoading ? "Redirecting…" : "Manage subscription"}
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">Free plan</span>
                  <span className="rounded-full bg-muted text-muted-foreground text-xs font-medium px-2 py-0.5">
                    Current
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Up to 5 members and 100 contacts.{" "}
                  <Link href="/plans" className="underline hover:opacity-75 transition-opacity">
                    Compare plans
                  </Link>
                </p>
              </div>
              <button
                onClick={handleUpgrade}
                disabled={billingActionLoading}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {billingActionLoading ? "Redirecting…" : "Upgrade to Pro"}
              </button>
            </div>
          )}
          {billingError && (
            <p className="text-xs text-destructive">{billingError}</p>
          )}
        </div>
      </section>

      {/* ── Section 4: Danger zone ──────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Danger zone</h2>
        <div className="rounded-lg border border-destructive/40 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">
                Delete this workspace
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Permanently remove this workspace and all its data. This cannot
                be undone.
              </p>
            </div>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="rounded-md border border-destructive px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
            >
              Delete workspace
            </button>
          </div>
        </div>
      </section>

      {/* ── Delete confirmation modal ───────────────────────────────────── */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-lg border border-border shadow-lg p-6 w-full max-w-md space-y-4">
            <h3 className="text-base font-semibold text-foreground">
              Delete workspace
            </h3>
            <p className="text-sm text-muted-foreground">
              This action is permanent and cannot be undone. Type{" "}
              <strong className="text-foreground">{workspace.name}</strong> to
              confirm.
            </p>
            <input
              type="text"
              value={deleteConfirmName}
              onChange={(e) => setDeleteConfirmName(e.target.value)}
              placeholder={workspace.name}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-destructive"
            />
            {deleteError && (
              <p className="text-xs text-destructive">{deleteError}</p>
            )}
            <div className="flex justify-end gap-3 pt-1">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmName("");
                  setDeleteError("");
                }}
                className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => startDelete(() => { handleDeleteWorkspace(); })}
                disabled={
                  deleting || deleteConfirmName !== workspace.name
                }
                className="rounded-md bg-destructive px-4 py-2 text-sm font-medium text-white hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {deleting ? "Deleting…" : "Delete workspace"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
