import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

type RegisterBody = {
  email: string;
  password: string;
  name?: string;
};

function isRegisterBody(value: unknown): value is RegisterBody {
  if (typeof value !== "object" || value === null) return false;

  const v = value as Record<string, unknown>;

  return (
    typeof v.email === "string" &&
    typeof v.password === "string" &&
    (typeof v.name === "string" || v.name === undefined)
  );
}

export async function POST(req: Request) {
  let json: unknown;

  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!isRegisterBody(json)) {
    return NextResponse.json(
      { error: "Invalid request payload" },
      { status: 400 },
    );
  }

  const email = json.email.toLowerCase().trim();
  const password = json.password;
  const name = json.name?.trim() || null;

  if (!email || password.length < 8) {
    return NextResponse.json(
      {
        error: "Email is required and password must be at least 8 characters.",
      },
      { status: 400 },
    );
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "Email already in use." },
      { status: 409 },
    );
  }

  const hash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: { email, password: hash, name },
    select: { id: true, email: true, name: true },
  });

  return NextResponse.json({ user }, { status: 201 });
}
