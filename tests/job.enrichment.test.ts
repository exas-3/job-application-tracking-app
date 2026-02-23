import assert from "node:assert/strict";
import test from "node:test";
import { heuristicJobEnrichment } from "@/lib/ai/jobEnrichment";

test("heuristicJobEnrichment extracts core fields from labeled text", () => {
  const result = heuristicJobEnrichment(`
    Role: Frontend Engineer
    Company: Example Corp
    Location: Thessaloniki
    Employment type: Full-time
    Seniority: Junior
    Tech: React, TypeScript, Next.js
  `);

  assert.equal(result.role, "Frontend Engineer");
  assert.equal(result.company, "Example Corp");
  assert.equal(result.location, "Thessaloniki");
  assert.equal(result.employmentType, "FULL_TIME");
  assert.equal(result.seniority, "JUNIOR");
  assert.equal(result.skills.includes("React"), true);
});

test("heuristicJobEnrichment infers remote and internship flags", () => {
  const result = heuristicJobEnrichment(`
    Software Engineering Internship
    Work mode: Remote
  `);

  assert.equal(result.seniority, "INTERN");
  assert.equal(result.employmentType, "INTERNSHIP");
  assert.equal(result.remoteType, "REMOTE");
});
