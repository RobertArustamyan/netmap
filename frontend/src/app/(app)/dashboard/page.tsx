import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { workspacesApi } from "@/lib/api";
import WorkspaceGrid from "./WorkspaceGrid";
import UserMenu from "./UserMenu";

// ─── design tokens ────────────────────────────────────────────────────────────
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

async function getWorkspaces(accessToken: string) {
  try {
    return await workspacesApi.list(accessToken);
  } catch {
    return [];
  }
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) redirect("/login");

  const workspaces = await getWorkspaces(session.access_token);

  return (
    <div style={{ background: bg, color: ink, minHeight: "100vh", fontFamily: "var(--font-sans)", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <header
        style={{
          borderBottom: `1px solid ${rule}`,
          padding: "0 48px",
          height: 60,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Link
          href="/"
          style={{ display: "flex", alignItems: "center", gap: 10, color: ink, textDecoration: "none" }}
        >
          <svg width={22} height={22} viewBox="0 0 32 32" fill="none">
            <line x1="9" y1="9" x2="23" y2="9" stroke="#94a3b8" strokeWidth="1.75" strokeLinecap="round" />
            <line x1="9" y1="9" x2="16" y2="23" stroke="#94a3b8" strokeWidth="1.75" strokeLinecap="round" />
            <line x1="23" y1="9" x2="16" y2="23" stroke="#94a3b8" strokeWidth="1.75" strokeLinecap="round" />
            <circle cx="9" cy="9" r="4.25" fill="#4f46e5" />
            <circle cx="23" cy="9" r="4.25" fill="#ffffff" stroke="#0f172a" strokeWidth="1.75" />
            <circle cx="16" cy="23" r="4.25" fill="#ffffff" stroke="#0f172a" strokeWidth="1.75" />
          </svg>
          <span style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-0.01em" }}>NetMap</span>
        </Link>
        <UserMenu email={user.email ?? ""} />
      </header>

      {/* Main */}
      <main style={{ maxWidth: 1080, margin: "0 auto", padding: "64px 48px", flex: 1, width: "100%" }}>
        {/* Title row */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            marginBottom: 40,
          }}
        >
          <h1
            style={{
              fontSize: 52,
              fontWeight: 700,
              letterSpacing: "-0.025em",
              lineHeight: 1.05,
              margin: 0,
            }}
          >
            Your{" "}
            <span style={{ ...serifStyle, color: accent }}>workspaces</span>
          </h1>
          <Link
            href="/dashboard/new"
            style={{
              padding: "11px 22px",
              borderRadius: 10,
              background: accent,
              color: "#fff",
              fontSize: 14,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            New workspace
          </Link>
        </div>

        {/* Grid or empty state */}
        {workspaces.length === 0 ? (
          <div
            style={{
              border: `1.5px dashed ${rule}`,
              borderRadius: 12,
              padding: "80px 0",
              textAlign: "center",
            }}
          >
            <p style={{ fontSize: 15, color: muted, margin: "0 0 16px" }}>No workspaces yet.</p>
            <Link
              href="/dashboard/new"
              style={{ fontSize: 14, fontWeight: 600, color: accent, textDecoration: "none" }}
            >
              Create your first workspace →
            </Link>
          </div>
        ) : (
          <WorkspaceGrid workspaces={workspaces} />
        )}
      </main>

      {/* Footer */}
      <footer
        style={{
          borderTop: `1px solid ${rule}`,
          padding: "20px 48px",
          display: "flex",
          justifyContent: "space-between",
          fontSize: 11,
          color: muted,
        }}
      >
        <span>© 2026 NetMap, Inc.</span>
        <div style={{ display: "flex", gap: 16 }}>
          <Link href="/privacy" style={{ color: muted, textDecoration: "none" }}>Privacy</Link>
          <Link href="/terms" style={{ color: muted, textDecoration: "none" }}>Terms</Link>
        </div>
      </footer>
    </div>
  );
}
