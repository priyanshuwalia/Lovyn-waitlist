# Lovyn Waitlist Backend

Express API for Lovyn waitlist submissions, confirmation email delivery, and admin participant access.

## Setup

```bash
bun install
cp .env.example .env
bun run prisma:generate
bun --bunx prisma migrate deploy
```

Set the real values in `.env` before running the server. In production, `ADMIN_API_TOKEN`, `ADMIN_USER_ID`, `ADMIN_NAME`, `ADMIN_EMAIL`, `BREVO_API_KEY`, and `BREVO_SENDER_EMAIL` are required.

Brevo transactional email delivery uses `POST https://api.brevo.com/v3/smtp/email`. In development, leave the Brevo variables empty to store signups while marking confirmation email delivery as skipped.

## Run

```bash
bun run dev
```

The API listens on `http://localhost:4000` by default.

## Routes

- `GET /health`
- `POST /api/waitlist`
- `GET /api/admin/waitlist-participants?page=1&pageSize=25`
- `POST /api/admin/waitlist-participants/:participantId/resend-confirmation`

Admin routes require `Authorization: Bearer <ADMIN_API_TOKEN>`.

## Verification

```bash
bun run typecheck
bun --bunx prisma validate
```
