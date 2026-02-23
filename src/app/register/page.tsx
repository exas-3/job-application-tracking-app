import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { RegisterForm } from "./RegisterForm";

export default async function RegisterPage() {
  const session = await getCurrentSession();
  if (session) redirect("/app");
  return <RegisterForm />;
}
