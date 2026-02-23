import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/authOptions";
import { RegisterForm } from "./RegisterForm";

export default async function RegisterPage() {
  const session = await getServerSession(authOptions);
  if (session?.user) redirect("/app");
  return <RegisterForm />;
}
