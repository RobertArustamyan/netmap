import { createClient } from "@/lib/supabase-server";
import WorkspacesClient from "./WorkspacesClient";

const API = process.env.NEXT_PUBLIC_API_URL;

export interface AdminWorkspace {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  owner_email: string;
  member_count: number;
  contact_count: number;
  plan_tier: string;
}

async function getWorkspaces(
  token: string
): Promise<{ workspaces: AdminWorkspace[]; error: string | null }> {
  const res = await fetch(`${API}/api/v1/admin/workspaces`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    return {
      workspaces: [],
      error: `API error ${res.status}: ${body?.detail ?? "unknown"}`,
    };
  }
  return { workspaces: await res.json(), error: null };
}

export default async function AdminWorkspacesPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const { workspaces, error } = await getWorkspaces(session?.access_token ?? "");

  return (
    <div className="px-8 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-foreground">Workspaces</h1>
        <p className="text-sm text-muted-foreground mt-1">
          All workspaces on the platform.
        </p>
      </div>
      <WorkspacesClient initialWorkspaces={workspaces} error={error} />
    </div>
  );
}
