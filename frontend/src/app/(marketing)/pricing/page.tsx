"use client";

import Link from "next/link";
import { useState } from "react";

// ── Design tokens ─────────────────────────────────────────────────────────────
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

// ── Logo ──────────────────────────────────────────────────────────────────────
function Logo() {
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
  );
}

// ── Check SVG for feature lists ───────────────────────────────────────────────
function CheckIcon({ featured }: { featured?: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <polyline
        points="3,8 7,12 13,4"
        stroke={featured ? "#c7d2fe" : "#16a34a"}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ── Check SVG for comparison table ───────────────────────────────────────────
function TableCheck() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      style={{ margin: "0 auto", display: "block" }}
    >
      <polyline
        points="3,8 7,12 13,4"
        stroke="#16a34a"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ── Plan data ─────────────────────────────────────────────────────────────────
type Billing = "monthly" | "yearly";

const plans = [
  {
    name: "FREE",
    tagline: "For small teams getting started.",
    price: { monthly: 0, yearly: 0 },
    unit: "forever",
    cta: "Start free",
    href: "/signup",
    featured: false,
    badge: null,
    features: [
      "Up to 5 teammates",
      "Up to 100 contacts per workspace",
      "Up to 200 relationships",
      "Tags & categories",
      "Interactive graph canvas",
      "Search & filter",
      "2-hop warm paths",
    ],
  },
  {
    name: "PRO",
    tagline: "For teams working their network seriously.",
    price: { monthly: 29, yearly: 24 },
    unit: "per workspace, per month",
    cta: "Start 14-day trial",
    href: "/signup",
    featured: true,
    badge: "Most popular",
    features: [
      "Unlimited teammates",
      "Unlimited contacts",
      "Unlimited relationships",
      "6-hop path-finder",
      "CSV + LinkedIn import",
      "Edge strength scoring",
      "Saved filters & smart lists",
      "Email notifications",
      "CSV export",
      "Priority support",
    ],
  },
  {
    name: "TEAM",
    tagline: "For larger orgs that need security & control.",
    price: { monthly: 12, yearly: 10 },
    unit: "per seat, per month",
    cta: "Contact sales",
    href: "mailto:hello@netmap.app",
    featured: false,
    badge: null,
    features: [
      "Everything in Pro",
      "SSO / SAML",
      "SCIM provisioning",
      "Role-based permissions",
      "Audit logs",
      "Self-host option",
      "Dedicated CSM",
      "Custom data residency",
      "SLA & onboarding",
    ],
  },
];

// ── Comparison table data ─────────────────────────────────────────────────────
const comparisonRows: [string, boolean | string, boolean | string, boolean | string][] = [
  ["Teammates", "5", "Unlimited", "Unlimited"],
  ["Contacts per workspace", "100", "Unlimited", "Unlimited"],
  ["Relationships", "200", "Unlimited", "Unlimited"],
  ["Tags & categories", true, true, true],
  ["Search & filter", true, true, true],
  ["Graph canvas (10k nodes)", true, true, true],
  ["Warm path-finder", "2 hops", "6 hops", "6 hops"],
  ["Edge strength scoring", false, true, true],
  ["CSV import", false, true, true],
  ["LinkedIn import", false, true, true],
  ["CSV export", false, true, true],
  ["Saved filters", false, true, true],
  ["Email notifications", false, true, true],
  ["SSO / SAML", false, false, true],
  ["SCIM provisioning", false, false, true],
  ["Audit logs", false, false, true],
  ["Self-host option", false, false, true],
  ["Custom data residency", false, false, true],
  ["Support", "Community", "Priority", "Dedicated CSM"],
];

// ── FAQ data ──────────────────────────────────────────────────────────────────
const faqs = [
  {
    q: "Who owns the contacts?",
    a: "You do. Every contact belongs to the teammate who added it. Leave the workspace, and your contacts come with you. We never sell, share, or train models on your data.",
  },
  {
    q: "Can I import from LinkedIn?",
    a: "Yes — Pro and Team support LinkedIn export uploads, CSV imports, and a manual editor. Auto-dedupe and auto-tagging happen on the fly.",
  },
  {
    q: "How does the path-finder work?",
    a: "NetMap runs a weighted breadth-first search across your team's graph. It finds the shortest chain to any target, ranked by relationship strength.",
  },
  {
    q: "Is there a free trial?",
    a: "The Free plan is free forever (no card required). Pro starts with a 14-day trial — also no card.",
  },
  {
    q: "Can I self-host?",
    a: "Yes, on the Team plan. We ship a Docker image and a Helm chart. SOC 2 audit is in progress; full report Q3 2026.",
  },
  {
    q: "What happens when I cancel?",
    a: "You can export your full graph as JSON or CSV at any time. After cancellation, your workspace is read-only for 30 days, then deleted.",
  },
];

// ── TableCell ─────────────────────────────────────────────────────────────────
function TableCell({ value }: { value: boolean | string }) {
  if (value === true) return <TableCheck />;
  if (value === false) {
    return (
      <span style={{ display: "block", textAlign: "center", color: "#cbd5e1" }}>—</span>
    );
  }
  return (
    <span
      style={{
        display: "block",
        textAlign: "center",
        fontSize: 13,
        fontWeight: 500,
        color: ink,
      }}
    >
      {value}
    </span>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function PricingPage() {
  const [billing, setBilling] = useState<Billing>("monthly");

  return (
    <div style={{ background: bg, minHeight: "100vh", color: ink }}>
      {/* ── Nav ── */}
      <nav
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "28px 32px 0",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Logo />
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <Link href="/" style={{ fontSize: 13, color: muted, textDecoration: "none" }}>
            Product
          </Link>
          <Link
            href="/pricing"
            style={{ fontSize: 13, color: ink, fontWeight: 600, textDecoration: "none" }}
          >
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
            }}
          >
            Start free →
          </Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "100px 32px 40px",
        }}
      >
        {/* Eyebrow */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 32,
          }}
        >
          <div style={{ width: 24, height: 1, background: muted }} />
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: muted,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            — PRICING
          </span>
        </div>

        {/* H1 */}
        <h1
          style={{
            fontSize: "clamp(48px, 7vw, 88px)",
            lineHeight: 1.02,
            letterSpacing: "-0.03em",
            fontWeight: 700,
            maxWidth: "17ch",
            margin: 0,
          }}
        >
          Simple pricing. Free until your{" "}
          <span style={{ ...serifStyle, color: accent }}>network</span> grows
          past it.
        </h1>

        {/* Subheading */}
        <p
          style={{
            marginTop: 28,
            fontSize: 18,
            color: muted,
            maxWidth: 560,
            lineHeight: 1.55,
          }}
        >
          Start free for teams up to 5. Upgrade when you outgrow the limits —
          never before. No hidden seats, no per-contact billing.
        </p>

        {/* Billing toggle */}
        <div
          style={{
            marginTop: 36,
            display: "inline-flex",
            alignItems: "center",
            padding: 4,
            border: `1px solid ${rule}`,
            borderRadius: 999,
            background: "#fff",
          }}
        >
          <button
            onClick={() => setBilling("monthly")}
            style={{
              padding: "7px 16px",
              borderRadius: 999,
              border: "none",
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
              background: billing === "monthly" ? ink : "transparent",
              color: billing === "monthly" ? "#fff" : muted,
            }}
          >
            Monthly
          </button>
          <button
            onClick={() => setBilling("yearly")}
            style={{
              padding: "7px 16px",
              borderRadius: 999,
              border: "none",
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: billing === "yearly" ? ink : "transparent",
              color: billing === "yearly" ? "#fff" : muted,
            }}
          >
            Yearly
            <span
              style={{
                fontSize: 11,
                color: billing === "yearly" ? "#a5f3fc" : "#16a34a",
              }}
            >
              save 17%
            </span>
          </button>
        </div>
      </section>

      {/* ── Plan cards ── */}
      <section
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "20px 32px 80px",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 20,
          }}
        >
          {plans.map((plan) => (
            <div
              key={plan.name}
              style={{ position: "relative" }}
            >
              {/* Badge */}
              {plan.badge && (
                <div
                  style={{
                    position: "absolute",
                    top: -12,
                    left: 28,
                    background: ink,
                    color: "#fff",
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                    padding: "5px 10px",
                    borderRadius: 999,
                    zIndex: 1,
                  }}
                >
                  {plan.badge}
                </div>
              )}

              {/* Card */}
              <div
                style={{
                  border: plan.featured
                    ? `1.5px solid ${accent}`
                    : `1px solid ${rule}`,
                  background: plan.featured ? accent : "#fff",
                  color: plan.featured ? "#fff" : ink,
                  padding: 32,
                  borderRadius: 16,
                  boxShadow: plan.featured
                    ? `0 30px 60px -20px ${accent}55`
                    : "0 1px 0 rgba(15,23,42,0.04)",
                  height: "100%",
                  boxSizing: "border-box" as const,
                }}
              >
                {/* Plan name */}
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase" as const,
                    color: plan.featured ? "rgba(255,255,255,0.8)" : muted,
                  }}
                >
                  {plan.name}
                </div>

                {/* Price row */}
                <div
                  style={{
                    marginTop: 14,
                    display: "flex",
                    alignItems: "baseline",
                    gap: 6,
                  }}
                >
                  <span
                    style={{
                      fontSize: 56,
                      fontWeight: 700,
                      letterSpacing: "-0.03em",
                      lineHeight: 1,
                    }}
                  >
                    ${plan.price[billing]}
                  </span>
                  <span
                    style={{
                      fontSize: 13,
                      color: plan.featured ? "rgba(255,255,255,0.7)" : muted,
                    }}
                  >
                    {plan.price[billing] === 0
                      ? ""
                      : billing === "monthly"
                      ? "/ mo"
                      : "/ mo, billed yearly"}
                  </span>
                </div>

                {/* Tagline */}
                <p
                  style={{
                    marginTop: 6,
                    fontSize: 12.5,
                    color: plan.featured ? "rgba(255,255,255,0.75)" : muted,
                    margin: "6px 0 0",
                  }}
                >
                  {plan.tagline}
                </p>

                {/* CTA */}
                {plan.href.startsWith("mailto:") ? (
                  <a
                    href={plan.href}
                    style={{
                      marginTop: 22,
                      display: "block",
                      textAlign: "center",
                      padding: "12px 16px",
                      borderRadius: 10,
                      fontSize: 14,
                      fontWeight: 600,
                      background: plan.featured ? "#fff" : ink,
                      color: plan.featured ? accent : "#fff",
                      textDecoration: "none",
                    }}
                  >
                    {plan.cta}
                  </a>
                ) : (
                  <Link
                    href={plan.href}
                    style={{
                      marginTop: 22,
                      display: "block",
                      textAlign: "center",
                      padding: "12px 16px",
                      borderRadius: 10,
                      fontSize: 14,
                      fontWeight: 600,
                      background: plan.featured ? "#fff" : ink,
                      color: plan.featured ? accent : "#fff",
                      textDecoration: "none",
                    }}
                  >
                    {plan.cta}
                  </Link>
                )}

                {/* Feature list */}
                <ul
                  style={{
                    marginTop: 28,
                    padding: 0,
                    listStyle: "none",
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                  }}
                >
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      style={{
                        display: "flex",
                        gap: 10,
                        fontSize: 13,
                        lineHeight: 1.4,
                        color: plan.featured ? "rgba(255,255,255,0.95)" : ink,
                      }}
                    >
                      <CheckIcon featured={plan.featured} />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Comparison table ── */}
      <section
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "60px 32px 80px",
          borderTop: `1px solid ${rule}`,
        }}
      >
        {/* Eyebrow */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 20,
          }}
        >
          <div style={{ width: 24, height: 1, background: muted }} />
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: muted,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            — COMPARE
          </span>
        </div>

        {/* H2 */}
        <h2
          style={{
            fontSize: 40,
            letterSpacing: "-0.02em",
            fontWeight: 700,
            lineHeight: 1.05,
            margin: 0,
          }}
        >
          Every feature, side by{" "}
          <span style={{ ...serifStyle, color: accent }}>side</span>.
        </h2>

        {/* Table */}
        <div
          style={{
            marginTop: 40,
            border: `1px solid ${rule}`,
            borderRadius: 14,
            overflow: "hidden",
            background: "#fff",
          }}
        >
          {/* Header row */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 1fr 1fr 1fr",
              background: bg,
              padding: "14px 20px",
              borderBottom: `1px solid ${rule}`,
            }}
          >
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                color: muted,
              }}
            >
              Feature
            </span>
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                color: muted,
                textAlign: "center",
              }}
            >
              Free
            </span>
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                color: accent,
                textAlign: "center",
              }}
            >
              Pro
            </span>
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                color: muted,
                textAlign: "center",
              }}
            >
              Team
            </span>
          </div>

          {/* Data rows */}
          {comparisonRows.map(([feature, free, pro, team], i) => (
            <div
              key={feature}
              style={{
                display: "grid",
                gridTemplateColumns: "2fr 1fr 1fr 1fr",
                padding: "14px 20px",
                borderBottom:
                  i < comparisonRows.length - 1 ? `1px solid ${rule}` : "none",
                fontSize: 13.5,
              }}
            >
              <span style={{ color: ink, fontWeight: 500 }}>{feature}</span>
              <TableCell value={free} />
              <TableCell value={pro} />
              <TableCell value={team} />
            </div>
          ))}
        </div>
      </section>

      {/* ── FAQ ── */}
      <section
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "60px 32px 80px",
          borderTop: `1px solid ${rule}`,
        }}
      >
        {/* Eyebrow */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 20,
          }}
        >
          <div style={{ width: 24, height: 1, background: muted }} />
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: muted,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            — FREQUENTLY ASKED
          </span>
        </div>

        {/* H2 */}
        <h2
          style={{
            fontSize: 40,
            letterSpacing: "-0.02em",
            fontWeight: 700,
            marginBottom: 36,
            marginTop: 0,
          }}
        >
          Questions, answered.
        </h2>

        {/* 2-col grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 0,
            borderTop: `1px solid ${rule}`,
          }}
        >
          {faqs.map((faq, i) => {
            const isLeft = i % 2 === 0;
            return (
              <div
                key={faq.q}
                style={{
                  padding: "28px 0",
                  paddingRight: isLeft ? 40 : 0,
                  paddingLeft: isLeft ? 0 : 40,
                  borderBottom: `1px solid ${rule}`,
                  borderLeft: isLeft ? "none" : `1px solid ${rule}`,
                }}
              >
                <h3
                  style={{
                    fontSize: 17,
                    fontWeight: 600,
                    letterSpacing: "-0.01em",
                    margin: 0,
                  }}
                >
                  {faq.q}
                </h3>
                <p
                  style={{
                    marginTop: 10,
                    marginBottom: 0,
                    fontSize: 14,
                    color: muted,
                    lineHeight: 1.6,
                  }}
                >
                  {faq.a}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Footer CTA ── */}
      <section
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "100px 32px 60px",
          textAlign: "center",
        }}
      >
        <h2
          style={{
            fontSize: "clamp(40px, 5vw, 64px)",
            fontWeight: 700,
            letterSpacing: "-0.03em",
            lineHeight: 1.05,
            margin: 0,
          }}
        >
          Try Pro free for 14 days.
          <br />
          <span style={{ ...serifStyle, color: accent }}>No card required.</span>
        </h2>
        <Link
          href="/signup"
          style={{
            marginTop: 28,
            display: "inline-block",
            background: ink,
            color: "#fff",
            padding: "15px 26px",
            borderRadius: 999,
            fontSize: 15,
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          Start your trial →
        </Link>
      </section>

      {/* ── Footer ── */}
      <footer
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "40px 32px",
          borderTop: `1px solid ${rule}`,
          display: "flex",
          justifyContent: "space-between",
          fontSize: 12,
          color: muted,
        }}
      >
        <span>© 2026 NetMap, Inc.</span>
        <div style={{ display: "flex", gap: 24 }}>
          <a href="#" style={{ color: muted, textDecoration: "none" }}>
            Privacy
          </a>
          <a href="#" style={{ color: muted, textDecoration: "none" }}>
            Terms
          </a>
          <a href="#" style={{ color: muted, textDecoration: "none" }}>
            hello@netmap.app
          </a>
        </div>
      </footer>
    </div>
  );
}
