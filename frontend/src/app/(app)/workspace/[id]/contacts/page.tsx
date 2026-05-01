import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import ContactsClient from "./ContactsClient";
import { contactsApi } from "@/lib/api";

interface ContactRead {
  id: string;
  workspace_id: string;
  added_by_user_id: string | null;
  name: string;
  job_title: string | null;
  company: string | null;
  linkedin_url: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  tags: { id: string; workspace_id: string; name: string; color: string | null }[];
}

export default async function ContactsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  let contacts: ContactRead[] = [];
  try {
    contacts = await contactsApi.list(session.access_token, id) as ContactRead[];
  } catch {
    contacts = [];
  }

  return <ContactsClient workspaceId={id} initialContacts={contacts} />;
}
