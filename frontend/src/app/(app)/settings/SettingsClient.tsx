"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

interface Props {
  email: string;
}

export default function SettingsClient({ email }: Props) {
  const router = useRouter();

  // ── Section 1: Change password ───────────────────────────────────────────
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordSaving, startPasswordSave] = useTransition();

  async function handleChangePassword() {
    setPasswordError("");
    setPasswordSuccess(false);

    if (!currentPassword.trim()) {
      setPasswordError("Please enter your current password.");
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirmation do not match.");
      return;
    }

    const supabase = createClient();

    // Re-authenticate with the current password first
    const { data: sessionData } = await supabase.auth.getSession();
    const userEmail = sessionData?.session?.user?.email;

    if (!userEmail) {
      setPasswordError("Could not verify your session. Please log in again.");
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: userEmail,
      password: currentPassword,
    });

    if (signInError) {
      setPasswordError("Current password is incorrect.");
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      setPasswordError(error.message ?? "Failed to update password.");
      return;
    }

    setPasswordSuccess(true);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  }

  // ── Section 2: Danger zone ───────────────────────────────────────────────
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleteMessage, setDeleteMessage] = useState("");
  const [deleting, startDelete] = useTransition();

  async function handleDeleteAccount() {
    setDeleteError("");
    setDeleteMessage("");

    if (deleteConfirm !== "DELETE") {
      setDeleteError('Type the word DELETE to confirm.');
      return;
    }

    const supabase = createClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      setDeleteError(error.message ?? "Failed to sign out.");
      return;
    }

    setDeleteMessage(
      "You have been signed out. Contact support to fully delete your account."
    );

    setTimeout(() => router.push("/login"), 3000);
  }

  // ────────────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto px-6 py-10 space-y-10">
      {/* ── Section 1: Account ─────────────────────────────────────────── */}
      <section className="space-y-6">
        <h2 className="text-lg font-semibold pb-2 border-b border-border">
          Account
        </h2>

        {/* Email (read-only) */}
        <div className="space-y-1.5">
          <label
            htmlFor="acc-email"
            className="text-sm font-medium text-foreground"
          >
            Email
          </label>
          <input
            id="acc-email"
            type="email"
            readOnly
            value={email}
            className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground cursor-not-allowed focus:outline-none"
          />
          <p className="text-xs text-muted-foreground">
            Contact support to change your email address.
          </p>
        </div>

        {/* Change password */}
        <div className="rounded-lg border border-border p-6 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">
            Change password
          </h3>

          <div className="space-y-1.5">
            <label
              htmlFor="acc-current-pw"
              className="text-sm font-medium text-foreground"
            >
              Current password
            </label>
            <input
              id="acc-current-pw"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="acc-new-pw"
              className="text-sm font-medium text-foreground"
            >
              New password
            </label>
            <input
              id="acc-new-pw"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              placeholder="Minimum 8 characters"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="acc-confirm-pw"
              className="text-sm font-medium text-foreground"
            >
              Confirm new password
            </label>
            <input
              id="acc-confirm-pw"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {passwordError && (
            <p className="text-xs text-destructive">{passwordError}</p>
          )}
          {passwordSuccess && (
            <p className="text-xs text-green-600 dark:text-green-400">
              Password updated successfully.
            </p>
          )}

          <button
            onClick={() =>
              startPasswordSave(() => {
                handleChangePassword();
              })
            }
            disabled={
              passwordSaving ||
              !currentPassword.trim() ||
              !newPassword.trim() ||
              !confirmPassword.trim()
            }
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {passwordSaving ? "Saving…" : "Update password"}
          </button>
        </div>
      </section>

      {/* ── Section 2: Danger zone ──────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold pb-2 border-b border-border">
          Danger zone
        </h2>

        <div className="border border-red-200 rounded-lg p-6 mt-8 space-y-4">
          <div>
            <p className="text-sm font-medium text-foreground">
              Delete account
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              This will sign you out immediately. To fully remove your data,
              contact support after confirming below.
            </p>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="danger-confirm"
              className="text-sm font-medium text-foreground"
            >
              Type{" "}
              <span className="font-mono font-semibold text-destructive">
                DELETE
              </span>{" "}
              to confirm
            </label>
            <input
              id="danger-confirm"
              type="text"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder="DELETE"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-destructive"
            />
          </div>

          {deleteError && (
            <p className="text-xs text-destructive">{deleteError}</p>
          )}
          {deleteMessage && (
            <p className="text-xs text-muted-foreground">{deleteMessage}</p>
          )}

          <button
            onClick={() =>
              startDelete(() => {
                handleDeleteAccount();
              })
            }
            disabled={deleting || deleteConfirm !== "DELETE"}
            className="rounded-md border border-destructive px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {deleting ? "Processing…" : "Delete account"}
          </button>
        </div>
      </section>
    </div>
  );
}
