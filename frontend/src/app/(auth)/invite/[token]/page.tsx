import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import AcceptInviteButton from "./AcceptInviteButton";

interface InviteInfo {
  workspace_id: string;
  workspace_name: string;
  workspace_slug: string;
}

async function getInviteInfo(token: string): Promise<InviteInfo | null> {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/invite/${token}`,
    { cache: "no-store" }
  );
  if (!res.ok) return null;
  return res.json();
}

export default async function InvitePage({
  params,
}: {
  params: { token: string };
}) {
  const { token } = params;
  const invite = await getInviteInfo(token);

  if (!invite) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center space-y-3">
          <h1 className="text-xl font-semibold">Invite not found</h1>
          <p className="text-sm text-muted-foreground">
            This invite link is invalid or has expired.
          </p>
          <Link href="/dashboard" className="text-sm font-medium text-primary hover:underline">
            Go to dashboard
          </Link>
        </div>
      </div>
    );
  }

  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user ?? null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">You&apos;re invited</h1>
          <p className="text-muted-foreground">
            Join <strong>{invite.workspace_name}</strong> on NetMap
          </p>
        </div>

        {user ? (
          <AcceptInviteButton token={token} workspaceName={invite.workspace_name} />
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Sign in or create an account to accept this invite.
            </p>
            <Link
              href={`/login?next=/invite/${token}`}
              className="block w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Sign in
            </Link>
            <Link
              href={`/signup?next=/invite/${token}`}
              className="block w-full rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-accent"
            >
              Create account
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
