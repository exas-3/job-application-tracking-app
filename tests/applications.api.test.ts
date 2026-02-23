import assert from "node:assert/strict";
import test from "node:test";
import {
  createApplication,
  deleteApplication,
  listApplications,
  updateApplication,
} from "@/app/api/applications/handlers";
import type {
  ApplicationEntity,
  ApplicationRepository,
  CreateApplicationInput,
  ListApplicationsOptions,
  ListApplicationsResult,
} from "@/lib/repositories/applicationRepository";

const now = new Date("2026-02-23T00:00:00.000Z");

function fakeApplication(
  overrides: Partial<ApplicationEntity> = {},
): ApplicationEntity {
  return {
    id: "app-1",
    userId: "user-1",
    company: "Acme",
    role: "Engineer",
    status: "SAVED",
    jobUrl: null,
    location: null,
    appliedAt: null,
    nextFollowUp: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function createRepositoryMock(): ApplicationRepository {
  return {
    async listByUserId(_userId: string, options?: ListApplicationsOptions) {
      const limit = options?.limit ?? 20;
      const items = [fakeApplication()].slice(0, limit);
      const result: ListApplicationsResult = {
        items,
        nextCursor: options?.cursor ? null : String(now.getTime()),
      };
      return result;
    },
    async create(input: CreateApplicationInput) {
      return fakeApplication({ userId: input.userId });
    },
    async updateByIdForUser(id, userId, input) {
      if (id === "missing") return null;
      return fakeApplication({ id, userId, ...input });
    },
    async deleteByIdForUser(id) {
      return id !== "missing";
    },
  };
}

test("applications GET returns 401 when unauthenticated", async () => {
  const res = await listApplications(new Request("http://localhost/api/applications"), {
    getSession: async () => null,
    repository: createRepositoryMock(),
  });

  assert.equal(res.status, 401);
});

test("applications GET rejects invalid query params", async () => {
  const res = await listApplications(
    new Request("http://localhost/api/applications?limit=9999"),
    {
      getSession: async () => ({ uid: "user-1", email: null, name: null }),
      repository: createRepositoryMock(),
    },
  );

  assert.equal(res.status, 400);
});

test("applications GET returns pageInfo with nextCursor", async () => {
  const res = await listApplications(
    new Request(
      "http://localhost/api/applications?status=SAVED&limit=1&cursor=1708646400000",
    ),
    {
      getSession: async () => ({ uid: "user-1", email: null, name: null }),
      repository: createRepositoryMock(),
    },
  );

  assert.equal(res.status, 200);
  const body = (await res.json()) as {
    applications: ApplicationEntity[];
    pageInfo: { nextCursor: string | null; limit: number };
  };
  assert.equal(body.applications.length, 1);
  assert.equal(body.pageInfo.limit, 1);
});

test("applications POST creates with authenticated user", async () => {
  const res = await createApplication(
    new Request("http://localhost/api/applications", {
      method: "POST",
      body: JSON.stringify({ company: "Acme", role: "SWE" }),
      headers: { "Content-Type": "application/json" },
    }),
    {
      getSession: async () => ({ uid: "user-1", email: null, name: null }),
      repository: createRepositoryMock(),
    },
  );

  assert.equal(res.status, 201);
  const body = (await res.json()) as { application: ApplicationEntity };
  assert.equal(body.application.userId, "user-1");
});

test("applications PATCH returns 404 when not found or not owned", async () => {
  const res = await updateApplication(
    new Request("http://localhost/api/applications/missing", {
      method: "PATCH",
      body: JSON.stringify({ status: "APPLIED" }),
      headers: { "Content-Type": "application/json" },
    }),
    "missing",
    {
      getSession: async () => ({ uid: "user-1", email: null, name: null }),
      repository: createRepositoryMock(),
    },
  );

  assert.equal(res.status, 404);
});

test("applications PATCH updates owned application", async () => {
  const res = await updateApplication(
    new Request("http://localhost/api/applications/app-1", {
      method: "PATCH",
      body: JSON.stringify({ status: "APPLIED" }),
      headers: { "Content-Type": "application/json" },
    }),
    "app-1",
    {
      getSession: async () => ({ uid: "user-1", email: null, name: null }),
      repository: createRepositoryMock(),
    },
  );

  assert.equal(res.status, 200);
  const body = (await res.json()) as { application: ApplicationEntity };
  assert.equal(body.application.status, "APPLIED");
});

test("applications DELETE returns 404 when not found or not owned", async () => {
  const res = await deleteApplication("missing", {
    getSession: async () => ({ uid: "user-1", email: null, name: null }),
    repository: createRepositoryMock(),
  });

  assert.equal(res.status, 404);
});

test("applications DELETE removes owned application", async () => {
  const res = await deleteApplication("app-1", {
    getSession: async () => ({ uid: "user-1", email: null, name: null }),
    repository: createRepositoryMock(),
  });

  assert.equal(res.status, 200);
  const body = (await res.json()) as { ok: boolean };
  assert.equal(body.ok, true);
});
