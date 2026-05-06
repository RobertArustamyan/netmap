import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import WorkspaceShell from "./WorkspaceShell";
import WorkspaceSwitcher from "./WorkspaceSwitcher";
import { workspacesApi } from "@/lib/api";

interface WorkspaceRead {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  created_at: string;
}

interface MeResponse {
  contact: unknown;
  profile_complete: boolean;
}

async function getWorkspace(
  id: string,
  accessToken: string
): Promise<WorkspaceRead | null> {
  try {
    return await workspacesApi.get(accessToken, id) as WorkspaceRead;
  } catch {
    return null;
  }
}

async function getMe(
  id: string,
  accessToken: string
): Promise<MeResponse | null> {
  try {
    return await workspacesApi.getMe(accessToken, id) as MeResponse;
  } catch {
    return null;
  }
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
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) redirect("/login");

  const token = session.access_token;
  const [workspace, me, allWorkspaces] = await Promise.all([
    getWorkspace(id, token),
    getMe(id, token),
    workspacesApi.list(token).catch(() => [] as WorkspaceRead[]),
  ]);

  // Default to true so we don't block if the API is unavailable
  const profileComplete = me?.profile_complete ?? true;
  const userEmail = user.email ?? "";

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

        {/* Center: workspace switcher */}
        <div className="flex-1 flex justify-center">
          <WorkspaceSwitcher
            currentId={id}
            currentName={workspace?.name ?? "Workspace"}
            workspaces={(allWorkspaces as WorkspaceRead[]).map((w) => ({ id: w.id, name: w.name }))}
          />
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

      <main className="flex-1">
        <WorkspaceShell
          workspaceId={id}
          workspaceName={workspace?.name ?? "Workspace"}
          profileComplete={profileComplete}
          userEmail={userEmail}
        >
          {children}
        </WorkspaceShell>
      </main>
    </div>
  );
}
