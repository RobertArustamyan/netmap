"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";

interface Props {
  workspaceId: string;
  workspaceName: string;
  initialEmail?: string;
  onComplete: () => void;
}

const API = process.env.NEXT_PUBLIC_API_URL;

async function getAccessToken(): Promise<string> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? "";
}

export default function ProfileSetupModal({
  workspaceId,
  workspaceName,
  initialEmail = "",
  onComplete,
}: Props) {
  const [name, setName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState(initialEmail);
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [phone, setPhone] = useState("");
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
    if (linkedinUrl.trim()) body.linkedin_url = linkedinUrl.trim();
    if (phone.trim()) body.phone = phone.trim();

    try {
      const token = await getAccessToken();
      const res = await fetch(`${API}/api/v1/workspaces/${workspaceId}/me`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.detail ?? "Something went wrong. Please try again.");
        setLoading(false);
        return;
      }

      onComplete();
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  return (
    /* Full-screen blocking overlay — no pointer events leak through */
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-8">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            Set up your profile
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            You&apos;re joining <strong className="text-gray-700">{workspaceName}</strong>.
            How should others see you?
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name */}
          <div className="space-y-1.5">
            <label
              htmlFor="ps-name"
              className="text-sm font-medium text-foreground"
            >
              Name <span className="text-destructive">*</span>
            </label>
            <input
              id="ps-name"
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
              htmlFor="ps-job-title"
              className="text-sm font-medium text-foreground"
            >
              Job title
            </label>
            <input
              id="ps-job-title"
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
              htmlFor="ps-company"
              className="text-sm font-medium text-foreground"
            >
              Company
            </label>
            <input
              id="ps-company"
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
              htmlFor="ps-email"
              className="text-sm font-medium text-foreground"
            >
              Email
            </label>
            <input
              id="ps-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@example.com"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* LinkedIn URL */}
          <div className="space-y-1.5">
            <label
              htmlFor="ps-linkedin"
              className="text-sm font-medium text-foreground"
            >
              LinkedIn URL
            </label>
            <input
              id="ps-linkedin"
              type="url"
              value={linkedinUrl}
              onChange={(e) => setLinkedinUrl(e.target.value)}
              placeholder="https://linkedin.com/in/janesmith"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Phone */}
          <div className="space-y-1.5">
            <label
              htmlFor="ps-phone"
              className="text-sm font-medium text-foreground"
            >
              Phone
            </label>
            <input
              id="ps-phone"
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 555 000 0000"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Inline error */}
          {error && <p className="text-xs text-destructive">{error}</p>}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Joining…" : "Join network"}
          </button>
        </form>
      </div>
    </div>
  );
}
