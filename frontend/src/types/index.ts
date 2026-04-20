export interface User {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  is_superadmin: boolean;
  created_at: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  created_at: string;
}

export interface WorkspaceWithInvite extends Workspace {
  invite_url: string;
}

export interface Member {
  user_id: string;
  role: "admin" | "member";
  joined_at: string;
  email: string | null;
  display_name: string | null;
}

export interface InviteInfo {
  workspace_id: string;
  workspace_name: string;
  workspace_slug: string;
}

// Placeholder types for upcoming features
export interface Contact {
  id: string;
  workspace_id: string;
  added_by_user_id: string;
  name: string;
  job_title: string | null;
  company: string | null;
  linkedin_url: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  tags: Tag[];
}

export interface Edge {
  id: string;
  workspace_id: string;
  source_contact_id: string;
  target_contact_id: string;
  label: string | null;
  added_by_user_id: string;
  created_at: string;
}

export interface Tag {
  id: string;
  workspace_id: string;
  name: string;
  color: string;
}

export interface Plan {
  id: string;
  workspace_id: string;
  tier: "free" | "pro" | "enterprise";
  stripe_subscription_id: string | null;
  max_members: number;
  max_contacts: number;
  status: "active" | "past_due" | "cancelled";
}
