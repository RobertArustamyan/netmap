"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { authApi, PlanLimitError, ApiError } from "@/lib/api";

interface Props {
  token: string;
  workspaceName: string;
}

export default function AcceptInviteButton({ token, workspaceName }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAccept() {
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      router.push(`/login?next=/invite/${token}`);
      return;
    }

    try {
      const data = await authApi.acceptInvite(session.access_token, token);
      router.push(`/workspace/${data.workspace_id}/graph`);
    } catch (e) {
      if (e instanceof PlanLimitError) {
        setError(
          `This workspace has reached its member limit (${e.current}/${e.limit}). The owner needs to upgrade to Pro.`
        );
      } else {
        setError(e instanceof ApiError ? e.message : "Something went wrong");
      }
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <button
        onClick={handleAccept}
        disabled={loading}
        className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Joining…" : `Join ${workspaceName}`}
      </button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
