import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { enrichJobText } from "@/lib/ai/jobEnrichment";
import { log } from "@/lib/logging";
import { checkRateLimit, getRateLimitKey } from "@/lib/rateLimit";
import { importEnrichSchema } from "@/lib/validation/application";

export async function POST(req: Request) {
  const limited = checkRateLimit(
    getRateLimitKey("applications:import:enrich", req),
    {
      limit: 12,
      windowMs: 60_000,
    },
  );
  if (limited) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = importEnrichSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request payload." },
      { status: 400 },
    );
  }

  const { jobText, linkedinUrl } = parsed.data;
  const result = await enrichJobText(jobText, linkedinUrl);

  log.info("applications.import.enrich.success", {
    uid: session.uid,
    source: result.source,
    hasCompany: Boolean(result.fields.company),
    hasRole: Boolean(result.fields.role),
    skills: result.fields.skills.length,
  });

  return NextResponse.json(result);
}
