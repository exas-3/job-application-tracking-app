import { NextResponse } from "next/server";
import { z } from "zod";
import { firebaseAdminAuth } from "@/lib/firebase/admin";
import { getSessionCookieConfig } from "@/lib/auth/session";
import { log } from "@/lib/logging";
import { reportError } from "@/lib/monitoring";

const loginSchema = z.object({
  idToken: z.string().min(1, "ID token is required."),
});

export async function POST(req: Request) {
  let json: unknown;

  try {
    json = await req.json();
  } catch {
    log.warn("session.login.invalid_json");
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = loginSchema.safeParse(json);
  if (!parsed.success) {
    log.warn("session.login.validation_failed", {
      issue: parsed.error.issues[0]?.message ?? "unknown",
    });
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request payload" },
      { status: 400 },
    );
  }

  try {
    const { expiresIn, name, options } = getSessionCookieConfig();
    const sessionCookie = await firebaseAdminAuth.createSessionCookie(
      parsed.data.idToken,
      { expiresIn },
    );

    const res = NextResponse.json({ ok: true });
    res.cookies.set(name, sessionCookie, options);
    log.info("session.login.success");
    return res;
  } catch (error) {
    const details = error as { code?: string | number; message?: string };
    reportError("session.login.failed", error);
    log.warn("session.login.failed", {
      code: details.code ?? null,
      message: details.message ?? "unknown",
    });
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }
}
