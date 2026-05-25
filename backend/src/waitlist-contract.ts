import { z } from "zod";

export const seekingOptions = [
  {
    value: "LONG_TERM_PARTNERSHIP",
    label: "A long-term partnership",
  },
  {
    value: "INTENTIONAL_DATING",
    label: "Intentional dating",
  },
  {
    value: "INCLUSIVE_COMMUNITY",
    label: "Inclusive community",
  },
  {
    value: "PREFER_TO_SHARE_LATER",
    label: "Prefer to share later",
  },
] as const;

export const seekingOptionValues = seekingOptions.map(option => option.value) as [
  (typeof seekingOptions)[number]["value"],
  ...(typeof seekingOptions)[number]["value"][],
];

export const seekingOptionLabels = new Map(seekingOptions.map(option => [option.value, option.label]));

export const waitlistSubmissionSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Enter your full name.")
    .max(120, "Full name must be 120 characters or fewer.")
    .transform(value => value.replace(/\s+/g, " ")),
  email: z
    .string()
    .trim()
    .email("Enter a valid email address.")
    .max(254, "Email address must be 254 characters or fewer.")
    .transform(value => value.toLowerCase()),
  seeking: z.enum(seekingOptionValues, {
    error: "Select what you are seeking.",
  }),
});

export const adminParticipantsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

export type WaitlistSubmission = z.infer<typeof waitlistSubmissionSchema>;
export type AdminParticipantsQuery = z.infer<typeof adminParticipantsQuerySchema>;
