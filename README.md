# AutoHistory

Cloud platform for auditable vehicle maintenance history (owners, repair shops, buyers).

**Progress:** see [PROJECT_TRACKER.md](./PROJECT_TRACKER.md) — Phases 1–5 are done; Phase 6 is in progress (shop-first verified workflow shipped, next: calendar, encryption, GDPR).

## Stack

| Layer | Tech |
|-------|------|
| API | Node.js, Express, Prisma, SQLite |
| Web | React, TypeScript, Vite |

## Deployment direction

Local development currently uses SQLite and local uploads. The planned hosted version will move to:

- **Supabase Postgres** for the production database
- **Supabase Storage** for uploaded receipts, proofs, and vehicle photos
- Hosted frontend/API with `APP_BASE_URL` and `PUBLIC_BASE_URL` set to production URLs

Do not commit Supabase credentials. When credentials are available, update `.env` locally and switch Prisma `DATABASE_URL` to the Supabase Postgres connection string.

## Quick start

### 1. Backend

```bash
cd backend
copy .env.example .env
npm install
npm run db:push
npm run dev
```

API: http://localhost:3001

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

App: http://localhost:5173

## API overview

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Create owner account |
| POST | `/api/auth/register/shop` | Create repair shop account |
| POST | `/api/auth/login` | Login (owner or shop) |
| GET/PATCH | `/api/auth/me` | Profile |
| GET | `/api/vin/:vin` | Decode VIN (NHTSA) |
| GET/POST | `/api/vehicles` | List / add vehicle (3 free max) |
| DELETE | `/api/vehicles/:id` | Remove vehicle |
| GET/POST | `/api/vehicles/:id/events` | Timeline (with filters) |
| POST | `/api/vehicles/:id/events/:eventId/documents` | Upload receipt |
| GET | `/api/notifications` | Owner notifications |
| GET | `/api/shop/events` | Pending events to verify (shop) |
| POST | `/api/shop/vehicles/lookup` | Shop lookup by owner email + vehicle details |
| POST | `/api/shop/events` | Shop creates auto-verified service record |
| POST | `/api/shop/events/:id/verify` | Verify event + optional proof |

### Event filters (query params)

- `eventType`, `dateFrom`, `dateTo`, `mileageMin`, `mileageMax`

## Phase 3 — Share & Trust Badge

1. Owner → vehicle → **Share & Badge**
2. Choose access: private link, public listing, or partner-only
3. Choose detail level: trust summary or full history
4. Copy the buyer link for normal sharing

### Public API

| GET | `/api/public/history/:token` | Buyer/public history |
| GET | `/api/public/history/:token/badge` | Badge widget data |

### Owner share API

| GET/PATCH | `/api/vehicles/:id/share` | Settings |
| POST | `/api/vehicles/:id/share/enable` | Enable + token |

## Phase 4 — OCR, reminders, analytics

- **OCR:** Upload receipt on an event → auto-extract amount, vendor, date (images via Tesseract, PDF via text extraction)
- **Reminders:** Auto-generated after events; due alerts via in-app + email (hourly check)
- **Shop reminders:** Shop portal → “Send appointment reminder”
- **Analytics:** `/analytics` — owner (costs, charts) or shop (verifications)
- **AI suggestions:** Shown when adding an event (rule-based maintenance intervals)
- **Email:** Logs to console by default; set `SMTP_*` in `backend/.env` for real email

## Phase 5 — Partners & monetization

- **Featured shops:** Owner → **Shops** (`/shops`) — promoted repair partners
- **Marketplace:** Owner → **Marketplace** — spare parts matched by vehicle
- **Badge analytics:** Embed script tracks `embed_load` / `click`; partners use `GET /api/partners/badge-analytics` with `X-Partner-Key` or `partnerKey` query
- **Insurance feed:** `GET /api/insurance/reliability` (anonymized aggregates, partner key)
- **Admin:** `admin@autohistory.local` / `admin123` → `/admin` (users, ban, moderation, partner stats)

### Partner / admin API

| GET | `/api/partners/featured-shops` | Featured shop ads |
| POST | `/api/partners/badge-events` | Track badge embed (public) |
| GET | `/api/partners/badge-analytics` | Partner key required |
| GET | `/api/marketplace/parts?vehicleId=` | Owner auth — parts for vehicle |
| GET | `/api/insurance/reliability` | Insurance partner key |
| GET/PATCH | `/api/admin/*` | Admin JWT only |

Set `PARTNER_API_KEY` and `INSURANCE_API_KEY` in `backend/.env` (see `.env.example`). Frontend admin tab uses `VITE_PARTNER_API_KEY` (see `frontend/.env.example`).

**Demo shops** (seeded on first API start): `premier@autohistory.local`, `quickfix@autohistory.local` / `shop123`

## Phase 6 — Shop-first verified workflow

- **Shop-created records:** Shop portal → **Create verified record**. The shop finds the owner vehicle by owner email plus VIN/details, creates the service event, and it is verified immediately.
- **Owner-created records:** Owner timeline → **Add self-report**. These remain unverified and can only be supported by receipt/photo/PDF proof.
- **Trust UI:** Owner and public timelines distinguish `Shop verified`, `Shop-created verified`, and `Self-reported with proof`.

## Try the shop flow

1. Register as **Repair shop** at `/register`
2. As **owner**, add a vehicle
3. Sign in as **shop** → Service Records → **Create verified record** using owner email + vehicle details
4. Sign back in as **owner** → check **Notifications** and the shop-verified record on timeline

## Project docs

- `Main idea.pdf` — product spec
- `diagramme_classe.png` — class diagram
- `use_case.png` — use case diagram
