import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import WorkspaceSettingsClient from "./WorkspaceSettingsClient";
import { workspacesApi } from "@/lib/api";

interface WorkspaceRead {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  created_at: string;
}

interface MemberRead {
  user_id: string;
  role: "admin" | "member";
  joined_at: string;
  email: string;
  display_name: string | null;
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

async function getMembers(
  id: string,
  accessToken: string
): Promise<MemberRead[]> {
  try {
    return await workspacesApi.listMembers(accessToken, id) as MemberRead[];
  } catch {
    return [];
  }
}

export default async function WorkspaceSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  const [workspace, members] = await Promise.all([
    getWorkspace(id, session.access_token),
    getMembers(id, session.access_token),
  ]);

  if (!workspace) redirect("/dashboard");

  const currentUserId = session.user.id;
  const currentMember = members.find((m) => m.user_id === currentUserId);
  const isAdmin =
    currentUserId === workspace.owner_id || currentMember?.role === "admin";

  return (
    <WorkspaceSettingsClient
      workspace={workspace}
      members={members}
      currentUserId={currentUserId}
      isAdmin={isAdmin}
    />
  );
}
