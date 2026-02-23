import { NextResponse } from "next/server";
import type { AppSession } from "@/lib/auth/session";
import { log } from "@/lib/logging";
import { reportError } from "@/lib/monitoring";
import type { ApplicationRepository } from "@/lib/repositories/applicationRepository";
import {
  createApplicationSchema,
  updateApplicationSchema,
} from "@/lib/validation/application";

type SessionGetter = () => Promise<AppSession | null>;

type Dependencies = {
  getSession: SessionGetter;
  repository: ApplicationRepository;
};

export async function listApplications(deps: Dependencies) {
  const session = await deps.getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const items = await deps.repository.listByUserId(session.uid);
    return NextResponse.json({ applications: items });
  } catch (error) {
    reportError("applications.list_failed", error, { uid: session.uid });
    return NextResponse.json(
      { error: "Failed to load applications." },
      { status: 500 },
    );
  }
}

export async function createApplication(req: Request, deps: Dependencies) {
  const session = await deps.getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createApplicationSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request payload" },
      { status: 400 },
    );
  }

  try {
    const created = await deps.repository.create({
      userId: session.uid,
      ...parsed.data,
    });
    log.info("applications.create.success", { uid: session.uid, id: created.id });
    return NextResponse.json({ application: created }, { status: 201 });
  } catch (error) {
    reportError("applications.create_failed", error, { uid: session.uid });
    return NextResponse.json(
      { error: "Failed to create application." },
      { status: 500 },
    );
  }
}

export async function updateApplication(
  req: Request,
  id: string,
  deps: Dependencies,
) {
  const session = await deps.getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = updateApplicationSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request payload" },
      { status: 400 },
    );
  }

  try {
    const updated = await deps.repository.updateByIdForUser(
      id,
      session.uid,
      parsed.data,
    );

    if (!updated) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    log.info("applications.update.success", { uid: session.uid, id });
    return NextResponse.json({ application: updated });
  } catch (error) {
    reportError("applications.update_failed", error, { uid: session.uid, id });
    return NextResponse.json(
      { error: "Failed to update application." },
      { status: 500 },
    );
  }
}

export async function deleteApplication(id: string, deps: Dependencies) {
  const session = await deps.getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const deleted = await deps.repository.deleteByIdForUser(id, session.uid);
    if (!deleted) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    log.info("applications.delete.success", { uid: session.uid, id });
    return NextResponse.json({ ok: true });
  } catch (error) {
    reportError("applications.delete_failed", error, { uid: session.uid, id });
    return NextResponse.json(
      { error: "Failed to delete application." },
      { status: 500 },
    );
  }
}
