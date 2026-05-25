CREATE SCHEMA IF NOT EXISTS "public";

CREATE TYPE "SeekingOption" AS ENUM (
  'LONG_TERM_PARTNERSHIP',
  'INTENTIONAL_DATING',
  'INCLUSIVE_COMMUNITY',
  'PREFER_TO_SHARE_LATER'
);

CREATE TYPE "EmailDeliveryStatus" AS ENUM (
  'PENDING',
  'SENT',
  'FAILED',
  'SKIPPED'
);

CREATE TABLE "waitlist_participants" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "full_name" VARCHAR(120) NOT NULL,
  "email" VARCHAR(254) NOT NULL,
  "seeking" "SeekingOption" NOT NULL,
  "confirmation_email_status" "EmailDeliveryStatus" NOT NULL DEFAULT 'PENDING',
  "confirmation_email_sent_at" TIMESTAMPTZ(6),
  "confirmation_email_failure" VARCHAR(512),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "waitlist_participants_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "waitlist_participants_email_key" ON "waitlist_participants"("email");
CREATE INDEX "waitlist_participants_created_at_idx" ON "waitlist_participants"("created_at");
