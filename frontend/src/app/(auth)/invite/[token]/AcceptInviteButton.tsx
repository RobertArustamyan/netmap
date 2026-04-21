"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

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

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/accept-invite/${token}`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
      }
    );

    if (res.status === 402) {
      const body = await res.json().catch(() => ({}));
      const detail = body?.detail;
      setError(
        detail?.code === "plan_limit_exceeded"
          ? `This workspace has reached its member limit (${detail.current}/${detail.limit}). The owner needs to upgrade to Pro.`
          : "This workspace has reached its member limit."
      );
      setLoading(false);
      return;
    }

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.detail ?? "Something went wrong");
      setLoading(false);
      return;
    }

    const data = await res.json();
    router.push(`/workspace/${data.workspace_id}/graph`);
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
