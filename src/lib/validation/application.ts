import { z } from "zod";

const statusSchema = z.enum([
  "SAVED",
  "APPLIED",
  "HR",
  "TECH",
  "ONSITE",
  "OFFER",
  "REJECTED",
  "WITHDRAWN",
]);

const optionalDate = z
  .union([z.string().datetime({ offset: true }), z.null()])
  .optional()
  .transform((value) => (value ? new Date(value) : null));

export const createApplicationSchema = z.object({
  company: z.string().trim().min(1, "Company is required.").max(120),
  role: z.string().trim().min(1, "Role is required.").max(120),
  status: statusSchema.optional(),
  jobUrl: z.string().trim().url("Invalid job URL.").optional().nullable(),
  location: z.string().trim().max(120).optional().nullable(),
  appliedAt: optionalDate,
  nextFollowUp: optionalDate,
});

export const updateApplicationSchema = z
  .object({
    company: z.string().trim().min(1).max(120).optional(),
    role: z.string().trim().min(1).max(120).optional(),
    status: statusSchema.optional(),
    jobUrl: z.string().trim().url("Invalid job URL.").optional().nullable(),
    location: z.string().trim().max(120).optional().nullable(),
    appliedAt: optionalDate,
    nextFollowUp: optionalDate,
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required.",
  });

export const listApplicationsQuerySchema = z.object({
  status: statusSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  cursor: z
    .string()
    .regex(/^\d+$/, "Invalid cursor.")
    .optional(),
});

export const importLinkedInSchema = z.object({
  linkedinUrl: z
    .string()
    .trim()
    .url("LinkedIn URL is invalid.")
    .refine((value) => {
      try {
        const url = new URL(value);
        return url.hostname.endsWith("linkedin.com");
      } catch {
        return false;
      }
    }, "Only linkedin.com URLs are supported."),
  jobText: z.string().trim().max(12000).optional(),
});

export const importEnrichSchema = z.object({
  linkedinUrl: z
    .string()
    .trim()
    .url("LinkedIn URL is invalid.")
    .refine((value) => {
      try {
        const url = new URL(value);
        return url.hostname.endsWith("linkedin.com");
      } catch {
        return false;
      }
    }, "Only linkedin.com URLs are supported.")
    .optional(),
  jobText: z
    .string()
    .trim()
    .min(20, "Job text is too short for enrichment.")
    .max(12000),
});
