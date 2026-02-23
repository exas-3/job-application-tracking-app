import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { log } from "@/lib/logging";
import { reportError } from "@/lib/monitoring";
import { applicationRepository } from "@/lib/repositories";
import { updateApplicationSchema } from "@/lib/validation/application";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(req: Request, ctx: RouteContext) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
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
    const updated = await applicationRepository.updateByIdForUser(
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

export async function DELETE(_req: Request, ctx: RouteContext) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  try {
    const deleted = await applicationRepository.deleteByIdForUser(id, session.uid);
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
