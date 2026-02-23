import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { userRepository } from "@/lib/repositories";

export async function GET() {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userCount = await userRepository.count();
  return NextResponse.json({ ok: true, userCount });
}
