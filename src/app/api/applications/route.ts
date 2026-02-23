import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { log } from "@/lib/logging";
import { reportError } from "@/lib/monitoring";
import { applicationRepository } from "@/lib/repositories";
import { createApplicationSchema } from "@/lib/validation/application";

export async function GET() {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const items = await applicationRepository.listByUserId(session.uid);
    return NextResponse.json({ applications: items });
  } catch (error) {
    reportError("applications.list_failed", error, { uid: session.uid });
    return NextResponse.json(
      { error: "Failed to load applications." },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  const session = await getCurrentSession();
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
    const created = await applicationRepository.create({
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
