import { createClient } from "@/lib/supabase-server";
import WorkspacesClient from "./WorkspacesClient";
import { adminApi, ApiError } from "@/lib/api";

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
  try {
    const workspaces = await adminApi.listWorkspaces(token) as AdminWorkspace[];
    return { workspaces, error: null };
  } catch (e) {
    const status = e instanceof ApiError ? e.status : "?";
    const message = e instanceof ApiError ? e.message : "unknown";
    return { workspaces: [], error: `API error ${status}: ${message}` };
  }
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
