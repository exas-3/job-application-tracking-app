import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { applicationRepository } from "@/lib/repositories";
import { checkRateLimit, getRateLimitKey } from "@/lib/rateLimit";
import { createApplication, listApplications } from "./handlers";

export async function GET(req: Request) {
  const limited = checkRateLimit(getRateLimitKey("applications:get", req), {
    limit: 120,
    windowMs: 60_000,
  });
  if (limited) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  return listApplications(req, {
    getSession: getCurrentSession,
    repository: applicationRepository,
  });
}

export async function POST(req: Request) {
  const limited = checkRateLimit(getRateLimitKey("applications:post", req), {
    limit: 60,
    windowMs: 60_000,
  });
  if (limited) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }
  return createApplication(req, {
    getSession: getCurrentSession,
    repository: applicationRepository,
  });
}
