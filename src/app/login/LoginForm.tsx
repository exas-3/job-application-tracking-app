"use client";

import Link from "next/link";
import { signInWithEmailAndPassword } from "firebase/auth";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { trackAnalyticsEvent } from "@/lib/firebase/analytics";
import { getFirebaseAuthInstance } from "@/lib/firebase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-4 py-8">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Welcome back</CardTitle>
          <CardDescription>Sign in to continue managing your pipeline.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-4"
            onSubmit={async (e) => {
              e.preventDefault();
              setLoading(true);

              try {
                const credential = await signInWithEmailAndPassword(
                  getFirebaseAuthInstance(),
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
                  toast.error("Unable to create session. Please try again.");
                  setLoading(false);
                  return;
                }

                await trackAnalyticsEvent("login", { method: "password" });
                toast.success("Logged in successfully.");
                router.push("/app");
              } catch {
                toast.error("Invalid email or password.");
              } finally {
                setLoading(false);
              }
            }}
          >
            <Input
              placeholder="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />

            <Input
              placeholder="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />

            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Logging in...
                </>
              ) : (
                "Login"
              )}
            </Button>

            <p className="text-sm text-slate-600">
              No account?{" "}
              <Link href="/register" className="font-medium text-emerald-700 hover:underline">
                Create one
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
