import { NextResponse } from "next/server";
import { z } from "zod";
import { firebaseAdminAuth } from "@/lib/firebase/admin";
import { getSessionCookieConfig } from "@/lib/auth/session";

const loginSchema = z.object({
  idToken: z.string().min(1, "ID token is required."),
});

export async function POST(req: Request) {
  let json: unknown;

  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = loginSchema.safeParse(json);
  if (!parsed.success) {
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
    return res;
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }
}
