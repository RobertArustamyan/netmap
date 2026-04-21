import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import SettingsClient from "./SettingsClient";

export default async function AccountSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <SettingsClient email={user.email ?? ""} />
  );
}
