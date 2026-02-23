import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { log } from "@/lib/logging";
import { reportError } from "@/lib/monitoring";
import { userRepository } from "@/lib/repositories";

export async function GET() {
  const session = await getCurrentSession();
  if (!session) {
    log.info("health.unauthorized");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const userCount = await userRepository.count();
    log.info("health.ok", { uid: session.uid, userCount });
    return NextResponse.json({ ok: true, userCount });
  } catch (error) {
    const details = error as { code?: string | number; message?: string };
    reportError("health.failed", error, { uid: session.uid });
    log.error("health.failed", {
      uid: session.uid,
      code: details.code ?? null,
      message: details.message ?? "unknown",
    });
    return NextResponse.json({ error: "Health check failed." }, { status: 500 });
  }
}
