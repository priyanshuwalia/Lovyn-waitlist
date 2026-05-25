# Lovyn Waitlist UI

React landing page and waitlist form for Lovyn.

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

The UI listens on `http://localhost:3000` by default.

## Verification

```bash
bun --bunx tsc --noEmit
bun run build
```
