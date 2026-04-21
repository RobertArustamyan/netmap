import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase-server";

async function getWorkspaces(accessToken: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/workspaces`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!res.ok) return [];
  return res.json();
}

export default async function DashboardPage() {
  const supabase = await createClient();
  // getSession reads from cookie — no network call. Middleware already verified auth.
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.user) redirect("/login");

  const user = session.user;
  const workspaces = await getWorkspaces(session.access_token);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <span className="font-semibold text-lg">NetMap</span>
        <span className="text-sm text-muted-foreground">{user.email}</span>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10 space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Your workspaces</h1>
          <Link
            href="/dashboard/new"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            New workspace
          </Link>
        </div>

        {workspaces.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-12 text-center space-y-3">
            <p className="text-muted-foreground text-sm">No workspaces yet.</p>
            <Link
              href="/dashboard/new"
              className="text-sm font-medium text-primary hover:underline"
            >
              Create your first workspace
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {workspaces.map((ws: { id: string; name: string; slug: string }) => (
              <Link
                key={ws.id}
                href={`/workspace/${ws.id}/graph`}
                className="rounded-lg border border-border p-5 hover:bg-accent transition-colors space-y-1"
              >
                <p className="font-medium">{ws.name}</p>
                <p className="text-xs text-muted-foreground">/{ws.slug}</p>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
