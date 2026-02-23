"use client";

import { signInWithEmailAndPassword } from "firebase/auth";
import { trackAnalyticsEvent } from "@/lib/firebase/analytics";
import { firebaseAuth } from "@/lib/firebase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <main style={{ maxWidth: 420, margin: "48px auto", padding: 16 }}>
      <h1 style={{ fontSize: 24, fontWeight: 600 }}>Login</h1>

      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setErr(null);
          setLoading(true);

          try {
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
              setErr("Unable to create session. Please try again.");
              setLoading(false);
              return;
            }

            await trackAnalyticsEvent("login", { method: "password" });
            setLoading(false);
            router.push("/app");
          } catch {
            setErr("Invalid email or password.");
            setLoading(false);
          }
        }}
        style={{ display: "grid", gap: 12, marginTop: 16 }}
      >
        <input
          placeholder="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />

        <input
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
        />

        {err && <p style={{ color: "crimson" }}>{err}</p>}

        <button type="submit" disabled={loading}>
          {loading ? "Logging in..." : "Login"}
        </button>

        <p style={{ fontSize: 14 }}>
          No account?{" "}
          <a href="/register" style={{ textDecoration: "underline" }}>
            Create one
          </a>
        </p>
      </form>
    </main>
  );
}
