import Link from "next/link";

const FREE_FEATURES = [
  "Up to 5 members",
  "Up to 100 contacts",
  "Interactive graph canvas",
  "Second-degree path discovery",
  "CSV import",
  "Tags & filters",
];

const PRO_FEATURES = [
  "Unlimited members",
  "Unlimited contacts",
  "Interactive graph canvas",
  "Second-degree path discovery",
  "CSV import",
  "Tags & filters",
  "Priority support",
];

function CheckIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0 text-primary"
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export default function PlansPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-6 py-4 flex items-center gap-4">
        <Link
          href="/dashboard"
          className="font-semibold text-lg text-foreground hover:opacity-80 transition-opacity"
        >
          NetMap
        </Link>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-16 space-y-12">
        {/* Heading */}
        <div className="text-center space-y-3">
          <h1 className="text-3xl font-semibold text-foreground tracking-tight">
            Simple, transparent pricing
          </h1>
          <p className="text-muted-foreground max-w-md mx-auto text-sm">
            Start free with your team. Upgrade when you need more capacity.
          </p>
        </div>

        {/* Cards */}
        <div className="grid gap-6 sm:grid-cols-2">
          {/* Free */}
          <div className="rounded-xl border border-border bg-background p-8 space-y-6 flex flex-col">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Free
              </p>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold text-foreground">$0</span>
                <span className="text-muted-foreground text-sm">/month</span>
              </div>
              <p className="text-sm text-muted-foreground pt-1">
                Perfect for small teams getting started.
              </p>
            </div>

            <ul className="space-y-3 flex-1">
              {FREE_FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-2.5 text-sm text-foreground">
                  <CheckIcon />
                  {f}
                </li>
              ))}
            </ul>

            <Link
              href="/dashboard"
              className="block text-center rounded-md border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-accent transition-colors"
            >
              Get started free
            </Link>
          </div>

          {/* Pro */}
          <div className="rounded-xl border-2 border-primary bg-background p-8 space-y-6 flex flex-col relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-primary-foreground">
                Most popular
              </span>
            </div>

            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Pro
              </p>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold text-foreground">$29</span>
                <span className="text-muted-foreground text-sm">/month</span>
              </div>
              <p className="text-sm text-muted-foreground pt-1">
                For growing teams with large networks.
              </p>
            </div>

            <ul className="space-y-3 flex-1">
              {PRO_FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-2.5 text-sm text-foreground">
                  <CheckIcon />
                  {f}
                </li>
              ))}
            </ul>

            <Link
              href="/dashboard"
              className="block text-center rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Upgrade to Pro
            </Link>
          </div>
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-muted-foreground">
          Upgrade your plan from your workspace settings. Questions?{" "}
          <a
            href="mailto:support@netmap.app"
            className="underline hover:opacity-75 transition-opacity"
          >
            Contact us
          </a>
          .
        </p>
      </main>
    </div>
  );
}
