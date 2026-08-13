# AutoHistory (repair_history)

Verified vehicle maintenance history for owners, repair shops, and buyers. Product name in UI: **AutoHistory**.

## Repository layout

| Path | Role |
|------|------|
| `backend/` | Express API, Prisma, Supabase/local storage |
| `frontend/` | React 19 + Vite + TypeScript web app (primary product UI) |
| `mobile/` | Expo 57 scaffold — not wired to API yet |
| `api/` | Vercel serverless entry for production API |

## Dev commands

```bash
# API (http://localhost:3001)
cd backend && npm install && npm run db:push && npm run dev

# Web (http://localhost:5173)
cd frontend && npm install && npm run dev

# Mobile (Expo)
cd mobile && npm install && npm start
```

Root `npm run postinstall` runs Prisma generate. Frontend build: `cd frontend && npm run build`.

## Architecture

- **Auth:** JWT locally, or Supabase Auth when configured (`backend/src/lib/supabase.js`).
- **DB:** Prisma → PostgreSQL (Supabase in production). Schema: `backend/prisma/schema.prisma`.
- **Uploads:** Supabase Storage when configured; else `backend/uploads/` and `/api/uploads/`.
- **Deploy:** Vercel — SPA from `frontend/dist`, API via `api/index.js` + `vercel.json` rewrites.

### User roles

`OWNER` (garage + timeline), `SHOP` (verify / create records), `BUYER` (open shared links), `ADMIN`.

### Core domain

- **Vehicles** with VIN, mileage, optional photo (`photoPath`).
- **Maintenance events** — source `OWNER` (self-reported) or `SHOP` (pro / verified).
- **Sharing:** `shareLevel` = `SUMMARY` | `FULL` | `NONE`; public route `/history/:token`.
- **No trust-score UI** on dashboard or public/shared pages — show counts (pro / declared / total), not percentages.

## Frontend conventions

- **i18n:** `frontend/src/i18n/locales/fr.ts` and `en.ts` — always update both for user-facing text.
- **French copy:** use *historique* (not *frise*); *Réalisé chez* / *Ajouté par un pro*; currency **€**.
- **No OCR** in the product UI or flows (backend OCR removed from active paths).
- **Design system:** CSS tokens in `frontend/src/index.css`; mirror in `frontend/src/styles/tokens.ts` for charts/SVG.
- **Components:** `frontend/src/components/ui/` (Button, Card, Badge…), layout in `components/layout/`.
- **API client:** `frontend/src/api.ts` — extend types in `frontend/src/types.ts`.
- **Back navigation:** global `PageBackButton` in AppShell via `frontend/src/lib/pageBack.ts` — don’t duplicate per-page back links.
- **Vehicle photos:** `frontend/src/lib/vehiclePhoto.ts`, `VehiclePhoto.tsx`, `PublicVehiclePhoto.tsx`.

## Backend conventions

- Routes under `backend/src/routes/`; shared logic in `backend/src/lib/`.
- Share/public sanitization: `backend/src/lib/share.js` (`sanitizeVehiclePublic`, `sanitizeEventPublic`).
- Password policy: `backend/src/lib/passwordPolicy.js` (min 8 chars, upper + number).
- Use existing Prisma client from `backend/src/lib/prisma.js`.
- Prefer minimal diffs; match surrounding route style (async handlers, `res.status().json()`).

## When editing

1. **Minimize scope** — only change what the task requires.
2. **Match existing patterns** — naming, imports, component structure.
3. **Don’t commit** unless the user explicitly asks.
4. **Never commit** `.env`, credentials, or secrets.
5. Run `npm run build` in `frontend/` after substantive TS changes.

## Key routes (web)

| Path | Page |
|------|------|
| `/` | Owner dashboard |
| `/vehicles/:id` | Service history (filters: source, year, type) |
| `/vehicles/:id/share` | Share settings + buyer preview |
| `/history/:token` | Public shared history |
| `/shop` | Shop dashboard |
| `/settings` | Profile / password |

## Mobile

See `mobile/CLAUDE.md`. Expo 57 + expo-router; align with web API and i18n when implementing features.

## Docs

- `README.md` — setup and API overview
- `PROJECT_TRACKER.md` — feature phases (if present)
