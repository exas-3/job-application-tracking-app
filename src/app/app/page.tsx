import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { LogoutButton } from "./LogoutButton";

export default async function AppHome() {
  const session = await getCurrentSession();
  if (!session) redirect("/login");

  return (
    <main style={{ padding: 24 }}>
      <h1 style={{ fontSize: 24, fontWeight: 600 }}>Dashboard</h1>
      <pre style={{ marginTop: 16 }}>{JSON.stringify(session, null, 2)}</pre>
      <LogoutButton />
    </main>
  );
}
