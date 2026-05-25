import { z } from "zod";

const optionalTrimmedString = z.preprocess(
  value => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().min(1).optional(),
);

const optionalEmail = z.preprocess(
  value => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().email().optional(),
);

const booleanFromEnv = z.preprocess(value => {
  if (value === undefined || value === "") {
    return undefined;
  }

  if (typeof value === "boolean") {
    return value;
  }

  const normalized = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }

  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }

  return value;
}, z.boolean());

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  DATABASE_URL: z.string().trim().min(1, "DATABASE_URL is required."),
  CORS_ORIGIN: z.string().trim().default("http://localhost:3000,http://localhost:5173,http://localhost:3001"),
  TRUST_PROXY: booleanFromEnv.default(false),

  ADMIN_API_TOKEN: optionalTrimmedString,
  ADMIN_USER_ID: optionalTrimmedString,
  ADMIN_NAME: optionalTrimmedString,
  ADMIN_EMAIL: optionalEmail,

  SMTP_HOST: optionalTrimmedString,
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).optional(),
  SMTP_SECURE: booleanFromEnv.optional(),
  SMTP_USER: optionalTrimmedString,
  SMTP_PASS: optionalTrimmedString,
  EMAIL_FROM: optionalTrimmedString,

  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(1000).default(15 * 60 * 1000),
  WAITLIST_RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(5),
  ADMIN_RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(120),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  const details = parsedEnv.error.issues.map(issue => `${issue.path.join(".")}: ${issue.message}`).join("\n");
  throw new Error(`Invalid server configuration:\n${details}`);
}

const env = parsedEnv.data;
const isProduction = env.NODE_ENV === "production";
const hasPartialSmtpConfig = Boolean(env.SMTP_HOST || env.SMTP_PORT || env.SMTP_USER || env.SMTP_PASS || env.EMAIL_FROM);
const emailDeliveryEnabled = isProduction || hasPartialSmtpConfig;

const configurationErrors: string[] = [];

if (isProduction) {
  if (!env.ADMIN_API_TOKEN || env.ADMIN_API_TOKEN.length < 32) {
    configurationErrors.push("ADMIN_API_TOKEN must be at least 32 characters in production.");
  }

  if (!env.ADMIN_USER_ID || !env.ADMIN_NAME || !env.ADMIN_EMAIL) {
    configurationErrors.push("ADMIN_USER_ID, ADMIN_NAME, and ADMIN_EMAIL are required in production.");
  }
}

if (emailDeliveryEnabled) {
  if (!env.SMTP_HOST) {
    configurationErrors.push("SMTP_HOST is required when email delivery is enabled.");
  }

  if (!env.EMAIL_FROM) {
    configurationErrors.push("EMAIL_FROM is required when email delivery is enabled.");
  }

  if (Boolean(env.SMTP_USER) !== Boolean(env.SMTP_PASS)) {
    configurationErrors.push("SMTP_USER and SMTP_PASS must be configured together.");
  }
}

if (configurationErrors.length > 0) {
  throw new Error(`Invalid server configuration:\n${configurationErrors.join("\n")}`);
}

function parseCorsOrigins(value: string) {
  return value
    .split(",")
    .map(origin => origin.trim())
    .filter(Boolean);
}

export const config = {
  nodeEnv: env.NODE_ENV,
  port: env.PORT,
  databaseUrl: env.DATABASE_URL,
  corsOrigins: parseCorsOrigins(env.CORS_ORIGIN),
  trustProxy: env.TRUST_PROXY,
  admin:
    env.ADMIN_API_TOKEN && env.ADMIN_USER_ID && env.ADMIN_NAME && env.ADMIN_EMAIL
      ? {
          token: env.ADMIN_API_TOKEN,
          user: {
            id: env.ADMIN_USER_ID,
            name: env.ADMIN_NAME,
            email: env.ADMIN_EMAIL,
          },
        }
      : null,
  email: emailDeliveryEnabled
    ? {
        enabled: true as const,
        smtp: {
          host: env.SMTP_HOST!,
          port: env.SMTP_PORT ?? 587,
          secure: env.SMTP_SECURE ?? env.SMTP_PORT === 465,
          user: env.SMTP_USER,
          pass: env.SMTP_PASS,
        },
        from: env.EMAIL_FROM!,
      }
    : {
        enabled: false as const,
      },
  rateLimit: {
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    waitlistMax: env.WAITLIST_RATE_LIMIT_MAX,
    adminMax: env.ADMIN_RATE_LIMIT_MAX,
  },
};

export type AppConfig = typeof config;
