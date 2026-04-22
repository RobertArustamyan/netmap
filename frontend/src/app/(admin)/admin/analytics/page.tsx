import { createClient } from "@/lib/supabase-server";

const API = process.env.NEXT_PUBLIC_API_URL;

interface RecentUser {
  email: string;
  last_active_at: string;
  workspace_count: number;
}

interface AdminStats {
  total_users: number;
  total_workspaces: number;
  total_contacts: number;
  active_users_24h: number;
  active_users_7d: number;
  new_users_7d: number;
  new_workspaces_7d: number;
  recent_users: RecentUser[];
}

async function getStats(
  token: string
): Promise<{ stats: AdminStats | null; error: string | null }> {
  const res = await fetch(`${API}/api/v1/admin/stats`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    return {
      stats: null,
      error: `API error ${res.status}: ${body?.detail ?? "unknown"}`,
    };
  }
  return { stats: await res.json(), error: null };
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

interface StatCardProps {
  label: string;
  value: number;
}

function StatCard({ label, value }: StatCardProps) {
  return (
    <div className="bg-muted/60 border border-border rounded-lg px-5 py-4 space-y-1">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold text-foreground">{value.toLocaleString()}</p>
    </div>
  );
}

export default async function AdminAnalyticsPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const { stats, error } = await getStats(session?.access_token ?? "");

  return (
    <div className="px-8 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-foreground">Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Platform-wide usage metrics.
        </p>
      </div>

      {error && (
        <p className="text-sm text-destructive mb-6">{error}</p>
      )}

      {stats && (
        <div className="space-y-6">
          {/* Row 1 — four primary stats */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard label="Total Users" value={stats.total_users} />
            <StatCard label="Total Workspaces" value={stats.total_workspaces} />
            <StatCard label="Total Contacts" value={stats.total_contacts} />
            <StatCard label="Active (24h)" value={stats.active_users_24h} />
          </div>

          {/* Row 2 — growth stats */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <StatCard label="Active (7d)" value={stats.active_users_7d} />
            <StatCard label="New Users (7d)" value={stats.new_users_7d} />
            <StatCard label="New Workspaces (7d)" value={stats.new_workspaces_7d} />
          </div>

          {/* Recently active users table */}
          <div>
            <h2 className="text-base font-semibold text-foreground mb-3">
              Recently Active Users
            </h2>
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                      Email
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                      Last Active
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                      Workspaces
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {stats.recent_users.length === 0 ? (
                    <tr>
                      <td
                        colSpan={3}
                        className="px-4 py-8 text-center text-muted-foreground"
                      >
                        No recent activity.
                      </td>
                    </tr>
                  ) : (
                    stats.recent_users.map((user) => (
                      <tr key={user.email} className="hover:bg-accent/30">
                        <td className="px-4 py-3 text-foreground">
                          {user.email}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {relativeTime(user.last_active_at)}
                        </td>
                        <td className="px-4 py-3 text-foreground">
                          {user.workspace_count}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* PostHog link */}
          <div className="bg-muted/60 border border-border rounded-lg px-5 py-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-foreground">Geographic &amp; session analytics</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Page views, geo map, session recordings, and funnels are tracked in PostHog.
              </p>
            </div>
            <a
              href="https://app.posthog.com"
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Open PostHog →
            </a>
          </div>
        </div>
      )}

      {!stats && !error && (
        <div className="rounded-lg border border-border p-12 text-center space-y-2">
          <p className="text-sm font-medium text-foreground">Loading…</p>
        </div>
      )}
    </div>
  );
}
