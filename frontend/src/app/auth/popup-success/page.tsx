"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function PopupSuccess() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const next = searchParams.get("next") ?? "/dashboard";

  useEffect(() => {
    if (window.opener) {
      window.opener.postMessage({ type: "oauth-success" }, window.location.origin);
      window.close();
    } else {
      router.replace(next);
    }
  }, [next, router]);

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", fontFamily: "sans-serif", color: "#64748b" }}>
      Signing you in…
    </div>
  );
}
