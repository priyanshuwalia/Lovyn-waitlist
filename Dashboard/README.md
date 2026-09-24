# Lovyn Waitlist Dashboard

React admin dashboard for reviewing waitlist participants and resending Brevo confirmation emails.

## Setup

```bash
bun install
cp .env.example .env
```

`BUN_PUBLIC_API_BASE_URL` should point at the backend API, for example `http://localhost:4000`.

## Run

```bash
bun run dev
```

Open the dashboard, paste the backend `ADMIN_API_TOKEN`, and connect. The token is stored in local browser storage for the current admin browser.

The dashboard listens on `http://localhost:3001` by default. Set `PORT` to override it.

## Verification

```bash
bun run typecheck
bun run build
```
