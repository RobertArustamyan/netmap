"use client";
import Link from "next/link";
import type { Workspace } from "@/types";

const ink = "#0f172a";
const muted = "#64748b";
const rule = "#e7e2d4";
const accent = "#4f46e5";

// People icon (members)
function IconPeople() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke={muted} strokeWidth="1.5" strokeLinecap="round">
      <circle cx="6" cy="5" r="2.5" />
      <path d="M1 13c0-2.5 2-4 5-4s5 1.5 5 4" />
      <circle cx="12" cy="5" r="2" />
      <path d="M14 13c0-1.5-1-2.5-3-3" />
    </svg>
  );
}

// Contact/node icon
function IconContact() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke={muted} strokeWidth="1.5" strokeLinecap="round">
      <circle cx="8" cy="5" r="3" />
      <path d="M2 14c0-3 2.5-5 6-5s6 2 6 5" />
    </svg>
  );
}

export default function WorkspaceGrid({ workspaces }: { workspaces: Workspace[] }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 }}>
      {workspaces.map((ws) => (
        <Link
          key={ws.id}
          href={`/workspace/${ws.id}/graph`}
          style={{ textDecoration: "none", color: "inherit" }}
        >
          <div
            style={{
              border: `1px solid ${rule}`,
              borderRadius: 12,
              padding: "20px 24px 16px",
              background: "#fff",
              transition: "border-color 0.15s, box-shadow 0.15s",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLDivElement).style.borderColor = accent;
              (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 16px rgba(79,70,229,0.08)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLDivElement).style.borderColor = rule;
              (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
            }}
          >
            <p style={{ fontSize: 15, fontWeight: 600, color: ink, margin: 0 }}>{ws.name}</p>

            {/* Stats row */}
            <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: muted }}>
                <IconPeople />
                {ws.member_count ?? 1} {(ws.member_count ?? 1) === 1 ? "member" : "members"}
              </span>
              <span style={{ width: 1, height: 10, background: rule }} />
              <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: muted }}>
                <IconContact />
                {ws.contact_count ?? 0} contacts
              </span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
