import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { firebaseAdminAuth } from "@/lib/firebase/admin";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { log } from "@/lib/logging";
import { reportError } from "@/lib/monitoring";

export async function POST() {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (cookie) {
    try {
      const decoded = await firebaseAdminAuth.verifySessionCookie(cookie, false);
      await firebaseAdminAuth.revokeRefreshTokens(decoded.uid);
      log.info("session.logout.revoked", { uid: decoded.uid });
    } catch (error) {
      const details = error as { code?: string | number; message?: string };
      reportError("session.logout.revoke_failed", error);
      log.warn("session.logout.revoke_failed", {
        code: details.code ?? null,
        message: details.message ?? "unknown",
      });
      // No action needed for invalid/expired cookie.
    }
  } else {
    log.info("session.logout.no_cookie");
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  log.info("session.logout.success");
  return res;
}
