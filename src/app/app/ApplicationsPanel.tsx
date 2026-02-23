"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Edit3, Plus, RefreshCw, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { trackAnalyticsEvent } from "@/lib/firebase/analytics";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

const STATUSES = [
  "SAVED",
  "APPLIED",
  "HR",
  "TECH",
  "ONSITE",
  "OFFER",
  "REJECTED",
  "WITHDRAWN",
] as const;

type ApplicationStatus = (typeof STATUSES)[number];

type SortMode = "updated_desc" | "created_desc" | "company_asc";

type ApplicationItem = {
  id: string;
  company: string;
  role: string;
  status: ApplicationStatus;
  createdAt: string;
  updatedAt?: string;
};

type PageResponse = {
  applications: ApplicationItem[];
  pageInfo?: {
    nextCursor: string | null;
    limit: number;
  };
};

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
      await wait(220 * (attempt + 1));
    } catch (error) {
      lastError = error;
      if (attempt === retries) throw error;
      await wait(220 * (attempt + 1));
    }
  }
  throw lastError ?? new Error("Request failed");
}

function badgeVariantForStatus(status: ApplicationStatus) {
  switch (status) {
    case "SAVED":
      return "neutral" as const;
    case "APPLIED":
      return "blue" as const;
    case "HR":
    case "TECH":
    case "ONSITE":
      return "purple" as const;
    case "OFFER":
      return "emerald" as const;
    case "REJECTED":
    case "WITHDRAWN":
      return "red" as const;
    default:
      return "neutral" as const;
  }
}

function isApplicationStatus(value: string | null): value is ApplicationStatus {
  return STATUSES.some((status) => status === value);
}

export function ApplicationsPanel() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [items, setItems] = useState<ApplicationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const [dialogMode, setDialogMode] = useState<"create" | "edit" | null>(null);
  const [editing, setEditing] = useState<ApplicationItem | null>(null);
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState<ApplicationStatus>("SAVED");
  const [saving, setSaving] = useState(false);

  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const activeStatus = isApplicationStatus(searchParams.get("status"))
    ? searchParams.get("status")
    : null;
  const query = searchParams.get("q") ?? "";
  const sortMode =
    (searchParams.get("sort") as SortMode | null) ?? "updated_desc";

  const setQueryParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(searchParams.toString());
    if (value && value.length > 0) {
      next.set(key, value);
    } else {
      next.delete(key);
    }

    const nextQuery = next.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, {
      scroll: false,
    });
  };

  const loadApplications = async ({
    reset,
    cursor,
  }: {
    reset: boolean;
    cursor?: string;
  }) => {
    if (reset) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const params = new URLSearchParams();
      params.set("limit", "24");
      if (activeStatus) params.set("status", activeStatus);
      if (cursor) params.set("cursor", cursor);

      const res = await fetch(`/api/applications?${params.toString()}`, {
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error("Failed to load applications.");
      }

      const data = (await res.json()) as PageResponse;
      setItems((prev) => (reset ? data.applications : [...prev, ...data.applications]));
      setNextCursor(data.pageInfo?.nextCursor ?? null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load applications.";
      toast.error(message, {
        action: {
          label: "Retry",
          onClick: () => {
            void loadApplications({ reset: true });
          },
        },
      });
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadApplications({ reset: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStatus]);

  const visibleItems = useMemo(() => {
    const lower = query.trim().toLowerCase();
    const filtered = lower
      ? items.filter(
          (item) =>
            item.company.toLowerCase().includes(lower) ||
            item.role.toLowerCase().includes(lower),
        )
      : items;

    return filtered.sort((a, b) => {
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
  }, [items, query, sortMode]);

  const grouped = useMemo(() => {
    return Object.fromEntries(
      STATUSES.map((value) => [
        value,
        visibleItems.filter((item) => item.status === value),
      ]),
    ) as Record<ApplicationStatus, ApplicationItem[]>;
  }, [visibleItems]);

  const openCreate = () => {
    setDialogMode("create");
    setEditing(null);
    setCompany("");
    setRole("");
    setStatus("SAVED");
  };

  const openEdit = (item: ApplicationItem) => {
    setDialogMode("edit");
    setEditing(item);
    setCompany(item.company);
    setRole(item.role);
    setStatus(item.status);
  };

  const runCreate = async () => {
    const tempId = `tmp-${Date.now()}`;
    const optimistic: ApplicationItem = {
      id: tempId,
      company,
      role,
      status,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setItems((prev) => [optimistic, ...prev]);

    const request = async () => {
      const res = await fetchWithRetry("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company, role, status }),
      });

      const data = (await res.json()) as {
        error?: string;
        application?: ApplicationItem;
      };

      if (!res.ok || !data.application) {
        throw new Error(data.error ?? "Failed to create application.");
      }

      setItems((prev) =>
        prev.map((item) => (item.id === tempId ? data.application! : item)),
      );
      await trackAnalyticsEvent("application_created", { status });
      toast.success("Application created.");
    };

    try {
      await request();
    } catch (error) {
      setItems((prev) => prev.filter((item) => item.id !== tempId));
      const message =
        error instanceof Error
          ? error.message
          : "Failed to create application.";
      toast.error(message, {
        action: {
          label: "Retry",
          onClick: () => {
            void runCreate();
          },
        },
      });
      throw error;
    }
  };

  const runUpdate = async () => {
    if (!editing) return;

    const prev = editing;
    const next: ApplicationItem = {
      ...editing,
      company,
      role,
      status,
      updatedAt: new Date().toISOString(),
    };

    setItems((list) => list.map((item) => (item.id === editing.id ? next : item)));

    const request = async () => {
      const res = await fetchWithRetry(`/api/applications/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company, role, status }),
      });

      const data = (await res.json()) as {
        error?: string;
        application?: ApplicationItem;
      };

      if (!res.ok || !data.application) {
        throw new Error(data.error ?? "Failed to update application.");
      }

      setItems((list) =>
        list.map((item) => (item.id === editing.id ? data.application! : item)),
      );
      toast.success("Application updated.");
    };

    try {
      await request();
    } catch (error) {
      setItems((list) => list.map((item) => (item.id === prev.id ? prev : item)));
      const message =
        error instanceof Error
          ? error.message
          : "Failed to update application.";
      toast.error(message, {
        action: {
          label: "Retry",
          onClick: () => {
            void runUpdate();
          },
        },
      });
      throw error;
    }
  };

  const runDelete = async (item: ApplicationItem) => {
    setPendingDeleteId(item.id);
    setItems((prev) => prev.filter((value) => value.id !== item.id));

    const request = async () => {
      const res = await fetchWithRetry(`/api/applications/${item.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? "Failed to delete application.");
      }

      toast.success("Application deleted.");
    };

    try {
      await request();
    } catch (error) {
      setItems((prev) => [item, ...prev]);
      const message =
        error instanceof Error
          ? error.message
          : "Failed to delete application.";
      toast.error(message, {
        action: {
          label: "Retry",
          onClick: () => {
            void runDelete(item);
          },
        },
      });
    } finally {
      setPendingDeleteId(null);
    }
  };

  return (
    <section className="space-y-4">
      <Card>
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Application Board</CardTitle>
              <CardDescription>
                Track all opportunities in one kanban-style pipeline.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setRefreshing(true);
                  void loadApplications({ reset: true });
                }}
                disabled={refreshing}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <Button onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" /> New
              </Button>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="relative md:col-span-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                aria-label="Search applications"
                placeholder="Search company or role..."
                value={query}
                onChange={(event) => {
                  setQueryParam("q", event.target.value || null);
                }}
                className="pl-9"
              />
            </div>
            <Select
              aria-label="Sort applications"
              value={sortMode}
              onChange={(event) => {
                const nextSort = event.target.value as SortMode;
                setQueryParam("sort", nextSort);
                void trackAnalyticsEvent("filter_used", { type: "sort", value: nextSort });
              }}
            >
              <option value="updated_desc">Recently updated</option>
              <option value="created_desc">Newest created</option>
              <option value="company_asc">Company A-Z</option>
            </Select>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant={activeStatus === null ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setQueryParam("status", null);
                void trackAnalyticsEvent("filter_used", {
                  type: "status",
                  value: "ALL",
                });
              }}
            >
              All
            </Button>
            {STATUSES.map((value) => (
              <Button
                key={value}
                variant={activeStatus === value ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setQueryParam("status", value);
                  void trackAnalyticsEvent("filter_used", {
                    type: "status",
                    value,
                  });
                }}
              >
                {value}
              </Button>
            ))}
          </div>
        </CardHeader>

        <Separator />

        <CardContent className="pt-5">
          {loading ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <div
                  key={index}
                  className="h-28 animate-pulse rounded-lg border border-slate-200 bg-slate-100"
                />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto pb-2">
              <div className="grid min-w-[980px] grid-cols-4 gap-4 xl:grid-cols-8">
                {STATUSES.map((value) => (
                  <section key={value} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="sticky top-0 mb-3 flex items-center justify-between gap-2 bg-slate-50 py-1">
                      <Badge variant={badgeVariantForStatus(value)}>{value}</Badge>
                      <span className="text-xs font-semibold text-slate-500">
                        {grouped[value].length}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {grouped[value].length === 0 ? (
                        <p className="rounded-md border border-dashed border-slate-300 px-2 py-3 text-center text-xs text-slate-500">
                          No cards
                        </p>
                      ) : null}

                      {grouped[value].map((item) => (
                        <article
                          key={item.id}
                          tabIndex={0}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              openEdit(item);
                            }
                          }}
                          className="rounded-lg border border-slate-200 bg-white p-3 outline-none transition-shadow hover:shadow-md focus-visible:ring-2 focus-visible:ring-emerald-500"
                        >
                          <p className="text-sm font-semibold text-slate-900">{item.company}</p>
                          <p className="mt-1 text-sm text-slate-600">{item.role}</p>
                          <p className="mt-2 text-xs text-slate-500">
                            Updated {new Date(item.updatedAt ?? item.createdAt).toLocaleDateString()}
                          </p>
                          <div className="mt-3 flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              aria-label={`Edit ${item.company} ${item.role}`}
                              onClick={() => openEdit(item)}
                            >
                              <Edit3 className="mr-1 h-3.5 w-3.5" /> Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="danger"
                              disabled={pendingDeleteId === item.id}
                              aria-label={`Delete ${item.company} ${item.role}`}
                              onClick={() => {
                                void runDelete(item);
                              }}
                            >
                              <Trash2 className="mr-1 h-3.5 w-3.5" />
                              {pendingDeleteId === item.id ? "Removing" : "Delete"}
                            </Button>
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-slate-600">Showing {visibleItems.length} applications</p>
            <Button
              variant="secondary"
              disabled={!nextCursor || loadingMore}
              onClick={() => {
                if (!nextCursor) return;
                void trackAnalyticsEvent("pagination_load_more");
                void loadApplications({ reset: false, cursor: nextCursor });
              }}
            >
              {loadingMore ? "Loading..." : nextCursor ? "Load more" : "No more"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={dialogMode !== null}
        onClose={() => {
          if (!saving) setDialogMode(null);
        }}
        title={dialogMode === "create" ? "Create Application" : "Edit Application"}
        description="Keep status and role current so your pipeline stays accurate."
      >
        <form
          className="grid gap-4"
          onSubmit={async (event) => {
            event.preventDefault();
            const normalizedCompany = company.trim();
            const normalizedRole = role.trim();

            if (!normalizedCompany || !normalizedRole) {
              toast.error("Company and role are required.");
              return;
            }

            setSaving(true);
            try {
              if (dialogMode === "create") {
                await runCreate();
              } else {
                await runUpdate();
              }
              setDialogMode(null);
            } finally {
              setSaving(false);
            }
          }}
        >
          <div className="grid gap-2">
            <Label htmlFor="company">Company</Label>
            <Input
              id="company"
              value={company}
              onChange={(event) => setCompany(event.target.value)}
              placeholder="Acme Inc."
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="role">Role</Label>
            <Input
              id="role"
              value={role}
              onChange={(event) => setRole(event.target.value)}
              placeholder="Frontend Engineer"
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="status">Status</Label>
            <Select
              id="status"
              value={status}
              onChange={(event) => setStatus(event.target.value as ApplicationStatus)}
            >
              {STATUSES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogMode(null)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving
                ? dialogMode === "create"
                  ? "Creating..."
                  : "Saving..."
                : dialogMode === "create"
                  ? "Create"
                  : "Save changes"}
            </Button>
          </div>
        </form>
      </Dialog>
    </section>
  );
}
