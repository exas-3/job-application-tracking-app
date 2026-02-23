export type LinkedInImportFields = {
  company: string | null;
  role: string | null;
  location: string | null;
  jobUrl: string | null;
  warnings: string[];
};

type PartialFields = Omit<LinkedInImportFields, "warnings">;

const EMPTY_FIELDS: PartialFields = {
  company: null,
  role: null,
  location: null,
  jobUrl: null,
};

function cleanText(value: string | null | undefined): string | null {
  if (!value) return null;
  const cleaned = value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.length > 0 ? cleaned : null;
}

function firstNonEmpty(...values: Array<string | null>): string | null {
  for (const value of values) {
    if (value) return value;
  }
  return null;
}

function extractMetaTag(html: string, key: string): string | null {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(
      `<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`,
      "i",
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${escaped}["'][^>]*>`,
      "i",
    ),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      return cleanText(match[1]);
    }
  }

  return null;
}

function extractTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!match?.[1]) return null;
  return cleanText(match[1]);
}

function stripLinkedInSuffix(value: string): string {
  return value.replace(/\s*\|\s*LinkedIn\s*$/i, "").trim();
}

function parseRoleAndCompanyFromTitle(
  title: string | null,
): Pick<PartialFields, "role" | "company" | "location"> {
  if (!title) {
    return { role: null, company: null, location: null };
  }

  const normalized = stripLinkedInSuffix(title);
  const directAt = normalized.match(/^(.+?)\s+at\s+(.+)$/i);
  if (directAt?.[1] && directAt?.[2]) {
    return {
      role: cleanText(directAt[1]),
      company: cleanText(directAt[2]),
      location: null,
    };
  }

  const hiring = normalized.match(/^(.+?)\s+is hiring\s+(.+)$/i);
  if (hiring?.[1] && hiring?.[2]) {
    return {
      role: cleanText(hiring[2]),
      company: cleanText(hiring[1]),
      location: null,
    };
  }

  const segments = normalized
    .split(" - ")
    .map((segment) => cleanText(segment))
    .filter((segment): segment is string => Boolean(segment));

  if (segments.length >= 2) {
    const role = segments[0] ?? null;
    const company = segments[segments.length - 1] ?? null;
    const location =
      segments.length >= 3
        ? cleanText(segments.slice(1, segments.length - 1).join(", "))
        : null;

    return { role, company, location };
  }

  return { role: cleanText(normalized), company: null, location: null };
}

function parseLocationFromText(text: string | null): string | null {
  if (!text) return null;

  const explicit = text.match(
    /\b(?:location|located in|based in)\b\s*[:\-]?\s*([^\n|.,;]{2,80})/i,
  );
  if (explicit?.[1]) {
    return cleanText(explicit[1]);
  }

  const remote = text.match(/\b(remote|hybrid|on-site|onsite)\b/i);
  if (remote?.[1]) {
    return cleanText(remote[1]);
  }

  const cityCountry = text.match(
    /\b([A-Z][A-Za-z.'-]+,\s*[A-Z][A-Za-z.'-]+(?:,\s*[A-Z][A-Za-z.'-]+)?)\b/,
  );
  if (cityCountry?.[1]) {
    return cleanText(cityCountry[1]);
  }

  return null;
}

function parseFromJobText(jobText: string | null): PartialFields {
  if (!jobText) return { ...EMPTY_FIELDS };

  const lines = jobText
    .split("\n")
    .map((line) => cleanText(line))
    .filter((line): line is string => Boolean(line));

  const companyByLabel = jobText.match(
    /\b(?:company|employer|organization)\b\s*[:\-]?\s*(.+)/i,
  );
  const roleByLabel = jobText.match(
    /\b(?:role|position|title)\b\s*[:\-]?\s*(.+)/i,
  );
  const atPattern = lines[0]?.match(/^(.+?)\s+at\s+(.+)$/i);

  const role = firstNonEmpty(
    cleanText(roleByLabel?.[1]),
    cleanText(atPattern?.[1]),
    lines[0] ?? null,
  );
  const company = firstNonEmpty(
    cleanText(companyByLabel?.[1]),
    cleanText(atPattern?.[2]),
    lines[1] ?? null,
  );
  const location = parseLocationFromText(jobText);

  return {
    role,
    company,
    location,
    jobUrl: null,
  };
}

export function parseLinkedInHtml(html: string, sourceUrl: string): PartialFields {
  const ogTitle = extractMetaTag(html, "og:title");
  const title = firstNonEmpty(ogTitle, extractTitle(html));
  const titleFields = parseRoleAndCompanyFromTitle(title);
  const description = firstNonEmpty(
    extractMetaTag(html, "og:description"),
    extractMetaTag(html, "description"),
  );

  return {
    role: titleFields.role,
    company: titleFields.company,
    location: firstNonEmpty(titleFields.location, parseLocationFromText(description)),
    jobUrl: sourceUrl,
  };
}

export function mergeLinkedInImportFields(
  fromHtml: PartialFields,
  fromJobText: PartialFields,
  sourceUrl: string,
): LinkedInImportFields {
  const fields: LinkedInImportFields = {
    company: firstNonEmpty(fromHtml.company, fromJobText.company),
    role: firstNonEmpty(fromHtml.role, fromJobText.role),
    location: firstNonEmpty(fromHtml.location, fromJobText.location),
    jobUrl: firstNonEmpty(fromHtml.jobUrl, sourceUrl),
    warnings: [],
  };

  if (!fields.company) {
    fields.warnings.push(
      "Company could not be detected reliably. Please fill it manually.",
    );
  }
  if (!fields.role) {
    fields.warnings.push(
      "Role could not be detected reliably. Please fill it manually.",
    );
  }

  return fields;
}

export function parseLinkedInJobText(jobText: string | null): PartialFields {
  return parseFromJobText(jobText);
}
