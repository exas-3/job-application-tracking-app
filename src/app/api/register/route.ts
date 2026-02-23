import { NextResponse } from "next/server";
import { firebaseAdminAuth } from "@/lib/firebase/admin";
import { log } from "@/lib/logging";
import { reportError } from "@/lib/monitoring";
import { checkRateLimit, getRateLimitKey } from "@/lib/rateLimit";
import { userRepository } from "@/lib/repositories";
import { registerBodySchema } from "@/lib/validation/auth";

type RouteError = {
  code: string | number | null;
  message: string;
};

function getErrorDetails(error: unknown): RouteError {
  const maybe = error as
    | { code?: string | number; message?: string }
    | undefined;
  return {
    code: maybe?.code ?? null,
    message: maybe?.message ?? "Unknown error",
  };
}

function mapRegistrationError(error: unknown): {
  status: number;
  message: string;
} {
  const { code } = getErrorDetails(error);

  if (code === "auth/email-already-exists") {
    return { status: 409, message: "Email already in use." };
  }

  if (code === "auth/invalid-email") {
    return { status: 400, message: "Invalid email address." };
  }

  if (code === "auth/invalid-password") {
    return {
      status: 400,
      message: "Password does not meet Firebase requirements.",
    };
  }

  if (code === "auth/too-many-requests") {
    return { status: 429, message: "Too many attempts. Try again later." };
  }

  if (code === "auth/configuration-not-found") {
    return { status: 503, message: "Authentication service not configured." };
  }

  if (code === 7 || code === "permission-denied") {
    return {
      status: 503,
      message: "Database service unavailable. Try again shortly.",
    };
  }

  return { status: 500, message: "Registration failed." };
}

export async function POST(req: Request) {
  const limited = checkRateLimit(getRateLimitKey("register", req), {
    limit: 20,
    windowMs: 60_000,
  });
  if (limited) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  let json: unknown;

  try {
    json = await req.json();
  } catch {
    log.warn("register.invalid_json");
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = registerBodySchema.safeParse(json);
  if (!parsed.success) {
    log.warn("register.validation_failed", {
      issue: parsed.error.issues[0]?.message ?? "unknown",
    });
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request payload" },
      { status: 400 },
    );
  }

  const { email, password, name } = parsed.data;
  const normalizedName = name ?? null;

  try {
    const authUser = await firebaseAdminAuth.createUser({
      email,
      password,
      displayName: normalizedName ?? undefined,
    });
    const user = await userRepository.create({
      id: authUser.uid,
      email,
      name: normalizedName,
    });

    log.info("register.success", { uid: user.id, email: user.email });
    return NextResponse.json(
      { user: { id: user.id, email: user.email, name: user.name } },
      { status: 201 },
    );
  } catch (error) {
    const mapped = mapRegistrationError(error);
    const details = getErrorDetails(error);
    reportError("register.failed", error, {
      email,
      status: mapped.status,
    });
    log.error("register.failed.mapped", {
      email,
      code: details.code,
      message: details.message,
      status: mapped.status,
    });
    return NextResponse.json({ error: mapped.message }, { status: mapped.status });
  }
}
