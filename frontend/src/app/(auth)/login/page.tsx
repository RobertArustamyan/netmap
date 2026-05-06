"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";

const bg = "#faf8f3";
const ink = "#0f172a";
const accent = "#4f46e5";
const muted = "#64748b";
const rule = "#e7e2d4";
const serifStyle: React.CSSProperties = {
  fontFamily: "var(--font-serif)",
  fontStyle: "italic",
  fontWeight: 400,
};

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams?.get("next") ?? "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);

  const supabase = createClient();

  async function handleOAuth(provider: "google" | "github") {
    setError(null);
    setOauthLoading(provider);

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${next}`,
        skipBrowserRedirect: true,
      },
    });

    if (error || !data.url) {
      setError(error?.message ?? "OAuth failed");
      setOauthLoading(null);
      return;
    }

    const popup = window.open(data.url, "oauth-popup", "width=500,height=650,scrollbars=yes,resizable=yes");

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === "oauth-success") {
        window.removeEventListener("message", handleMessage);
        clearInterval(pollClosed);
        setOauthLoading(null);
        router.push(next);
        router.refresh();
      }
    };
    window.addEventListener("message", handleMessage);

    const pollClosed = setInterval(() => {
      if (popup?.closed) {
        clearInterval(pollClosed);
        window.removeEventListener("message", handleMessage);
        setOauthLoading(null);
      }
    }, 500);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push(next);
    router.refresh();
  }

  return (
    <div
      style={{
        background: bg,
        color: ink,
        minHeight: "100vh",
        fontFamily: "var(--font-sans)",
        display: "flex",
        flexDirection: "column",
        paddingBottom: 80,
      }}
    >
      {/* ── Form column ── */}
      <div
        style={{
          flex: 1,
          padding: "40px 56px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Logo */}
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            color: ink,
            textDecoration: "none",
          }}
        >
          <svg width="26" height="26" viewBox="0 0 32 32" fill="none">
            <line x1="9" y1="9" x2="23" y2="9" stroke="#94a3b8" strokeWidth="1.75" strokeLinecap="round" />
            <line x1="9" y1="9" x2="16" y2="23" stroke="#94a3b8" strokeWidth="1.75" strokeLinecap="round" />
            <line x1="23" y1="9" x2="16" y2="23" stroke="#94a3b8" strokeWidth="1.75" strokeLinecap="round" />
            <circle cx="9" cy="9" r="4.25" fill="#4f46e5" />
            <circle cx="23" cy="9" r="4.25" fill="#ffffff" stroke="#0f172a" strokeWidth="1.75" />
            <circle cx="16" cy="23" r="4.25" fill="#ffffff" stroke="#0f172a" strokeWidth="1.75" />
          </svg>
          <span style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-0.01em" }}>NetMap</span>
        </Link>

        {/* Form area */}
        <div
          style={{
            flex: 1,
            flexDirection: "column",
            display: "flex",
            justifyContent: "center",
            maxWidth: 420,
            marginInline: "auto",
            width: "100%",
          }}
        >
          {/* H1 */}
          <h1
            style={{
              fontSize: 56,
              lineHeight: 1.02,
              letterSpacing: "-0.03em",
              fontWeight: 700,
              maxWidth: "12ch",
              margin: 0,
            }}
          >
            Sign back{" "}
            <span style={{ ...serifStyle, color: accent }}>in</span>
          </h1>

          {/* Subtitle */}
          <p style={{ margin: "18px 0 32px", fontSize: 15, color: muted, lineHeight: 1.55 }}>
            Pick up where your team left off.
          </p>

          {/* Social buttons */}
          <div style={{ display: "flex", gap: 10, marginBottom: 22 }}>
            {/* Google */}
            <button
              type="button"
              onClick={() => handleOAuth("google")}
              disabled={!!oauthLoading}
              style={{
                flex: 1,
                padding: "10px 12px",
                borderRadius: 8,
                border: `1px solid ${rule}`,
                background: "white",
                fontSize: 13,
                fontWeight: 500,
                color: ink,
                cursor: oauthLoading ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                fontFamily: "inherit",
                opacity: oauthLoading && oauthLoading !== "google" ? 0.5 : 1,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.5 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.9a5 5 0 01-2.2 3.3v2.7h3.5c2-1.9 3.3-4.7 3.3-7.8z" />
                <path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.5-2.7c-1 .7-2.3 1.1-3.8 1.1-2.9 0-5.4-2-6.3-4.6H2.1v2.9C3.9 20.5 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.7 14.1a6.6 6.6 0 010-4.2V7H2.1a11 11 0 000 10l3.6-2.9z" />
                <path fill="#EA4335" d="M12 5.4c1.6 0 3 .6 4.2 1.7l3.1-3.1A11 11 0 0012 1C7.7 1 3.9 3.5 2.1 7l3.6 2.9C6.6 7.4 9.1 5.4 12 5.4z" />
              </svg>
              Google
            </button>

            {/* GitHub */}
            <button
              type="button"
              onClick={() => handleOAuth("github")}
              disabled={!!oauthLoading}
              style={{
                flex: 1,
                padding: "10px 12px",
                borderRadius: 8,
                border: `1px solid ${rule}`,
                background: "white",
                fontSize: 13,
                fontWeight: 500,
                color: ink,
                cursor: oauthLoading ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                fontFamily: "inherit",
                opacity: oauthLoading && oauthLoading !== "github" ? 0.5 : 1,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 .3a12 12 0 00-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1.1-.7.1-.7.1-.7 1.2.1 1.9 1.3 1.9 1.3 1.1 1.9 2.9 1.4 3.6 1 .1-.8.4-1.4.8-1.7-2.7-.3-5.5-1.3-5.5-6 0-1.3.5-2.4 1.3-3.3-.1-.3-.6-1.6.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 016 0c2.3-1.5 3.3-1.2 3.3-1.2.7 1.6.2 2.9.1 3.2.8.9 1.3 2 1.3 3.3 0 4.7-2.8 5.7-5.5 6 .4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0012 .3" />
              </svg>
              GitHub
            </button>

            {/* SSO */}
            <button
              type="button"
              style={{
                flex: 1,
                padding: "10px 12px",
                borderRadius: 8,
                border: `1px solid ${rule}`,
                background: "white",
                fontSize: 13,
                fontWeight: 500,
                color: ink,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                fontFamily: "inherit",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
              SSO
            </button>
          </div>

          {/* Divider */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 22,
            }}
          >
            <div style={{ flex: 1, height: 1, background: rule }} />
            <span
              style={{
                fontSize: 11,
                color: muted,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              or with email
            </span>
            <div style={{ flex: 1, height: 1, background: rule }} />
          </div>

          {/* Email + password form */}
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Email field */}
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: ink }}>Work email</span>
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                placeholder="jane@acme.com"
                style={{
                  appearance: "none",
                  padding: "11px 14px",
                  borderRadius: 8,
                  border: `1px solid ${rule}`,
                  background: "white",
                  fontSize: 14,
                  fontFamily: "inherit",
                  color: ink,
                  outline: "none",
                }}
              />
            </label>

            {/* Password field */}
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: ink }}>Password</span>
                <Link href="#" style={{ fontSize: 11, color: accent, textDecoration: "none" }}>
                  Forgot?
                </Link>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                placeholder="••••••••"
                style={{
                  appearance: "none",
                  padding: "11px 14px",
                  borderRadius: 8,
                  border: `1px solid ${rule}`,
                  background: "white",
                  fontSize: 14,
                  fontFamily: "inherit",
                  color: ink,
                  outline: "none",
                }}
              />
            </label>

            {/* Error */}
            {error && <p style={{ fontSize: 13, color: "#dc2626", margin: 0 }}>{error}</p>}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: 8,
                padding: "13px 18px",
                borderRadius: 10,
                background: accent,
                color: "white",
                border: "none",
                cursor: loading ? "not-allowed" : "pointer",
                fontSize: 14,
                fontWeight: 600,
                fontFamily: "inherit",
                boxShadow: `0 1px 0 ${accent}, 0 10px 24px ${accent}33`,
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: loading ? 0.8 : 1,
              }}
            >
              {loading ? (
                <img src="/loaders/netmap-loader.svg" alt="Signing in" style={{ width: 24, height: 24 }} />
              ) : (
                "Sign in →"
              )}
            </button>
          </form>

          {/* Switch link */}
          <p style={{ marginTop: 20, fontSize: 13, color: muted, textAlign: "center" }}>
            New to NetMap?{" "}
            <Link href="/signup" style={{ color: ink, fontWeight: 600, textDecoration: "none" }}>
              Create an account
            </Link>
          </p>
        </div>

        {/* Footer */}
        <div
          style={{
            fontSize: 11,
            color: muted,
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <span>© 2026 NetMap, Inc.</span>
          <div style={{ display: "flex", gap: 12 }}>
            <Link href="/privacy" style={{ color: muted, textDecoration: "none" }}>
              Privacy
            </Link>
            <Link href="/terms" style={{ color: muted, textDecoration: "none" }}>
              Terms
            </Link>
          </div>
        </div>
      </div>

    </div>
  );
}
