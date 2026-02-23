import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import {
  mergeLinkedInImportFields,
  parseLinkedInHtml,
  parseLinkedInJobText,
} from "@/lib/linkedin/import";
import { log } from "@/lib/logging";
import { reportError } from "@/lib/monitoring";
import { checkRateLimit, getRateLimitKey } from "@/lib/rateLimit";
import { importLinkedInSchema } from "@/lib/validation/application";

export async function POST(req: Request) {
  const limited = checkRateLimit(getRateLimitKey("applications:import", req), {
    limit: 20,
    windowMs: 60_000,
  });
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

  const parsed = importLinkedInSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request payload." },
      { status: 400 },
    );
  }

  const { linkedinUrl, jobText } = parsed.data;
  let html = "";

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetch(linkedinUrl, {
      headers: {
        "user-agent":
          "Mozilla/5.0 (compatible; JobTrackerImportBot/1.0; +https://job-application-tracking-app.vercel.app/)",
        accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      redirect: "follow",
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) {
      log.warn("applications.import.linkedin_fetch_not_ok", {
        uid: session.uid,
        status: response.status,
      });
    } else {
      html = await response.text();
    }
  } catch (error) {
    reportError("applications.import.linkedin_fetch_failed", error, {
      uid: session.uid,
    });
  } finally {
    clearTimeout(timeout);
  }

  const fromHtml = html ? parseLinkedInHtml(html, linkedinUrl) : parseLinkedInHtml("", linkedinUrl);
  const fromJobText = parseLinkedInJobText(jobText ?? null);
  const fields = mergeLinkedInImportFields(fromHtml, fromJobText, linkedinUrl);

  if (!fields.company && !fields.role) {
    return NextResponse.json(
      {
        error:
          "Could not extract company/role from this URL. Paste job text and try again.",
      },
      { status: 422 },
    );
  }

  log.info("applications.import.success", {
    uid: session.uid,
    hasCompany: Boolean(fields.company),
    hasRole: Boolean(fields.role),
    hasLocation: Boolean(fields.location),
  });

  return NextResponse.json({ fields });
}
