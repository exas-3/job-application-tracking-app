"use client";

import { trackAnalyticsEvent } from "@/lib/firebase/analytics";
import { useEffect, useState } from "react";

type ApplicationStatus =
  | "SAVED"
  | "APPLIED"
  | "HR"
  | "TECH"
  | "ONSITE"
  | "OFFER"
  | "REJECTED"
  | "WITHDRAWN";

type ApplicationItem = {
  id: string;
  company: string;
  role: string;
  status: ApplicationStatus;
  createdAt: string;
  updatedAt?: string;
};

const STATUSES: ApplicationStatus[] = [
  "SAVED",
  "APPLIED",
  "HR",
  "TECH",
  "ONSITE",
  "OFFER",
  "REJECTED",
  "WITHDRAWN",
];

type SortMode = "updated_desc" | "created_desc" | "company_asc";

async function wait(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function fetchWithRetry(
  input: RequestInfo | URL,
  init: RequestInit,
  retries = 2,
) {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const res = await fetch(input, init);
      if (res.ok) return res;
      if (res.status < 500 || attempt === retries) return res;
      await wait(200 * (attempt + 1));
    } catch (error) {
      lastError = error;
      if (attempt === retries) throw error;
      await wait(200 * (attempt + 1));
    }
  }

  throw lastError ?? new Error("Request failed");
}

export function ApplicationsPanel() {
  const [items, setItems] = useState<ApplicationItem[]>([]);
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [filterStatus, setFilterStatus] = useState<"ALL" | ApplicationStatus>(
    "ALL",
  );
  const [sortMode, setSortMode] = useState<SortMode>("updated_desc");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [retryLabel, setRetryLabel] = useState<string | null>(null);
  const [retryAction, setRetryAction] = useState<(() => Promise<void>) | null>(
    null,
  );

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
      const data = (await res.json()) as { applications: ApplicationItem[] };
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

  const normalizedCompany = company.trim();
  const normalizedRole = role.trim();
  const formInvalid = normalizedCompany.length === 0 || normalizedRole.length === 0;

  const filteredItems = items
    .filter((item) => filterStatus === "ALL" || item.status === filterStatus)
    .sort((a, b) => {
      if (sortMode === "company_asc") {
        return a.company.localeCompare(b.company);
      }

      if (sortMode === "created_desc") {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }

      return (
        new Date(b.updatedAt ?? b.createdAt).getTime() -
        new Date(a.updatedAt ?? a.createdAt).getTime()
      );
    });

  const grouped = Object.fromEntries(
    STATUSES.map((status) => [
      status,
      filteredItems.filter((item) => item.status === status),
    ]),
  ) as Record<ApplicationStatus, ApplicationItem[]>;

  return (
    <section style={{ marginTop: 24 }}>
      <h2 style={{ fontSize: 20, fontWeight: 600 }}>Applications Board</h2>

      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (formInvalid) return;
          setErr(null);
          setRetryLabel(null);
          setRetryAction(null);
          setSaving(true);

          const tempId = `tmp-${Date.now()}`;
          const optimistic: ApplicationItem = {
            id: tempId,
            company: normalizedCompany,
            role: normalizedRole,
            status: "SAVED",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          setItems((prev) => [optimistic, ...prev]);

          const runCreate = async () => {
            const res = await fetchWithRetry("/api/applications", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                company: normalizedCompany,
                role: normalizedRole,
              }),
            });

            const data = (await res.json()) as {
              error?: string;
              application?: ApplicationItem;
            };
            if (!res.ok || !data.application) {
              throw new Error(data.error ?? "Failed to create application.");
            }

            setItems((prev) =>
              prev.map((item) =>
                item.id === tempId ? (data.application as ApplicationItem) : item,
              ),
            );
            setCompany("");
            setRole("");
            await trackAnalyticsEvent("application_created");
          };

          try {
            await runCreate();
          } catch (error) {
            const message =
              error instanceof Error
                ? error.message
                : "Failed to create application.";
            setItems((prev) => prev.filter((item) => item.id !== tempId));
            setErr(message);
            setRetryLabel("Retry create");
            setRetryAction(() => runCreate);
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
        />
        <input
          placeholder="Role"
          value={role}
          onChange={(e) => setRole(e.target.value)}
        />
        <button type="submit" disabled={saving || formInvalid}>
          {saving ? "Saving..." : "Add application"}
        </button>
        {formInvalid && (
          <p style={{ fontSize: 13, color: "#8a5a00" }}>
            Company and role are required.
          </p>
        )}
      </form>

      <div
        style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
          marginTop: 12,
          flexWrap: "wrap",
        }}
      >
        <label style={{ fontSize: 14 }}>
          Filter:
          <select
            value={filterStatus}
            onChange={(e) =>
              setFilterStatus(e.target.value as "ALL" | ApplicationStatus)
            }
            style={{ marginLeft: 6 }}
          >
            <option value="ALL">All</option>
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>
        <label style={{ fontSize: 14 }}>
          Sort:
          <select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as SortMode)}
            style={{ marginLeft: 6 }}
          >
            <option value="updated_desc">Recently updated</option>
            <option value="created_desc">Newest first</option>
            <option value="company_asc">Company A-Z</option>
          </select>
        </label>
      </div>

      {err && (
        <div style={{ marginTop: 8 }}>
          <p style={{ color: "crimson" }}>{err}</p>
          {retryAction && retryLabel && (
            <button
              type="button"
              onClick={async () => {
                setErr(null);
                const action = retryAction;
                setRetryAction(null);
                setRetryLabel(null);
                try {
                  await action();
                } catch (error) {
                  const message =
                    error instanceof Error
                      ? error.message
                      : "Retry failed. Please try again.";
                  setErr(message);
                }
              }}
            >
              {retryLabel}
            </button>
          )}
        </div>
      )}

      {loading ? (
        <p style={{ marginTop: 12 }}>Loading...</p>
      ) : (
        <div
          style={{
            marginTop: 16,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 12,
          }}
        >
          {STATUSES.map((status) => (
            <section
              key={status}
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 10,
                padding: 10,
                background: "#fafafa",
              }}
            >
              <h3 style={{ fontSize: 14, fontWeight: 700 }}>
                {status} ({grouped[status].length})
              </h3>

              <ul style={{ marginTop: 8, display: "grid", gap: 8, paddingLeft: 0 }}>
                {grouped[status].map((item) => (
                  <li
                    key={item.id}
                    style={{
                      listStyle: "none",
                      border: "1px solid #d1d5db",
                      borderRadius: 8,
                      padding: 8,
                      background: "white",
                    }}
                  >
                    <div style={{ fontSize: 14, fontWeight: 600 }}>
                      {item.company}
                    </div>
                    <div style={{ fontSize: 13 }}>{item.role}</div>
                    <div style={{ marginTop: 6, display: "flex", gap: 6 }}>
                      <button
                        type="button"
                        onClick={async () => {
                          const nextStatus: ApplicationStatus =
                            item.status === "SAVED" ? "APPLIED" : "SAVED";
                          const previous = item.status;
                          setErr(null);
                          setItems((prev) =>
                            prev.map((x) =>
                              x.id === item.id
                                ? {
                                    ...x,
                                    status: nextStatus,
                                    updatedAt: new Date().toISOString(),
                                  }
                                : x,
                            ),
                          );

                          const runUpdate = async () => {
                            const res = await fetchWithRetry(
                              `/api/applications/${item.id}`,
                              {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ status: nextStatus }),
                              },
                            );
                            if (!res.ok) {
                              const data = (await res
                                .json()
                                .catch(() => ({}))) as { error?: string };
                              throw new Error(
                                data.error ?? "Failed to update application.",
                              );
                            }
                          };

                          try {
                            await runUpdate();
                          } catch (error) {
                            const message =
                              error instanceof Error
                                ? error.message
                                : "Failed to update application.";
                            setItems((prev) =>
                              prev.map((x) =>
                                x.id === item.id ? { ...x, status: previous } : x,
                              ),
                            );
                            setErr(message);
                            setRetryLabel("Retry update");
                            setRetryAction(() => runUpdate);
                          }
                        }}
                      >
                        Toggle
                      </button>
                      <button
                        type="button"
                        disabled={pendingDeleteId === item.id}
                        onClick={async () => {
                          setErr(null);
                          setPendingDeleteId(item.id);
                          const snapshot = item;
                          setItems((prev) =>
                            prev.filter((x) => x.id !== item.id),
                          );

                          const runDelete = async () => {
                            const res = await fetchWithRetry(
                              `/api/applications/${item.id}`,
                              {
                                method: "DELETE",
                              },
                            );
                            if (!res.ok) {
                              const data = (await res
                                .json()
                                .catch(() => ({}))) as { error?: string };
                              throw new Error(
                                data.error ?? "Failed to delete application.",
                              );
                            }
                          };

                          try {
                            await runDelete();
                          } catch (error) {
                            const message =
                              error instanceof Error
                                ? error.message
                                : "Failed to delete application.";
                            setItems((prev) => [snapshot, ...prev]);
                            setErr(message);
                            setRetryLabel("Retry delete");
                            setRetryAction(() => runDelete);
                          } finally {
                            setPendingDeleteId(null);
                          }
                        }}
                      >
                        {pendingDeleteId === item.id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </li>
                ))}
                {grouped[status].length === 0 && (
                  <li style={{ listStyle: "none", fontSize: 12, color: "#6b7280" }}>
                    No cards.
                  </li>
                )}
              </ul>
            </section>
          ))}
        </div>
      )}
    </section>
  );
}
