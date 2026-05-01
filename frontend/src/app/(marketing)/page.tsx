import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "NetMap — Your team's collective network, mapped.",
  description:
    "Your team has met thousands of people. NetMap keeps that network alive, searchable, and shared with the people you trust.",
};

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
  letterSpacing: "-0.01em",
};

// ─── Logo ─────────────────────────────────────────────────────────────────────
function Logo({ small = false }: { small?: boolean }) {
  const sz = small ? 22 : 26;
  return (
    <Link
      href="/"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        textDecoration: "none",
        color: ink,
      }}
    >
      <svg width={sz} height={sz} viewBox="0 0 32 32" fill="none">
        <line x1="9" y1="9" x2="23" y2="9" stroke="#94a3b8" strokeWidth="1.75" strokeLinecap="round" />
        <line x1="9" y1="9" x2="16" y2="23" stroke="#94a3b8" strokeWidth="1.75" strokeLinecap="round" />
        <line x1="23" y1="9" x2="16" y2="23" stroke="#94a3b8" strokeWidth="1.75" strokeLinecap="round" />
        <circle cx="9" cy="9" r="4.25" fill="#4f46e5" />
        <circle cx="23" cy="9" r="4.25" fill="#ffffff" stroke="#0f172a" strokeWidth="1.75" />
        <circle cx="16" cy="23" r="4.25" fill="#ffffff" stroke="#0f172a" strokeWidth="1.75" />
      </svg>
      <span style={{ fontSize: small ? 14 : 16, fontWeight: 600, letterSpacing: "-0.01em" }}>
        NetMap
      </span>
    </Link>
  );
}

// ─── Step icons ───────────────────────────────────────────────────────────────
function IconUpload() {
  return (
    <svg
      width="36"
      height="36"
      viewBox="0 0 32 32"
      fill="none"
      stroke={ink}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="6" y="6" width="20" height="20" rx="2" />
      <path d="M16 12v8M12 16l4-4 4 4" />
    </svg>
  );
}

function IconNetwork() {
  return (
    <svg
      width="36"
      height="36"
      viewBox="0 0 32 32"
      fill="none"
      stroke={ink}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="10" cy="10" r="3" />
      <circle cx="22" cy="10" r="3" />
      <circle cx="16" cy="22" r="3" />
      <path d="M13 10h6M11.5 12.5l3 7M20.5 12.5l-3 7" />
    </svg>
  );
}

function IconRoute() {
  return (
    <svg
      width="36"
      height="36"
      viewBox="0 0 32 32"
      fill="none"
      stroke={ink}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="7" cy="16" r="2.5" />
      <circle cx="25" cy="16" r="2.5" />
      <path d="M9.5 16 H 22.5" strokeDasharray="2 2" />
      <path d="M20 13l3 3-3 3" />
    </svg>
  );
}

// ─── Eyebrow ──────────────────────────────────────────────────────────────────
function Eyebrow({ label }: { label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
      <div style={{ width: 24, height: 1, background: muted }} />
      <span
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: muted,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          fontFamily: "var(--font-sans)",
        }}
      >
        {label}
      </span>
    </div>
  );
}

// ─── Feature row ─────────────────────────────────────────────────────────────
function FeatureRow({
  eyebrow,
  heading,
  body,
  demo,
  reverse = false,
}: {
  eyebrow: string;
  heading: React.ReactNode;
  body: string;
  demo: React.ReactNode;
  reverse?: boolean;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 64,
        alignItems: "center",
        padding: "60px 0",
        borderTop: `1px solid ${rule}`,
        direction: reverse ? "rtl" : "ltr",
      }}
    >
      <div style={{ direction: "ltr" }}>
        <Eyebrow label={eyebrow} />
        <h3
          style={{
            fontSize: 36,
            fontWeight: 700,
            letterSpacing: "-0.02em",
            lineHeight: 1.1,
            color: ink,
            maxWidth: "16ch",
            margin: "0 0 16px",
          }}
        >
          {heading}
        </h3>
        <p
          style={{
            fontSize: 16,
            color: muted,
            lineHeight: 1.6,
            maxWidth: 440,
            margin: 0,
          }}
        >
          {body}
        </p>
      </div>
      <div style={{ direction: "ltr" }}>{demo}</div>
    </div>
  );
}

// ─── Demo cards ───────────────────────────────────────────────────────────────
function SearchDemo() {
  const results = [
    {
      name: "Mei Tanaka",
      sub: "CEO · Flow — Series B · fintech",
      via: "3 hops via Sarah Chen",
      avatarBg: accent,
      avatarColor: "#fff",
    },
    {
      name: "Priya Nair",
      sub: "Founder · Lumen — Series A · fintech",
      via: "2 hops via Sarah Chen",
      avatarBg: "#e0e7ff",
      avatarColor: accent,
    },
    {
      name: "Dario Kim",
      sub: "CEO · Parallel — Series B · fintech",
      via: "4 hops via Marco Alvarez",
      avatarBg: "#e0e7ff",
      avatarColor: accent,
    },
  ];

  return (
    <div
      style={{
        border: `1px solid ${rule}`,
        borderRadius: 14,
        overflow: "hidden",
        background: "#fff",
      }}
    >
      {/* search bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: 14,
          borderBottom: `1px solid ${rule}`,
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={muted} strokeWidth="2" strokeLinecap="round">
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
        <span style={{ fontSize: 14, color: ink, flex: 1 }}>Series B founder fintech</span>
        <span
          style={{
            fontSize: 11,
            color: muted,
            fontFamily: "var(--font-mono)",
            border: `1px solid ${rule}`,
            borderRadius: 4,
            padding: "2px 6px",
          }}
        >
          ⏎ to search
        </span>
      </div>
      {/* results */}
      {results.map((r, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "12px 14px",
            borderBottom: i < results.length - 1 ? `1px solid ${rule}` : undefined,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: r.avatarBg,
              color: r.avatarColor,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 13,
              fontWeight: 600,
              flexShrink: 0,
            }}
          >
            {r.name.charAt(0)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: ink }}>{r.name}</div>
            <div style={{ fontSize: 12, color: muted, marginTop: 1 }}>{r.sub}</div>
          </div>
          <div
            style={{
              fontSize: 11,
              color: accent,
              fontFamily: "var(--font-mono)",
              whiteSpace: "nowrap",
            }}
          >
            {r.via}
          </div>
        </div>
      ))}
    </div>
  );
}

function PathDemo() {
  const nodes = [
    { label: "You", initials: "Y", bg: accent, color: "#fff" },
    { label: "Sarah Chen", initials: "SC", bg: "#e0e7ff", color: accent },
    { label: "David Park", initials: "DP", bg: "#e0e7ff", color: accent },
    { label: "Mei Tanaka", initials: "MT", bg: "#f0fdf4", color: "#16a34a" },
  ];

  return (
    <div
      style={{
        border: `1px solid ${rule}`,
        borderRadius: 14,
        padding: 24,
        background: "#fff",
      }}
    >
      <div style={{ fontSize: 12, color: muted, marginBottom: 20, fontFamily: "var(--font-mono)" }}>
        PATH · 3 HOPS
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
        {nodes.map((n, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  background: n.bg,
                  color: n.color,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  fontWeight: 700,
                  border: `1px solid ${rule}`,
                }}
              >
                {n.initials}
              </div>
              <span style={{ fontSize: 11, color: ink, fontWeight: 500, whiteSpace: "nowrap" }}>
                {n.label}
              </span>
            </div>
            {i < nodes.length - 1 && (
              <div style={{ display: "flex", alignItems: "center", margin: "0 6px", paddingBottom: 18 }}>
                <svg width="28" height="12" viewBox="0 0 28 12" fill="none">
                  <path d="M0 6h22M18 2l6 4-6 4" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            )}
          </div>
        ))}
      </div>
      <div
        style={{
          marginTop: 20,
          padding: "10px 14px",
          background: "#f0fdf4",
          borderRadius: 8,
          fontSize: 12,
          color: "#16a34a",
          fontWeight: 500,
        }}
      >
        Sarah has the warmest connection — she met Mei twice at SaaStr.
      </div>
    </div>
  );
}

function PrivacyDemo() {
  const promises = [
    {
      title: "Yours, not ours",
      body: "You own every contact you add. We don't sell, mine, or train models on them.",
    },
    {
      title: "Visible only to your team",
      body: "Each workspace is private. Outside it, nothing about your network is exposed.",
    },
    {
      title: "Leave with what you brought",
      body: "When you leave a team, the contacts you added leave with you. One click, full export.",
    },
    {
      title: "Encrypted at rest, in transit",
      body: "AES-256 storage, TLS 1.3 in flight, SOC 2 Type II underway.",
    },
  ];

  return (
    <div
      style={{
        border: `1px solid ${rule}`,
        borderRadius: 14,
        padding: 28,
        background: "#fff",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 20,
        }}
      >
        {promises.map((p, i) => (
          <div key={i}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: "#e0e7ff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 10,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: ink, marginBottom: 4 }}>{p.title}</div>
            <div style={{ fontSize: 12, color: muted, lineHeight: 1.55 }}>{p.body}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <div style={{ background: bg, minHeight: "100vh", color: ink, fontFamily: "var(--font-sans)" }}>

      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <nav>
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            padding: "28px 32px 0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Logo />
          <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
            <a href="#how" style={{ fontSize: 13, color: muted, textDecoration: "none" }}>
              How it works
            </a>
            <a href="#features" style={{ fontSize: 13, color: muted, textDecoration: "none" }}>
              Features
            </a>
            <Link href="/pricing" style={{ fontSize: 13, color: muted, textDecoration: "none" }}>
              Pricing
            </Link>
            <Link href="/login" style={{ fontSize: 13, color: muted, textDecoration: "none" }}>
              Log in
            </Link>
            <Link
              href="/signup"
              style={{
                background: ink,
                color: "#fff",
                padding: "9px 16px",
                borderRadius: 999,
                fontSize: 12.5,
                fontWeight: 500,
                textDecoration: "none",
                display: "inline-block",
              }}
            >
              Start free →
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section>
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            padding: "100px 32px 60px",
          }}
        >
          <Eyebrow label="01 — THE NETWORK MAP" />
          <h1
            style={{
              fontSize: "clamp(48px, 7vw, 92px)",
              lineHeight: 1.02,
              letterSpacing: "-0.03em",
              fontWeight: 700,
              maxWidth: "17ch",
              margin: "0 0 0",
            }}
          >
            The people you know are{" "}
            <span style={{ ...serifStyle, color: accent }}>worth</span>{" "}
            remembering.{" "}
            <span style={{ color: muted }}>NetMap makes sure you don&apos;t forget.</span>
          </h1>
          <div style={{ maxWidth: 580, display: "flex", flexDirection: "column", gap: 22, marginTop: 44 }}>
            <p style={{ fontSize: 18, lineHeight: 1.55, color: "#334155", margin: 0 }}>
              Your team has met thousands of people — founders, operators, designers, candidates. Most
              of them quietly slip out of memory within a year. NetMap keeps that network alive,
              searchable, and shared with the people you trust.
            </p>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <Link
                href="/signup"
                style={{
                  background: accent,
                  color: "#fff",
                  padding: "13px 22px",
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 600,
                  textDecoration: "none",
                  display: "inline-block",
                  boxShadow: `0 1px 0 #4f46e5, 0 10px 30px #4f46e533`,
                }}
              >
                Map your network — it&apos;s free
              </Link>
              <a
                href="#"
                style={{
                  padding: "13px 16px",
                  fontSize: 14,
                  fontWeight: 500,
                  color: ink,
                  textDecoration: "none",
                }}
              >
                Watch 90-second demo →
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── Hero media ───────────────────────────────────────────────────── */}
      <section>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 32px 80px" }}>
          <div
            style={{
              borderRadius: 16,
              border: `1px solid ${rule}`,
              overflow: "hidden",
              aspectRatio: "16/9",
              background: "linear-gradient(135deg, #f5f1e8 0%, #ece6d3 100%)",
              boxShadow: "0 1px 0 rgba(15,23,42,0.04), 0 20px 60px -20px rgba(15,23,42,0.15)",
              position: "relative",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
              gap: 14,
            }}
          >
            {/* crosshatch lines */}
            <svg
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.5 }}
              preserveAspectRatio="none"
              viewBox="0 0 1600 900"
              fill="none"
            >
              <line x1="0" y1="0" x2="1600" y2="900" stroke={rule} strokeWidth="1" />
              <line x1="1600" y1="0" x2="0" y2="900" stroke={rule} strokeWidth="1" />
            </svg>
            {/* corner labels */}
            <span
              style={{
                position: "absolute",
                top: 16,
                left: 20,
                fontSize: 10,
                color: muted,
                fontFamily: "var(--font-mono)",
              }}
            >
              FIG. 1
            </span>
            <span
              style={{
                position: "absolute",
                bottom: 16,
                right: 20,
                fontSize: 10,
                color: muted,
                fontFamily: "var(--font-mono)",
              }}
            >
              00:90
            </span>
            {/* play button */}
            <div
              style={{
                width: 84,
                height: 84,
                borderRadius: "50%",
                background: ink,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="#fff">
                <polygon points="5,3 19,12 5,21" />
              </svg>
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: ink }}>
              Watch the 90-second tour
            </div>
            <div
              style={{
                fontSize: 12,
                color: muted,
                fontFamily: "var(--font-mono)",
              }}
            >
              [ video / product walkthrough — to be embedded ]
            </div>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: 12,
              fontSize: 12,
              color: muted,
            }}
          >
            <span>A 90-second look at how a real team uses NetMap</span>
            <span>fig. 1 — product tour</span>
          </div>
        </div>
      </section>

      {/* ── Privacy note ─────────────────────────────────────────────────── */}
      <section>
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            padding: "56px 32px",
            borderTop: `1px solid ${rule}`,
            borderBottom: `1px solid ${rule}`,
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1.6fr",
              gap: 60,
              alignItems: "baseline",
            }}
          >
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: muted,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              A NOTE ON PRIVACY
            </div>
            <p
              style={{
                fontSize: 22,
                lineHeight: 1.45,
                color: ink,
                letterSpacing: "-0.01em",
                maxWidth: "52ch",
                margin: 0,
              }}
            >
              Your contacts are{" "}
              <span style={{ ...serifStyle, color: accent }}>yours</span>. They aren&apos;t sold, mined,
              or used to train anything. They live in your workspace, visible only to the teammates you
              invite — and they leave with you the day you do.
            </p>
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section id="how">
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "100px 32px 60px" }}>
          {/* header */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              marginBottom: 60,
              gap: 40,
              flexWrap: "wrap",
            }}
          >
            <div>
              <Eyebrow label="02 — HOW IT WORKS" />
              <h2
                style={{
                  fontSize: 44,
                  fontWeight: 700,
                  letterSpacing: "-0.02em",
                  lineHeight: 1.05,
                  maxWidth: "14ch",
                  margin: 0,
                }}
              >
                Three steps. Nothing{" "}
                <span style={{ ...serifStyle, color: accent }}>forgotten</span>.
              </h2>
            </div>
            <p
              style={{
                fontSize: 15,
                color: muted,
                maxWidth: 360,
                lineHeight: 1.6,
                margin: 0,
              }}
            >
              Your team adds the people they&apos;ve already met. NetMap remembers who knows whom — so
              the next time someone asks, the answer is already there.
            </p>
          </div>

          {/* 3-col steps */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr" }}>
            {[
              {
                step: "01",
                title: "Bring people in",
                body: "Each teammate adds the contacts they already have — LinkedIn, CSV, or by hand. Add a note about how you met so future-you (or future-anyone) can remember.",
                icon: <IconUpload />,
              },
              {
                step: "02",
                title: "Connect the dots",
                body: "Draw edges between people who know each other. The graph updates in real time, so the team's shared memory stays current without anyone managing it.",
                icon: <IconNetwork />,
              },
              {
                step: "03",
                title: "Recall on demand",
                body: "Search a name, company, or role and NetMap surfaces who on the team has met them, when, and how well — even if it was three jobs ago.",
                icon: <IconRoute />,
              },
            ].map((s, i) => (
              <div
                key={i}
                style={{
                  padding: "28px 28px 32px",
                  borderLeft: i === 0 ? `1px solid ${rule}` : undefined,
                  borderRight: `1px solid ${rule}`,
                  borderTop: `1px solid ${rule}`,
                  borderBottom: `1px solid ${rule}`,
                  background: "rgba(255,255,255,0.4)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 20,
                  }}
                >
                  <span
                    style={{
                      fontSize: 13,
                      color: accent,
                      fontFamily: "var(--font-mono)",
                      fontWeight: 500,
                    }}
                  >
                    {s.step}
                  </span>
                  {s.icon}
                </div>
                <h3
                  style={{
                    fontSize: 20,
                    fontWeight: 600,
                    color: ink,
                    margin: "0 0 12px",
                  }}
                >
                  {s.title}
                </h3>
                <p
                  style={{
                    fontSize: 14,
                    color: muted,
                    lineHeight: 1.6,
                    margin: 0,
                  }}
                >
                  {s.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────────── */}
      <section id="features">
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "60px 32px" }}>
          <FeatureRow
            eyebrow="03 — SEARCH"
            heading={
              <>Search anyone by role, company, or tag.</>
            }
            body="Who knows a Series B founder in fintech? Who can intro us to someone at Stripe? NetMap answers in milliseconds — across every contact your team has ever added."
            demo={<SearchDemo />}
          />
          <FeatureRow
            eyebrow="04 — PATHS"
            heading={<>Warm paths, ranked by strength.</>}
            body="See the shortest chain of mutual contacts — and how strong each link is. The person with the warmest route gets to ask for the intro."
            demo={<PathDemo />}
            reverse
          />
          <FeatureRow
            eyebrow="05 — PRIVACY"
            heading={<>Your contacts. Your workspace. Yours when you leave.</>}
            body="Every contact you add belongs to you. We don't sell, mine, or train models on your data. Export everything in one click, any time."
            demo={<PrivacyDemo />}
          />
        </div>
      </section>

      {/* ── Pricing callout ──────────────────────────────────────────────── */}
      <section id="pricing">
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            padding: "80px 32px 40px",
            borderTop: `1px solid ${rule}`,
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.2fr 2fr",
              gap: 80,
              alignItems: "end",
            }}
          >
            {/* left */}
            <div>
              <Eyebrow label="06 — PRICING" />
              <h2
                style={{
                  fontSize: 52,
                  fontWeight: 700,
                  letterSpacing: "-0.025em",
                  lineHeight: 1.05,
                  margin: "0 0 16px",
                }}
              >
                Free for{" "}
                <span style={{ ...serifStyle, color: accent }}>teams</span>.
              </h2>
              <p style={{ fontSize: 15, color: muted, maxWidth: 380, lineHeight: 1.6, margin: 0 }}>
                Up to 5 members, 100 contacts, everything essential. Upgrade to Pro when your network
                grows past that.
              </p>
            </div>

            {/* right: pricing cards */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              {/* free */}
              <div
                style={{
                  border: `1px solid ${rule}`,
                  borderRadius: 12,
                  padding: 28,
                  background: "#fff",
                }}
              >
                <div
                  style={{
                    fontSize: 44,
                    fontWeight: 700,
                    letterSpacing: "-0.025em",
                    color: ink,
                    lineHeight: 1,
                    marginBottom: 6,
                  }}
                >
                  $0
                </div>
                <div style={{ fontSize: 13, color: muted, marginBottom: 24 }}>
                  forever · up to 5 teammates
                </div>
                <ul
                  style={{
                    listStyle: "none",
                    margin: "0 0 24px",
                    padding: 0,
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  {["Up to 5 members", "100 contacts", "Full graph canvas", "Search & filter"].map(
                    (f) => (
                      <li key={f} style={{ fontSize: 13, color: muted, display: "flex", gap: 8 }}>
                        <span style={{ color: accent }}>✓</span> {f}
                      </li>
                    )
                  )}
                </ul>
                <Link
                  href="/signup"
                  style={{
                    display: "block",
                    textAlign: "center",
                    border: `1.5px solid ${ink}`,
                    borderRadius: 8,
                    padding: "10px 0",
                    fontSize: 14,
                    fontWeight: 600,
                    color: ink,
                    textDecoration: "none",
                  }}
                >
                  Start free
                </Link>
              </div>

              {/* pro */}
              <div
                style={{
                  border: `1px solid ${accent}`,
                  borderRadius: 12,
                  padding: 28,
                  background: accent,
                  color: "#fff",
                }}
              >
                <div
                  style={{
                    fontSize: 44,
                    fontWeight: 700,
                    letterSpacing: "-0.025em",
                    lineHeight: 1,
                    marginBottom: 6,
                  }}
                >
                  $4.99
                  <span style={{ fontSize: 20, fontWeight: 500 }}> /mo</span>
                </div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", marginBottom: 24 }}>
                  per workspace · unlimited everything
                </div>
                <ul
                  style={{
                    listStyle: "none",
                    margin: "0 0 24px",
                    padding: 0,
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  {[
                    "Unlimited members",
                    "Unlimited contacts",
                    "CSV import",
                    "Path finder",
                    "Priority support",
                  ].map((f) => (
                    <li
                      key={f}
                      style={{
                        fontSize: 13,
                        color: "rgba(255,255,255,0.9)",
                        display: "flex",
                        gap: 8,
                      }}
                    >
                      <span>✓</span> {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/signup"
                  style={{
                    display: "block",
                    textAlign: "center",
                    background: "#fff",
                    borderRadius: 8,
                    padding: "10px 0",
                    fontSize: 14,
                    fontWeight: 600,
                    color: accent,
                    textDecoration: "none",
                  }}
                >
                  Start 14-day trial
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer CTA ───────────────────────────────────────────────────── */}
      <section>
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            padding: "120px 32px 60px",
            textAlign: "center",
          }}
        >
          <h2
            style={{
              fontSize: "clamp(44px, 6vw, 80px)",
              fontWeight: 700,
              letterSpacing: "-0.03em",
              lineHeight: 1.02,
              margin: 0,
            }}
          >
            Don&apos;t{" "}
            <span style={{ ...serifStyle, color: accent }}>forget</span>{" "}
            the people who matter.
          </h2>
          <p
            style={{
              fontSize: 18,
              color: muted,
              maxWidth: 460,
              margin: "28px auto 36px",
              lineHeight: 1.55,
            }}
          >
            Build your team&apos;s shared memory in an afternoon. Free forever for teams up to 5.
          </p>
          <Link
            href="/signup"
            style={{
              background: ink,
              color: "#fff",
              padding: "16px 28px",
              borderRadius: 999,
              fontSize: 15,
              fontWeight: 600,
              textDecoration: "none",
              display: "inline-block",
            }}
          >
            Create a workspace →
          </Link>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer>
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            padding: "40px 32px",
            borderTop: `1px solid ${rule}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 12,
            color: muted,
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <Logo small />
          <div style={{ display: "flex", gap: 20 }}>
            <a href="#" style={{ color: muted, textDecoration: "none" }}>Changelog</a>
            <a href="#" style={{ color: muted, textDecoration: "none" }}>Privacy</a>
            <a href="#" style={{ color: muted, textDecoration: "none" }}>Terms</a>
            <a href="#" style={{ color: muted, textDecoration: "none" }}>hello@netmap.app</a>
          </div>
          <span>© 2026 NetMap, Inc.</span>
        </div>
      </footer>
    </div>
  );
}
