"use client";

import { trackAnalyticsEvent } from "@/lib/firebase/analytics";
import { useEffect, useState } from "react";

type Application = {
  id: string;
  company: string;
  role: string;
  status: string;
  createdAt: string;
};

export function ApplicationsPanel() {
  const [items, setItems] = useState<Application[]>([]);
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function loadApplications() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/applications", { cache: "no-store" });
      if (!res.ok) {
        setErr("Failed to load applications.");
        setLoading(false);
        return;
      }
      const data = (await res.json()) as { applications: Application[] };
      setItems(data.applications ?? []);
    } catch {
      setErr("Failed to load applications.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadApplications();
  }, []);

  return (
    <section style={{ marginTop: 24 }}>
      <h2 style={{ fontSize: 20, fontWeight: 600 }}>Applications</h2>

      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setErr(null);
          setSaving(true);

          try {
            const res = await fetch("/api/applications", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ company, role }),
            });

            const data = (await res.json()) as {
              error?: string;
              application?: Application;
            };
            if (!res.ok || !data.application) {
              setErr(data.error ?? "Failed to create application.");
              setSaving(false);
              return;
            }

            setItems((prev) => [data.application as Application, ...prev]);
            setCompany("");
            setRole("");
            await trackAnalyticsEvent("application_created");
          } catch {
            setErr("Failed to create application.");
          } finally {
            setSaving(false);
          }
        }}
        style={{ display: "grid", gap: 8, marginTop: 12, maxWidth: 480 }}
      >
        <input
          placeholder="Company"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          required
        />
        <input
          placeholder="Role"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          required
        />
        <button type="submit" disabled={saving}>
          {saving ? "Saving..." : "Add application"}
        </button>
      </form>

      {err && <p style={{ color: "crimson", marginTop: 8 }}>{err}</p>}

      {loading ? (
        <p style={{ marginTop: 12 }}>Loading...</p>
      ) : (
        <ul style={{ marginTop: 16, display: "grid", gap: 8, paddingLeft: 18 }}>
          {items.map((item) => (
            <li key={item.id}>
              <strong>{item.company}</strong> - {item.role} [{item.status}]{" "}
              <button
                type="button"
                onClick={async () => {
                  const nextStatus =
                    item.status === "SAVED" ? "APPLIED" : "SAVED";
                  const res = await fetch(`/api/applications/${item.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ status: nextStatus }),
                  });
                  if (!res.ok) return;
                  setItems((prev) =>
                    prev.map((x) =>
                      x.id === item.id ? { ...x, status: nextStatus } : x,
                    ),
                  );
                }}
                style={{ marginLeft: 8 }}
              >
                Toggle Status
              </button>
              <button
                type="button"
                onClick={async () => {
                  const res = await fetch(`/api/applications/${item.id}`, {
                    method: "DELETE",
                  });
                  if (!res.ok) return;
                  setItems((prev) => prev.filter((x) => x.id !== item.id));
                }}
                style={{ marginLeft: 8 }}
              >
                Delete
              </button>
            </li>
          ))}
          {items.length === 0 && <li>No applications yet.</li>}
        </ul>
      )}
    </section>
  );
}
