import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { LoginForm } from "./LoginForm";

export default async function LoginPage() {
  const session = await getCurrentSession();
  if (session) redirect("/app");
  return <LoginForm />;
}
