"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import type { ContactRead, TagRead } from "./ContactsClient";

interface ContactFormProps {
  workspaceId: string;
  contact?: ContactRead;
  onSave: (contact: ContactRead) => void;
  onDelete?: () => void;
  onCancel: () => void;
  onTagsChange?: (contactId: string, tags: TagRead[]) => void;
  onWorkspaceTagCreated?: (tag: TagRead) => void;
}

const API = process.env.NEXT_PUBLIC_API_URL;

const TAG_PALETTE = [
  "#6366f1",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#3b82f6",
  "#8b5cf6",
];

function tagColor(name: string): string {
  return TAG_PALETTE[name.charCodeAt(0) % TAG_PALETTE.length];
}

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
  onTagsChange,
  onWorkspaceTagCreated,
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
  const [planLimitError, setPlanLimitError] = useState("");

  // Tags state
  const [contactTags, setContactTags] = useState<TagRead[]>(
    contact?.tags ?? []
  );
  const [workspaceTags, setWorkspaceTags] = useState<TagRead[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [tagLoading, setTagLoading] = useState(false);
  const [tagError, setTagError] = useState("");

  // Fetch workspace tags on mount
  useEffect(() => {
    async function fetchTags() {
      const token = await getAccessToken();
      const res = await fetch(`${API}/api/v1/workspaces/${workspaceId}/tags`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data: TagRead[] = await res.json();
        setWorkspaceTags(data);
      }
    }
    fetchTags();
  }, [workspaceId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError("");
    setPlanLimitError("");

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

    if (res.status === 402) {
      const body = await res.json().catch(() => ({}));
      const detail = body?.detail;
      if (detail?.code === "plan_limit_exceeded") {
        setPlanLimitError(
          `Contact limit reached (${detail.current}/${detail.limit}). Upgrade to Pro for unlimited contacts.`
        );
      } else {
        setPlanLimitError("Contact limit reached. Upgrade to Pro.");
      }
      return;
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data?.detail ?? "Something went wrong. Please try again.");
      return;
    }

    const saved: ContactRead = await res.json();
    // Merge in the current contactTags since the API response may not include them
    onSave({ ...saved, tags: contactTags });
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

  async function handleAddTag(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = tagInput.trim();
    if (!trimmed) return;

    // Can only attach tags when editing an existing contact
    if (!contact) {
      setTagError("Save the contact first, then add tags.");
      return;
    }

    // Check if the tag is already attached
    if (contactTags.some((t) => t.name.toLowerCase() === trimmed.toLowerCase())) {
      setTagInput("");
      return;
    }

    setTagLoading(true);
    setTagError("");

    const token = await getAccessToken();

    // Find or create the tag in workspace tags
    let tag = workspaceTags.find(
      (t) => t.name.toLowerCase() === trimmed.toLowerCase()
    );

    if (!tag) {
      // Create it
      const color = tagColor(trimmed);
      const createRes = await fetch(
        `${API}/api/v1/workspaces/${workspaceId}/tags`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ name: trimmed, color }),
        }
      );

      if (!createRes.ok) {
        const data = await createRes.json().catch(() => ({}));
        setTagError(data?.detail ?? "Failed to create tag.");
        setTagLoading(false);
        return;
      }

      tag = (await createRes.json()) as TagRead;
      setWorkspaceTags((prev) => [...prev, tag!]);
      onWorkspaceTagCreated?.(tag!);
    }

    // Attach the tag to the contact
    const attachRes = await fetch(
      `${API}/api/v1/workspaces/${workspaceId}/tags/contacts/${contact.id}/tags/${tag.id}`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    setTagLoading(false);

    if (!attachRes.ok && attachRes.status !== 201) {
      const data = await attachRes.json().catch(() => ({}));
      setTagError(data?.detail ?? "Failed to attach tag.");
      return;
    }

    const newTags = [...contactTags, tag!];
    setContactTags(newTags);
    onTagsChange?.(contact.id, newTags);
    setTagInput("");
  }

  async function handleRemoveTag(tagId: string) {
    if (!contact) return;

    const token = await getAccessToken();
    const res = await fetch(
      `${API}/api/v1/workspaces/${workspaceId}/tags/contacts/${contact.id}/tags/${tagId}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (res.ok || res.status === 204) {
      const newTags = contactTags.filter((t) => t.id !== tagId);
      setContactTags(newTags);
      onTagsChange?.(contact.id, newTags);
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

      {/* Tags */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Tags</label>

        {/* Attached tag pills */}
        {contactTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {contactTags.map((tag) => (
              <span
                key={tag.id}
                className="inline-flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded-full text-white"
                style={{ backgroundColor: tag.color ?? "#6b7280" }}
              >
                {tag.name}
                {isEdit && (
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag.id)}
                    aria-label={`Remove tag ${tag.name}`}
                    className="ml-0.5 leading-none hover:opacity-75 transition-opacity"
                  >
                    ×
                  </button>
                )}
              </span>
            ))}
          </div>
        )}

        {/* Add tag input — only shown when editing an existing contact */}
        {isEdit ? (
          <div className="flex gap-2">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddTag(e as unknown as React.FormEvent);
                }
              }}
              placeholder="Add a tag…"
              className="flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={tagLoading}
            />
            <button
              type="button"
              onClick={handleAddTag}
              disabled={tagLoading || !tagInput.trim()}
              className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {tagLoading ? "…" : "Add"}
            </button>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Save the contact first to add tags.
          </p>
        )}

        {tagError && <p className="text-xs text-destructive">{tagError}</p>}
      </div>

      {/* Inline error */}
      {error && <p className="text-xs text-destructive">{error}</p>}
      {planLimitError && (
        <div className="text-xs text-destructive space-y-1">
          <p>{planLimitError}</p>
          <Link href="/pricing" className="underline hover:opacity-75 transition-opacity">
            View plans
          </Link>
        </div>
      )}

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
