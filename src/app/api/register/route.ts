import { NextResponse } from "next/server";
import { firebaseAdminAuth } from "@/lib/firebase/admin";
import { userRepository } from "@/lib/repositories";
import { registerBodySchema } from "@/lib/validation/auth";

export async function POST(req: Request) {
  let json: unknown;

  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = registerBodySchema.safeParse(json);
  if (!parsed.success) {
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

    return NextResponse.json(
      { user: { id: user.id, email: user.email, name: user.name } },
      { status: 201 },
    );
  } catch (error) {
    const code =
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      typeof error.code === "string"
        ? error.code
        : null;

    if (code === "auth/email-already-exists") {
      return NextResponse.json(
        { error: "Email already in use." },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { error: "Registration failed." },
      { status: 500 },
    );
  }
}
