import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
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

  const existing = await userRepository.findByEmail(email);
  if (existing) {
    return NextResponse.json(
      { error: "Email already in use." },
      { status: 409 },
    );
  }

  const hash = await bcrypt.hash(password, 10);

  const user = await userRepository.create({
    email,
    password: hash,
    name: normalizedName,
  });

  return NextResponse.json(
    { user: { id: user.id, email: user.email, name: user.name } },
    { status: 201 },
  );
}
