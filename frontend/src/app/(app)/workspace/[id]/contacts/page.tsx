import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import ContactsClient from "./ContactsClient";

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
}

export default async function ContactsPage({
  params,
}: {
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

  if (!session) redirect("/login");

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/v1/workspaces/${id}/contacts`,
    {
      headers: { Authorization: `Bearer ${session.access_token}` },
      cache: "no-store",
    }
  );

  const contacts: ContactRead[] = res.ok ? await res.json() : [];

  return <ContactsClient workspaceId={id} initialContacts={contacts} />;
}
