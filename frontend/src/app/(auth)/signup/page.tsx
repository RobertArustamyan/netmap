"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";

const inputStyle: React.CSSProperties = {
  appearance: "none",
  padding: "11px 14px",
  borderRadius: 8,
  border: "1px solid #e7e2d4",
  background: "white",
  fontSize: 14,
  fontFamily: "inherit",
  color: "#0f172a",
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: "#0f172a",
  marginBottom: 6,
  display: "block",
};

const NetMapLogo = () => (
  <svg width="26" height="26" viewBox="0 0 32 32" fill="none">
    <line x1="9" y1="9" x2="23" y2="9" stroke="#94a3b8" strokeWidth="1.75" strokeLinecap="round" />
    <line x1="9" y1="9" x2="16" y2="23" stroke="#94a3b8" strokeWidth="1.75" strokeLinecap="round" />
    <line x1="23" y1="9" x2="16" y2="23" stroke="#94a3b8" strokeWidth="1.75" strokeLinecap="round" />
    <circle cx="9" cy="9" r="4.25" fill="#4f46e5" />
    <circle cx="23" cy="9" r="4.25" fill="#ffffff" stroke="#0f172a" strokeWidth="1.75" />
    <circle cx="16" cy="23" r="4.25" fill="#ffffff" stroke="#0f172a" strokeWidth="1.75" />
  </svg>
);

export default function SignupPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);

  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setVerificationSent(true);
    setLoading(false);
  }

  if (verificationSent) {
    return (
      <div style={{ background: "#faf8f3", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-sans)" }}>
        <div style={{ maxWidth: 480, textAlign: "center", padding: 40 }}>
          <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 10, textDecoration: "none", color: "#0f172a", marginBottom: 48 }}>
            <NetMapLogo />
            <span style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-0.01em" }}>NetMap</span>
          </Link>
          <div style={{ fontSize: 12, color: "#64748b", letterSpacing: "0.04em", textTransform: "uppercase", fontWeight: 600, marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
            <span style={{ width: 24, height: 1, background: "#64748b", display: "inline-block" }} />
            <span>00 — Check your inbox</span>
          </div>
          <h1 style={{ fontSize: 56, lineHeight: 1.02, letterSpacing: "-0.03em", fontWeight: 700, margin: "0 0 18px" }}>
            One step{" "}
            <span style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", fontWeight: 400, color: "#4f46e5" }}>left</span>.
          </h1>
          <p style={{ fontSize: 16, color: "#64748b", lineHeight: 1.6, marginBottom: 32 }}>
            We sent a verification link to{" "}
            <strong style={{ color: "#0f172a" }}>{email}</strong>. Click it to activate your account and start mapping.
          </p>
          <Link href="/login" style={{ fontSize: 14, fontWeight: 600, color: "#0f172a", textDecoration: "none", borderBottom: "1px solid #e7e2d4", paddingBottom: 2 }}>
            Back to sign in →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: "#faf8f3", color: "#0f172a", minHeight: "100vh", fontFamily: "var(--font-sans)", display: "grid", gridTemplateColumns: "1fr 1fr", paddingBottom: 80 }}>
      {/* Left column — form */}
      <div style={{ padding: "40px 56px", display: "flex", flexDirection: "column" }}>
        {/* Logo */}
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, color: "#0f172a", textDecoration: "none" }}>
          <NetMapLogo />
          <span style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-0.01em" }}>NetMap</span>
        </Link>

        {/* Form area */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", maxWidth: 420, marginInline: "auto", width: "100%" }}>
          {/* Eyebrow */}
          <div style={{ fontSize: 12, color: "#64748b", letterSpacing: "0.04em", textTransform: "uppercase", fontWeight: 600, marginBottom: 14, display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ width: 24, height: 1, background: "#64748b", display: "inline-block" }} />
            <span>00 — Create workspace</span>
          </div>

          {/* Headline */}
          <h1 style={{ fontSize: 56, lineHeight: 1.02, letterSpacing: "-0.03em", fontWeight: 700, maxWidth: "12ch", margin: 0 }}>
            Map your{" "}
            <span style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", fontWeight: 400, color: "#4f46e5" }}>network</span>.
          </h1>

          <p style={{ margin: "18px 0 32px", fontSize: 15, color: "#64748b", lineHeight: 1.55 }}>
            Free for teams up to 5 — no card required.
          </p>

          {/* Social buttons */}
          <div style={{ display: "flex", gap: 10, marginBottom: 22 }}>
            <button
              type="button"
              style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "10px 14px", borderRadius: 8, border: "1px solid #e7e2d4", background: "white", fontSize: 13, fontWeight: 600, color: "#0f172a", cursor: "pointer", fontFamily: "inherit" }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Google
            </button>
            <button
              type="button"
              style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "10px 14px", borderRadius: 8, border: "1px solid #e7e2d4", background: "white", fontSize: 13, fontWeight: 600, color: "#0f172a", cursor: "pointer", fontFamily: "inherit" }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
              </svg>
              GitHub
            </button>
            <button
              type="button"
              style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "10px 14px", borderRadius: 8, border: "1px solid #e7e2d4", background: "white", fontSize: 13, fontWeight: 600, color: "#0f172a", cursor: "pointer", fontFamily: "inherit" }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              SSO
            </button>
          </div>

          {/* Divider */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 22 }}>
            <span style={{ flex: 1, height: 1, background: "#e7e2d4", display: "block" }} />
            <span style={{ fontSize: 11, color: "#64748b", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase" }}>or continue with email</span>
            <span style={{ flex: 1, height: 1, background: "#e7e2d4", display: "block" }} />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Workspace name (UI only) */}
            <div>
              <label style={labelStyle} htmlFor="workspaceName">Workspace name</label>
              <input
                id="workspaceName"
                type="text"
                placeholder="Acme Corp"
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                style={inputStyle}
              />
            </div>

            {/* Your name (UI only) */}
            <div>
              <label style={labelStyle} htmlFor="name">Your name</label>
              <input
                id="name"
                type="text"
                placeholder="Jane Smith"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={inputStyle}
              />
            </div>

            {/* Work email */}
            <div>
              <label style={labelStyle} htmlFor="email">Work email</label>
              <input
                id="email"
                type="email"
                placeholder="jane@acme.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={inputStyle}
              />
            </div>

            {/* Password */}
            <div>
              <label style={labelStyle} htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                style={inputStyle}
              />
            </div>

            {error && <p style={{ fontSize: 13, color: "#dc2626", margin: 0 }}>{error}</p>}

            <button
              type="submit"
              disabled={loading}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "12px 20px", borderRadius: 8, background: "#4f46e5", color: "white", fontSize: 14, fontWeight: 600, border: "none", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1, fontFamily: "inherit", minHeight: 46 }}
            >
              {loading
                ? <img src="/loaders/netmap-loader.gif" alt="Creating account" style={{ width: 24, height: 24 }} />
                : "Create workspace →"}
            </button>
          </form>

          {/* Switch link */}
          <p style={{ marginTop: 20, fontSize: 13, color: "#64748b", textAlign: "center" }}>
            Already have an account?{" "}
            <Link href="/login" style={{ color: "#0f172a", fontWeight: 600, textDecoration: "none" }}>Sign in</Link>
          </p>
        </div>

        {/* Footer */}
        <div style={{ fontSize: 11, color: "#64748b", display: "flex", justifyContent: "space-between" }}>
          <span>© 2026 NetMap, Inc.</span>
          <span>
            <Link href="/privacy" style={{ color: "#64748b", textDecoration: "none" }}>Privacy</Link>
            {" · "}
            <Link href="/terms" style={{ color: "#64748b", textDecoration: "none" }}>Terms</Link>
          </span>
        </div>
      </div>

      {/* Right column — testimonial sidebar */}
      <div style={{ background: "#f0ece0", borderLeft: "1px solid #e7e2d4", padding: 56, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#64748b", letterSpacing: "0.04em" }}>
          fig. 1 — testimonial
        </div>
        <div>
          <div style={{ fontSize: 96, lineHeight: 0.7, color: "#4f46e5", fontFamily: "var(--font-serif)", fontStyle: "italic" }}>"</div>
          <p style={{ margin: "4px 0 28px", fontSize: 26, lineHeight: 1.25, letterSpacing: "-0.015em", fontWeight: 500, color: "#0f172a", maxWidth: "20ch" }}>
            We closed our seed round entirely through warm intros from our NetMap graph. Zero cold emails.
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 999, background: "#4f46e5", color: "white", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>MH</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Maya Henriksen</div>
              <div style={{ fontSize: 12, color: "#64748b" }}>Founder, Parallel · YC W25</div>
            </div>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18 }}>
          {([["23×", "reply lift"], ["8 min", "to set up"], ["0", "cold emails"]] as [string, string][]).map(([n, l], i) => (
            <div key={i} style={{ borderTop: "1px solid #e7e2d4", paddingTop: 12 }}>
              <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em" }}>{n}</div>
              <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
