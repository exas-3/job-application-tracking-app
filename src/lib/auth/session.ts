import "server-only";
import { cookies } from "next/headers";
import { firebaseAdminAuth } from "@/lib/firebase/admin";

export const SESSION_COOKIE_NAME = "session";
const SESSION_EXPIRES_IN_MS = 1000 * 60 * 60 * 24 * 5;

export type AppSession = {
  uid: string;
  email: string | null;
  name: string | null;
};

export function getSessionCookieConfig() {
  return {
    name: SESSION_COOKIE_NAME,
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
      maxAge: SESSION_EXPIRES_IN_MS / 1000,
    },
    expiresIn: SESSION_EXPIRES_IN_MS,
  };
}

export async function getCurrentSession(): Promise<AppSession | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!cookie) return null;

  try {
    const decoded = await firebaseAdminAuth.verifySessionCookie(cookie, true);
    return {
      uid: decoded.uid,
      email: decoded.email ?? null,
      name: decoded.name ?? null,
    };
  } catch {
    return null;
  }
}
