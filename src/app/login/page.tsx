import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/authOptions";
import { LoginForm } from "./LoginForm";

export default async function LoginPage() {
  const session = await getServerSession(authOptions);
  if (session?.user) redirect("/app");
  return <LoginForm />;
}
