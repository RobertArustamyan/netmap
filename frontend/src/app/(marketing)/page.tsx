import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-4xl font-bold tracking-tight">NetMap</h1>
      <p className="text-muted-foreground text-center max-w-md">
        Map your team&apos;s collective professional network. Find warm paths to anyone.
      </p>
      <div className="flex gap-4">
        <Link
          href="/signup"
          className="rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Get started
        </Link>
        <Link
          href="/login"
          className="rounded-md border px-5 py-2 text-sm font-medium hover:bg-accent"
        >
          Log in
        </Link>
      </div>
    </main>
  );
}
