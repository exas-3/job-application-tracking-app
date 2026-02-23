"use client";

import Link from "next/link";
import { signInWithEmailAndPassword } from "firebase/auth";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { trackAnalyticsEvent } from "@/lib/firebase/analytics";
import { firebaseAuth } from "@/lib/firebase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function RegisterForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-4 py-8">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Create account</CardTitle>
          <CardDescription>Start tracking your job search with a clean pipeline.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-4"
            onSubmit={async (e) => {
              e.preventDefault();
              setLoading(true);

              try {
                const res = await fetch("/api/register", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ name, email, password }),
                });

                const data = (await res.json()) as { error?: string };
                if (!res.ok) {
                  toast.error(data.error ?? "Registration failed.");
                  setLoading(false);
                  return;
                }

                const credential = await signInWithEmailAndPassword(
                  firebaseAuth,
                  email,
                  password,
                );
                const idToken = await credential.user.getIdToken();
                const sessionRes = await fetch("/api/session/login", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ idToken }),
                });

                if (!sessionRes.ok) {
                  toast.error("Account created, but login failed. Try logging in.");
                  setLoading(false);
                  return;
                }

                await trackAnalyticsEvent("sign_up", { method: "password" });
                await trackAnalyticsEvent("login", { method: "password" });
                toast.success("Account created.");
                router.push("/app");
              } catch {
                toast.error("Something went wrong. Please try again.");
              } finally {
                setLoading(false);
              }
            }}
          >
            <Input
              placeholder="Name (optional)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
            />
            <Input
              placeholder="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
            <Input
              placeholder="Password (min 8 chars)"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />

            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...
                </>
              ) : (
                "Create account"
              )}
            </Button>

            <p className="text-sm text-slate-600">
              Already have an account?{" "}
              <Link href="/login" className="font-medium text-emerald-700 hover:underline">
                Login
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
