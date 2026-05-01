import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { adminApi, ApiError } from "@/lib/api";

const navLinks = [
  { href: "/admin/users", label: "Users" },
  { href: "/admin/workspaces", label: "Workspaces" },
  { href: "/admin/analytics", label: "Analytics" },
  { href: "/admin/subscriptions", label: "Subscriptions" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) redirect("/login");

  // Guard: verify superadmin access by calling any admin endpoint
  try {
    await adminApi.listUsers(session?.access_token ?? "");
  } catch (e) {
    if (e instanceof ApiError && (e.status === 403 || e.status === 401)) {
      redirect("/dashboard");
    }
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 border-r border-border flex flex-col">
        <div className="px-5 py-5 border-b border-border">
          <Link
            href="/dashboard"
            className="text-sm font-semibold text-foreground hover:text-primary transition-colors"
          >
            NetMap
          </Link>
          <p className="text-xs text-muted-foreground mt-0.5">Admin Panel</p>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {navLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="block rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors"
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="px-5 py-4 border-t border-border">
          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          <Link
            href="/dashboard"
            className="text-xs text-primary hover:underline mt-1 inline-block"
          >
            Back to app
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
