import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase-server";

interface WorkspaceRead {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  created_at: string;
}

async function getWorkspace(
  id: string,
  accessToken: string
): Promise<WorkspaceRead | null> {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/v1/workspaces/${id}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    }
  );
  if (!res.ok) return null;
  return res.json();
}

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const workspace = session ? await getWorkspace(id, session.access_token) : null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border px-6 py-3 flex items-center gap-6">
        {/* Left: logo */}
        <Link
          href="/dashboard"
          className="font-semibold text-lg text-foreground hover:opacity-80 transition-opacity shrink-0"
        >
          NetMap
        </Link>

        {/* Center: workspace name */}
        <div className="flex-1 flex justify-center">
          <span className="font-medium text-foreground truncate max-w-xs">
            {workspace?.name ?? "Workspace"}
          </span>
        </div>

        {/* Right: nav links */}
        <nav className="flex items-center gap-1 shrink-0">
          <Link
            href={`/workspace/${id}/graph`}
            className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            Graph
          </Link>
          <Link
            href={`/workspace/${id}/contacts`}
            className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            Contacts
          </Link>
          <Link
            href={`/workspace/${id}/settings`}
            className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            Settings
          </Link>
        </nav>
      </header>

      <main className="flex-1">{children}</main>
    </div>
  );
}
