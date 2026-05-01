import { createClient } from "@/lib/supabase-server";
import UsersClient from "./UsersClient";
import { adminApi } from "@/lib/api";

export interface AdminUser {
  id: string;
  email: string;
  created_at: string;
  last_active_at: string | null;
  is_superadmin: boolean;
  workspace_count: number;
}

async function getUsers(token: string): Promise<AdminUser[]> {
  try {
    return await adminApi.listUsers(token) as AdminUser[];
  } catch {
    return [];
  }
}

export default async function AdminUsersPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const users = await getUsers(session?.access_token ?? "");

  return (
    <div className="px-8 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-foreground">Users</h1>
        <p className="text-sm text-muted-foreground mt-1">
          All registered users on the platform.
        </p>
      </div>
      <UsersClient initialUsers={users} />
    </div>
  );
}
