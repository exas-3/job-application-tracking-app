import { z } from "zod";

const enrichmentSchema = z.object({
  company: z.string().trim().min(1).max(120).nullable(),
  role: z.string().trim().min(1).max(120).nullable(),
  location: z.string().trim().min(1).max(120).nullable(),
  employmentType: z
    .enum(["FULL_TIME", "PART_TIME", "CONTRACT", "INTERNSHIP", "OTHER"])
    .nullable(),
  seniority: z
    .enum(["INTERN", "JUNIOR", "MID", "SENIOR", "LEAD", "UNKNOWN"])
    .nullable(),
  remoteType: z.enum(["REMOTE", "HYBRID", "ONSITE", "UNKNOWN"]).nullable(),
  salaryMin: z.number().int().positive().nullable(),
  salaryMax: z.number().int().positive().nullable(),
  currency: z
    .string()
    .trim()
    .regex(/^[A-Z]{3}$/)
    .nullable(),
  skills: z.array(z.string().trim().min(1).max(40)).max(12),
});

export type JobEnrichment = z.infer<typeof enrichmentSchema>;

type EnrichResult = {
  fields: JobEnrichment;
  source: "ai" | "heuristic";
  warnings: string[];
};

function clean(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > 0 ? normalized : null;
}

function firstMatch(text: string, patterns: RegExp[]): string | null {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const parsed = clean(match[1]);
      if (parsed) return parsed;
    }
  }
  return null;
}

export function heuristicJobEnrichment(jobText: string): JobEnrichment {
  const normalized = jobText.trim();
  const lines = normalized
    .split("\n")
    .map((line) => clean(line))
    .filter((line): line is string => Boolean(line));

  const role = firstMatch(normalized, [
    /\b(?:role|position|title)\b\s*[:\-]?\s*(.+)/i,
  ]) ?? (lines[0] ?? null);

  const company = firstMatch(normalized, [
    /\b(?:company|employer|organization)\b\s*[:\-]?\s*(.+)/i,
  ]) ?? null;

  const location = firstMatch(normalized, [
    /\b(?:location|based in|located in)\b\s*[:\-]?\s*(.+)/i,
  ]) ?? (/\bremote\b/i.test(normalized) ? "Remote" : null);

  const remoteType = /\bhybrid\b/i.test(normalized)
    ? "HYBRID"
    : /\bremote\b/i.test(normalized)
      ? "REMOTE"
      : /\b(?:on-site|onsite)\b/i.test(normalized)
        ? "ONSITE"
        : "UNKNOWN";

  const employmentType = /\bintern(ship)?\b/i.test(normalized)
    ? "INTERNSHIP"
    : /\bcontract\b/i.test(normalized)
      ? "CONTRACT"
      : /\bpart[- ]?time\b/i.test(normalized)
        ? "PART_TIME"
        : /\bfull[- ]?time\b/i.test(normalized)
          ? "FULL_TIME"
          : "OTHER";

  const seniority = /\bintern(ship)?\b/i.test(normalized)
    ? "INTERN"
    : /\bjunior\b/i.test(normalized)
      ? "JUNIOR"
      : /\bmid\b/i.test(normalized)
        ? "MID"
        : /\bsenior\b/i.test(normalized)
          ? "SENIOR"
          : /\blead\b/i.test(normalized)
            ? "LEAD"
            : "UNKNOWN";

  const salaryMatch = normalized.match(
    /(\b[A-Z]{3}\b|\$|€|£)?\s?(\d{2,3})(?:[.,](\d{3}))?\s*[-–]\s*(\d{2,3})(?:[.,](\d{3}))?/,
  );
  let salaryMin: number | null = null;
  let salaryMax: number | null = null;
  let currency: string | null = null;

  if (salaryMatch) {
    const minMajor = Number(salaryMatch[2]);
    const minMinor = salaryMatch[3] ? Number(salaryMatch[3]) : 0;
    const maxMajor = Number(salaryMatch[4]);
    const maxMinor = salaryMatch[5] ? Number(salaryMatch[5]) : 0;
    salaryMin = minMinor > 0 ? minMajor * 1000 + minMinor : minMajor;
    salaryMax = maxMinor > 0 ? maxMajor * 1000 + maxMinor : maxMajor;

    const symbol = salaryMatch[1] ?? null;
    currency =
      symbol === "$"
        ? "USD"
        : symbol === "€"
          ? "EUR"
          : symbol === "£"
            ? "GBP"
            : symbol ?? null;
  }

  const skillMatches = normalized.match(
    /\b(?:TypeScript|JavaScript|React|Next\.js|Node\.js|Python|Java|C#|SQL|AWS|GCP|Azure|Docker|Kubernetes)\b/gi,
  );
  const skills = Array.from(
    new Set((skillMatches ?? []).map((skill) => clean(skill)).filter(Boolean)),
  ).slice(0, 12) as string[];

  return {
    company,
    role,
    location,
    employmentType,
    seniority,
    remoteType,
    salaryMin,
    salaryMax,
    currency,
    skills,
  };
}

function mergeWithHeuristic(
  aiResult: JobEnrichment,
  heuristic: JobEnrichment,
): JobEnrichment {
  return {
    company: aiResult.company ?? heuristic.company,
    role: aiResult.role ?? heuristic.role,
    location: aiResult.location ?? heuristic.location,
    employmentType: aiResult.employmentType ?? heuristic.employmentType,
    seniority: aiResult.seniority ?? heuristic.seniority,
    remoteType: aiResult.remoteType ?? heuristic.remoteType,
    salaryMin: aiResult.salaryMin ?? heuristic.salaryMin,
    salaryMax: aiResult.salaryMax ?? heuristic.salaryMax,
    currency: aiResult.currency ?? heuristic.currency,
    skills: aiResult.skills.length > 0 ? aiResult.skills : heuristic.skills,
  };
}

function extractOutputText(payload: unknown): string | null {
  const root = payload as {
    output_text?: unknown;
    output?: Array<{ content?: Array<{ text?: string }> }>;
  };

  if (typeof root.output_text === "string" && root.output_text.trim().length > 0) {
    return root.output_text;
  }

  const text = root.output
    ?.flatMap((item) => item.content ?? [])
    .map((part) => part.text)
    .find((value): value is string => Boolean(value && value.trim().length > 0));

  return text ?? null;
}

export async function enrichJobText(
  jobText: string,
  linkedinUrl?: string,
): Promise<EnrichResult> {
  const heuristic = heuristicJobEnrichment(jobText);
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return {
      fields: heuristic,
      source: "heuristic",
      warnings: ["AI enrichment is not configured. Using heuristic extraction."],
    };
  }

  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
  const schemaJson = {
    type: "object",
    additionalProperties: false,
    properties: {
      company: { type: ["string", "null"], maxLength: 120 },
      role: { type: ["string", "null"], maxLength: 120 },
      location: { type: ["string", "null"], maxLength: 120 },
      employmentType: {
        type: ["string", "null"],
        enum: ["FULL_TIME", "PART_TIME", "CONTRACT", "INTERNSHIP", "OTHER", null],
      },
      seniority: {
        type: ["string", "null"],
        enum: ["INTERN", "JUNIOR", "MID", "SENIOR", "LEAD", "UNKNOWN", null],
      },
      remoteType: {
        type: ["string", "null"],
        enum: ["REMOTE", "HYBRID", "ONSITE", "UNKNOWN", null],
      },
      salaryMin: { type: ["number", "null"] },
      salaryMax: { type: ["number", "null"] },
      currency: {
        type: ["string", "null"],
        pattern: "^[A-Z]{3}$",
      },
      skills: {
        type: "array",
        maxItems: 12,
        items: { type: "string", maxLength: 40 },
      },
    },
    required: [
      "company",
      "role",
      "location",
      "employmentType",
      "seniority",
      "remoteType",
      "salaryMin",
      "salaryMax",
      "currency",
      "skills",
    ],
  };

  const inputText = [
    linkedinUrl ? `LinkedIn URL: ${linkedinUrl}` : null,
    "Job description:",
    jobText,
  ]
    .filter(Boolean)
    .join("\n\n")
    .slice(0, 12000);

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        input: [
          {
            role: "system",
            content: [
              {
                type: "input_text",
                text:
                  "Extract structured job fields from text. Return only JSON per schema. Leave unknown fields as null or UNKNOWN.",
              },
            ],
          },
          {
            role: "user",
            content: [{ type: "input_text", text: inputText }],
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "job_enrichment",
            strict: true,
            schema: schemaJson,
          },
        },
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        fields: heuristic,
        source: "heuristic",
        warnings: [
          `AI enrichment request failed (${response.status}). Using heuristic extraction.`,
          errorText.slice(0, 180),
        ],
      };
    }

    const payload = await response.json();
    const outputText = extractOutputText(payload);
    if (!outputText) {
      return {
        fields: heuristic,
        source: "heuristic",
        warnings: ["AI returned empty output. Using heuristic extraction."],
      };
    }

    const raw = JSON.parse(outputText) as unknown;
    const aiResult = enrichmentSchema.parse(raw);
    return {
      fields: mergeWithHeuristic(aiResult, heuristic),
      source: "ai",
      warnings: [],
    };
  } catch {
    return {
      fields: heuristic,
      source: "heuristic",
      warnings: ["AI enrichment failed. Using heuristic extraction."],
    };
  }
}
