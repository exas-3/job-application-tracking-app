import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { ApplicationsPanel } from "./ApplicationsPanel";
import { LogoutButton } from "./LogoutButton";

export default async function AppHome() {
  const session = await getCurrentSession();
  if (!session) redirect("/login");

  return (
    <main className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-8">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-600">Signed in as {session.email ?? "unknown"}</p>
        </div>
        <LogoutButton />
      </header>
      <ApplicationsPanel />
    </main>
  );
}
