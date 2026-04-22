import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import WorkspaceSettingsClient from "./WorkspaceSettingsClient";

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

async function getMembers(
  id: string,
  accessToken: string
): Promise<MemberRead[]> {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/v1/workspaces/${id}/members`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    }
  );
  if (!res.ok) return [];
  return res.json();
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
