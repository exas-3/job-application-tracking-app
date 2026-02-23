import assert from "node:assert/strict";
import test from "node:test";
import { credentialsSchema, registerBodySchema } from "@/lib/validation/auth";

test("register schema accepts valid payload and normalizes email", () => {
  const parsed = registerBodySchema.safeParse({
    email: "  USER@Example.com ",
    password: "strongpass123",
    name: "  Alice  ",
  });

  assert.equal(parsed.success, true);
  if (!parsed.success) return;

  assert.equal(parsed.data.email, "user@example.com");
  assert.equal(parsed.data.name, "Alice");
});

test("register schema rejects short password", () => {
  const parsed = registerBodySchema.safeParse({
    email: "user@example.com",
    password: "short",
  });

  assert.equal(parsed.success, false);
});

test("credentials schema rejects invalid email", () => {
  const parsed = credentialsSchema.safeParse({
    email: "not-an-email",
    password: "password123",
  });

  assert.equal(parsed.success, false);
});

test("credentials schema accepts valid credentials and normalizes email", () => {
  const parsed = credentialsSchema.safeParse({
    email: "  USER@Example.com ",
    password: "password123",
  });

  assert.equal(parsed.success, true);
  if (!parsed.success) return;

  assert.equal(parsed.data.email, "user@example.com");
});

