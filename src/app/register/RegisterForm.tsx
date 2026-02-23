"use client";

import { signInWithEmailAndPassword } from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function RegisterForm() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <main style={{ maxWidth: 420, margin: "48px auto", padding: 16 }}>
      <h1 style={{ fontSize: 24, fontWeight: 600 }}>Create account</h1>

      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setErr(null);
          setLoading(true);

          try {
            const res = await fetch("/api/register", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ name, email, password }),
            });

            const data = await res.json();

            if (!res.ok) {
              setErr(data?.error ?? "Registration failed.");
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
              setErr("Account created, but login failed. Please try logging in.");
              setLoading(false);
              return;
            }

            router.push("/app");
          } catch {
            setErr("Something went wrong. Please try again.");
          } finally {
            setLoading(false);
          }
        }}
        style={{ display: "grid", gap: 12, marginTop: 16 }}
      >
        <input
          placeholder="Name (optional)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
        />

        <input
          placeholder="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />

        <input
          placeholder="Password (min 8 chars)"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          autoComplete="new-password"
        />

        {err && <p style={{ color: "crimson" }}>{err}</p>}

        <button type="submit" disabled={loading}>
          {loading ? "Creating..." : "Create account"}
        </button>

        <p style={{ fontSize: 14 }}>
          Already have an account?{" "}
          <a href="/login" style={{ textDecoration: "underline" }}>
            Login
          </a>
        </p>
      </form>
    </main>
  );
}
