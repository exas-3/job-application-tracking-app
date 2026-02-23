import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/authOptions";
import { LogoutButton } from "./LogoutButton";

export default async function AppHome() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  return (
    <main style={{ padding: 24 }}>
      <h1 style={{ fontSize: 24, fontWeight: 600 }}>Dashboard</h1>
      <pre style={{ marginTop: 16 }}>{JSON.stringify(session, null, 2)}</pre>
      <LogoutButton />
    </main>
  );
}
