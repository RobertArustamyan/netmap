import Link from "next/link";

const FREE_FEATURES = [
  { label: "Up to 3 members", included: true },
  { label: "Up to 100 contacts", included: true },
  { label: "Up to 200 relationships", included: true },
  { label: "Tags & categories", included: true },
  { label: "Graph canvas", included: true },
  { label: "Search & filter", included: true },
  { label: "Second-degree paths", included: false },
  { label: "CSV import", included: false },
  { label: "Email notifications", included: false },
  { label: "Priority support", included: false },
];

const PRO_FEATURES = [
  { label: "Unlimited members", included: true },
  { label: "Unlimited contacts", included: true },
  { label: "Unlimited relationships", included: true },
  { label: "Tags & categories", included: true },
  { label: "Graph canvas", included: true },
  { label: "Search & filter", included: true },
  { label: "Second-degree paths", included: true },
  { label: "CSV import", included: true },
  { label: "Email notifications", included: true },
  { label: "Priority support", included: true },
];

const ALL_FEATURES = [
  { label: "Members", free: "Up to 3", pro: "Unlimited" },
  { label: "Contacts", free: "Up to 100", pro: "Unlimited" },
  { label: "Relationships", free: "Up to 200", pro: "Unlimited" },
  { label: "Tags & categories", free: true, pro: true },
  { label: "Graph canvas", free: true, pro: true },
  { label: "Search & filter", free: true, pro: true },
  { label: "Second-degree paths", free: false, pro: true },
  { label: "CSV import", free: false, pro: true },
  { label: "Email notifications", free: false, pro: true },
  { label: "Priority support", free: false, pro: true },
];

const FAQS = [
  {
    q: "Can I switch plans?",
    a: "Yes. You can upgrade or downgrade your workspace plan at any time. Changes take effect immediately and billing is prorated.",
  },
  {
    q: "What counts as a contact?",
    a: "Any person node you add to your workspace graph — whether imported via CSV or created manually.",
  },
  {
    q: "Is there a free trial for Pro?",
    a: "Yes. Every new workspace gets a 14-day Pro trial with no credit card required. You'll only be charged if you choose to continue.",
  },
  {
    q: "What happens if I exceed the free limits?",
    a: "You'll be prompted to upgrade when you hit a limit. Your existing data is never deleted — we just pause new additions until you upgrade or free up space.",
  },
];

function Check({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function Dash({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M4 10a.75.75 0 01.75-.75h10.5a.75.75 0 010 1.5H4.75A.75.75 0 014 10z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function FeatureRow({
  label,
  included,
  onDark,
}: {
  label: string;
  included: boolean;
  onDark?: boolean;
}) {
  return (
    <li className="flex items-center gap-3 text-sm">
      {included ? (
        <Check
          className={`h-4 w-4 flex-shrink-0 ${onDark ? "text-indigo-200" : "text-green-500"}`}
        />
      ) : (
        <Dash
          className={`h-4 w-4 flex-shrink-0 ${onDark ? "text-indigo-300/50" : "text-gray-300"}`}
        />
      )}
      <span className={included ? "" : onDark ? "text-indigo-200/60" : "text-gray-400"}>
        {label}
      </span>
    </li>
  );
}

function TableCell({
  value,
}: {
  value: boolean | string;
}) {
  if (typeof value === "string") {
    return <span className="text-sm text-gray-700">{value}</span>;
  }
  if (value) {
    return <Check className="h-5 w-5 text-green-500 mx-auto" />;
  }
  return <Dash className="h-5 w-5 text-gray-300 mx-auto" />;
}

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-white">
      {/* Nav back link */}
      <div className="px-6 pt-8 max-w-5xl mx-auto">
        <Link
          href="/"
          className="text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
        >
          ← NetMap
        </Link>
      </div>

      {/* Header */}
      <section className="px-6 py-20 max-w-5xl mx-auto text-center">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
          Simple, transparent pricing
        </h1>
        <p className="mt-4 text-lg text-gray-500">
          Start free. Upgrade when your network grows.
        </p>
      </section>

      {/* Pricing cards */}
      <section className="px-6 pb-20 max-w-5xl mx-auto">
        <div className="grid gap-8 md:grid-cols-2 md:items-start">
          {/* Free card */}
          <div className="rounded-2xl p-8 shadow-sm border border-gray-200 bg-white flex flex-col">
            <div className="mb-6">
              <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                Free
              </p>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-5xl font-bold text-gray-900">$0</span>
                <span className="text-gray-500 text-sm">/ month</span>
              </div>
              <p className="mt-1 text-sm text-gray-400">Free forever. No credit card needed.</p>
            </div>

            <ul className="space-y-3 flex-1 mb-8">
              {FREE_FEATURES.map((f) => (
                <FeatureRow key={f.label} label={f.label} included={f.included} />
              ))}
            </ul>

            <Link
              href="/signup"
              className="block w-full rounded-lg border border-indigo-600 px-5 py-2.5 text-center text-sm font-semibold text-indigo-600 hover:bg-indigo-50 transition-colors"
            >
              Get started free
            </Link>
          </div>

          {/* Pro card */}
          <div className="rounded-2xl p-8 shadow-sm bg-indigo-600 text-white flex flex-col relative">
            {/* Badge */}
            <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-indigo-900 px-4 py-1 text-xs font-semibold tracking-wide text-indigo-100">
              Most popular
            </span>

            <div className="mb-6">
              <p className="text-sm font-semibold uppercase tracking-wide text-indigo-200">
                Pro
              </p>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-5xl font-bold text-white">$29</span>
                <span className="text-indigo-200 text-sm">/ month per workspace</span>
              </div>
              <p className="mt-1 text-sm text-indigo-300">14-day free trial. No credit card required.</p>
            </div>

            <ul className="space-y-3 flex-1 mb-8">
              {PRO_FEATURES.map((f) => (
                <FeatureRow key={f.label} label={f.label} included={f.included} onDark />
              ))}
            </ul>

            <Link
              href="/signup"
              className="block w-full rounded-lg bg-white px-5 py-2.5 text-center text-sm font-semibold text-indigo-600 hover:bg-indigo-50 transition-colors"
            >
              Start free trial
            </Link>
          </div>
        </div>
      </section>

      {/* Feature comparison table — desktop only */}
      <section className="px-6 pb-20 max-w-5xl mx-auto hidden md:block">
        <h2 className="text-xl font-semibold text-gray-900 mb-6 text-center">
          Full feature comparison
        </h2>
        <div className="overflow-hidden rounded-2xl border border-gray-200 shadow-sm">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="py-4 px-6 text-sm font-semibold text-gray-700 w-1/2">
                  Feature
                </th>
                <th className="py-4 px-6 text-sm font-semibold text-gray-700 text-center w-1/4">
                  Free
                </th>
                <th className="py-4 px-6 text-sm font-semibold text-indigo-600 text-center w-1/4">
                  Pro
                </th>
              </tr>
            </thead>
            <tbody>
              {ALL_FEATURES.map((feature, i) => (
                <tr
                  key={feature.label}
                  className={`border-b border-gray-100 ${i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}
                >
                  <td className="py-3.5 px-6 text-sm text-gray-700">{feature.label}</td>
                  <td className="py-3.5 px-6 text-center">
                    <TableCell value={feature.free} />
                  </td>
                  <td className="py-3.5 px-6 text-center">
                    <TableCell value={feature.pro} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* FAQ section */}
      <section className="px-6 py-20 max-w-5xl mx-auto border-t border-gray-100">
        <h2 className="text-2xl font-bold text-gray-900 mb-10 text-center">
          Frequently asked questions
        </h2>
        <dl className="grid gap-8 md:grid-cols-2">
          {FAQS.map(({ q, a }) => (
            <div key={q}>
              <dt className="text-base font-semibold text-gray-900 mb-2">{q}</dt>
              <dd className="text-sm text-gray-500 leading-relaxed">{a}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Bottom CTA */}
      <section className="px-6 py-20 max-w-5xl mx-auto text-center border-t border-gray-100">
        <h2 className="text-2xl font-bold text-gray-900 mb-3">
          Ready to map your network?
        </h2>
        <p className="text-gray-500 mb-8">
          Join teams already uncovering warm paths to their next opportunity.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/signup"
            className="rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
          >
            Get started free
          </Link>
          <Link
            href="/login"
            className="rounded-lg border border-gray-300 px-6 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Log in
          </Link>
        </div>
      </section>
    </main>
  );
}
