"use client";

import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";

const bg = "#faf8f3";
const ink = "#0f172a";
const accent = "#4f46e5";
const muted = "#64748b";
const rule = "#e7e2d4";

interface Props {
  email: string;
}

export default function UserMenu({ email }: Props) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, []);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  const initial = email.charAt(0).toUpperCase();

  return (
    <div ref={wrapperRef} style={{ position: "relative", display: "flex", alignItems: "center", gap: 8 }}>
      {/* Avatar button */}
      <button
        onClick={() => setOpen((prev) => !prev)}
        style={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          background: accent,
          color: "#fff",
          fontWeight: 700,
          fontSize: 14,
          border: "none",
          cursor: "pointer",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "inherit",
        }}
        aria-label="User menu"
        aria-expanded={open}
      >
        {initial}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          style={{
            position: "absolute",
            top: 44,
            right: 0,
            width: 200,
            background: "#fff",
            border: `1px solid ${rule}`,
            borderRadius: 10,
            boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
            zIndex: 50,
            overflow: "hidden",
          }}
        >
          {/* Email header */}
          <div
            style={{
              padding: "12px 16px 8px",
              borderBottom: `1px solid ${rule}`,
              fontSize: 11,
              color: muted,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {email}
          </div>

          {/* Settings link */}
          <Link
            href="/settings"
            onClick={() => setOpen(false)}
            style={{
              display: "flex",
              alignItems: "center",
              padding: "10px 16px",
              fontSize: 13,
              color: ink,
              textDecoration: "none",
              background: "transparent",
              transition: "background 0.1s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#f5f3ff")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            Settings
          </Link>

          {/* Help link */}
          <Link
            href="/help"
            onClick={() => setOpen(false)}
            style={{
              display: "flex",
              alignItems: "center",
              padding: "10px 16px",
              fontSize: 13,
              color: ink,
              textDecoration: "none",
              background: "transparent",
              transition: "background 0.1s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#f5f3ff")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            Help
          </Link>

          {/* Sign out button */}
          <button
            onClick={handleSignOut}
            style={{
              display: "block",
              width: "100%",
              padding: "10px 16px",
              fontSize: 13,
              color: "#dc2626",
              background: "none",
              border: "none",
              cursor: "pointer",
              textAlign: "left",
              fontFamily: "inherit",
              transition: "background 0.1s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#f5f3ff")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
