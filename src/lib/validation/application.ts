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
