"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { posthog } from "@/lib/posthog";

export default function PostHogIdentify() {
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        posthog.identify(session.user.id, { email: session.user.email });
      }
    });
  }, []);

  return null;
}
