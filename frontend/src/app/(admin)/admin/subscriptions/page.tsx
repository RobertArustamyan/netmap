import { createClient } from "@/lib/supabase-server";
import { adminApi } from "@/lib/api";

interface AdminSubscription {
  workspace_id: string;
  tier: string;
  stripe_subscription_id: string;
}

async function getSubscriptions(token: string): Promise<AdminSubscription[]> {
  try {
    return await adminApi.listSubscriptions(token) as AdminSubscription[];
  } catch {
    return [];
  }
}

export default async function AdminSubscriptionsPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const subscriptions = await getSubscriptions(session?.access_token ?? "");

  return (
    <div className="px-8 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-foreground">Subscriptions</h1>
        <p className="text-sm text-muted-foreground mt-1">
          All Stripe subscriptions across the platform.
        </p>
      </div>

      {subscriptions.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <p className="text-sm text-muted-foreground">
            No active subscriptions.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                  Workspace ID
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                  Plan Tier
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                  Stripe Subscription ID
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {subscriptions.map((sub) => (
                <tr key={sub.stripe_subscription_id} className="hover:bg-accent/30">
                  <td className="px-4 py-3 text-muted-foreground font-mono text-xs">
                    {sub.workspace_id}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                        sub.tier === "pro"
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {sub.tier}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground font-mono text-xs">
                    {sub.stripe_subscription_id}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
