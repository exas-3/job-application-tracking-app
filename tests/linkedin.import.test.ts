import assert from "node:assert/strict";
import test from "node:test";
import {
  mergeLinkedInImportFields,
  parseLinkedInHtml,
  parseLinkedInJobText,
} from "@/lib/linkedin/import";

test("parseLinkedInHtml extracts role/company/location from title pattern", () => {
  const html = `
    <html>
      <head>
        <title>Software Engineer - Thessaloniki, Central Macedonia, Greece - EY | LinkedIn</title>
      </head>
    </html>
  `;

  const fields = parseLinkedInHtml(
    html,
    "https://www.linkedin.com/jobs/view/123",
  );
  assert.equal(fields.role, "Software Engineer");
  assert.equal(fields.company, "EY");
  assert.equal(fields.location, "Thessaloniki, Central Macedonia, Greece");
  assert.equal(fields.jobUrl, "https://www.linkedin.com/jobs/view/123");
});

test("parseLinkedInJobText extracts labeled fields", () => {
  const text = `
    Role: Backend Engineer
    Company: Deloitte
    Location: Thessaloniki
  `;

  const fields = parseLinkedInJobText(text);
  assert.equal(fields.role, "Backend Engineer");
  assert.equal(fields.company, "Deloitte");
  assert.equal(fields.location, "Thessaloniki");
});

test("mergeLinkedInImportFields keeps warnings when required fields missing", () => {
  const merged = mergeLinkedInImportFields(
    { role: null, company: null, location: null, jobUrl: null },
    { role: null, company: null, location: null, jobUrl: null },
    "https://www.linkedin.com/jobs/view/456",
  );

  assert.equal(merged.jobUrl, "https://www.linkedin.com/jobs/view/456");
  assert.equal(merged.warnings.length >= 2, true);
});
