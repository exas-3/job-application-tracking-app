import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { applicationRepository } from "@/lib/repositories";
import { checkRateLimit, getRateLimitKey } from "@/lib/rateLimit";
import { deleteApplication, updateApplication } from "../handlers";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(req: Request, ctx: RouteContext) {
  const limited = checkRateLimit(getRateLimitKey("applications:patch", req), {
    limit: 90,
    windowMs: 60_000,
  });
  if (limited) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }
  const { id } = await ctx.params;
  return updateApplication(req, id, {
    getSession: getCurrentSession,
    repository: applicationRepository,
  });
}

export async function DELETE(req: Request, ctx: RouteContext) {
  const limited = checkRateLimit(getRateLimitKey("applications:delete", req), {
    limit: 60,
    windowMs: 60_000,
  });
  if (limited) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }
  const { id } = await ctx.params;
  return deleteApplication(id, {
    getSession: getCurrentSession,
    repository: applicationRepository,
  });
}
