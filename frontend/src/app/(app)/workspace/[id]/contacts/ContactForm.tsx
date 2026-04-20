"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";
import type { ContactRead } from "./ContactsClient";

interface ContactFormProps {
  workspaceId: string;
  contact?: ContactRead;
  onSave: (contact: ContactRead) => void;
  onDelete?: () => void;
  onCancel: () => void;
}

const API = process.env.NEXT_PUBLIC_API_URL;

async function getAccessToken(): Promise<string> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? "";
}

export default function ContactForm({
  workspaceId,
  contact,
  onSave,
  onDelete,
  onCancel,
}: ContactFormProps) {
  const isEdit = !!contact;

  const [name, setName] = useState(contact?.name ?? "");
  const [jobTitle, setJobTitle] = useState(contact?.job_title ?? "");
  const [company, setCompany] = useState(contact?.company ?? "");
  const [email, setEmail] = useState(contact?.email ?? "");
  const [phone, setPhone] = useState(contact?.phone ?? "");
  const [linkedinUrl, setLinkedinUrl] = useState(contact?.linkedin_url ?? "");
  const [notes, setNotes] = useState(contact?.notes ?? "");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError("");

    const body: Record<string, string> = { name: name.trim() };
    if (jobTitle.trim()) body.job_title = jobTitle.trim();
    if (company.trim()) body.company = company.trim();
    if (email.trim()) body.email = email.trim();
    if (phone.trim()) body.phone = phone.trim();
    if (linkedinUrl.trim()) body.linkedin_url = linkedinUrl.trim();
    if (notes.trim()) body.notes = notes.trim();

    const token = await getAccessToken();
    const url = isEdit
      ? `${API}/api/v1/workspaces/${workspaceId}/contacts/${contact!.id}`
      : `${API}/api/v1/workspaces/${workspaceId}/contacts`;

    const res = await fetch(url, {
      method: isEdit ? "PATCH" : "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data?.detail ?? "Something went wrong. Please try again.");
      return;
    }

    const saved: ContactRead = await res.json();
    onSave(saved);
  }

  async function handleDelete() {
    if (!contact || !onDelete) return;
    const confirmed = window.confirm(
      `Delete "${contact.name}"? This cannot be undone.`
    );
    if (!confirmed) return;

    setLoading(true);
    setError("");

    const token = await getAccessToken();
    const res = await fetch(
      `${API}/api/v1/workspaces/${workspaceId}/contacts/${contact.id}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    setLoading(false);

    if (res.ok || res.status === 204) {
      onDelete();
    } else {
      setError("Failed to delete contact.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Name */}
      <div className="space-y-1.5">
        <label
          htmlFor="cf-name"
          className="text-sm font-medium text-foreground"
        >
          Name <span className="text-destructive">*</span>
        </label>
        <input
          id="cf-name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Jane Smith"
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Job title */}
      <div className="space-y-1.5">
        <label
          htmlFor="cf-job-title"
          className="text-sm font-medium text-foreground"
        >
          Job title
        </label>
        <input
          id="cf-job-title"
          type="text"
          value={jobTitle}
          onChange={(e) => setJobTitle(e.target.value)}
          placeholder="Senior Engineer"
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Company */}
      <div className="space-y-1.5">
        <label
          htmlFor="cf-company"
          className="text-sm font-medium text-foreground"
        >
          Company
        </label>
        <input
          id="cf-company"
          type="text"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          placeholder="Acme Corp"
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Email */}
      <div className="space-y-1.5">
        <label
          htmlFor="cf-email"
          className="text-sm font-medium text-foreground"
        >
          Email
        </label>
        <input
          id="cf-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="jane@example.com"
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Phone */}
      <div className="space-y-1.5">
        <label
          htmlFor="cf-phone"
          className="text-sm font-medium text-foreground"
        >
          Phone
        </label>
        <input
          id="cf-phone"
          type="text"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+1 555 000 0000"
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* LinkedIn URL */}
      <div className="space-y-1.5">
        <label
          htmlFor="cf-linkedin"
          className="text-sm font-medium text-foreground"
        >
          LinkedIn URL
        </label>
        <input
          id="cf-linkedin"
          type="url"
          value={linkedinUrl}
          onChange={(e) => setLinkedinUrl(e.target.value)}
          placeholder="https://linkedin.com/in/janesmith"
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        <label
          htmlFor="cf-notes"
          className="text-sm font-medium text-foreground"
        >
          Notes
        </label>
        <textarea
          id="cf-notes"
          rows={4}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any context about this contact…"
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
        />
      </div>

      {/* Inline error */}
      {error && <p className="text-xs text-destructive">{error}</p>}

      {/* Actions */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
        </div>

        {isEdit && onDelete && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={loading}
            className="text-sm text-destructive hover:underline disabled:opacity-50"
          >
            Delete contact
          </button>
        )}
      </div>
    </form>
  );
}
