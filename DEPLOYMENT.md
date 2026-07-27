# Deploy AutoHistory on Vercel, Netlify, or Supabase (free tier)

This guide walks you through hosting **AutoHistory** with:

| Layer | Service |
|-------|---------|
| Web app + API | [Vercel](https://vercel.com) or [Netlify](https://netlify.com) (free) |
| Database | Supabase Postgres (free) |
| Auth | Supabase Auth (free) |
| File uploads | Supabase Storage (free) |

---

## Overview

```
Browser  →  Vercel (React static + /api serverless)
                ↓
         Supabase Postgres (Prisma)
         Supabase Auth (JWT verified by API)
         Supabase Storage (photos, receipts, shop proofs)
```

One Vercel project serves both the React frontend and the Express API (`/api/*`).

---

## Part 1 — Supabase project

### 1. Create a project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) → **New project**.
2. Pick a name, password, and region close to your users.
3. Wait until the project is **Active**.

### 2. Get connection strings

**Project Settings → Database → Connection string**

You need **two** URLs for Prisma:

| Variable | Connection type | Port | Use |
|----------|-----------------|------|-----|
| `DATABASE_URL` | **Transaction pooler** (PgBouncer) | **6543** | Runtime API on Vercel |
| `DIRECT_URL` | **Direct** or **Session pooler** | **5432** | `prisma db push` / migrations |

Example shape (replace placeholders):

```env
DATABASE_URL="postgresql://postgres.xxxxx:YOUR_PASSWORD@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.xxxxx:YOUR_PASSWORD@aws-0-eu-central-1.pooler.supabase.com:5432/postgres"
```

Also copy from **Project Settings → API**:

- **Project URL** → `SUPABASE_URL` / `VITE_SUPABASE_URL`
- **anon public** → `VITE_SUPABASE_ANON_KEY`
- **service_role** → `SUPABASE_SERVICE_ROLE_KEY` (backend only — never commit or expose)

### 3. Push the database schema

On your machine (with Node.js installed):

```powershell
cd backend
copy .env.example .env
# Edit .env — paste DATABASE_URL and DIRECT_URL from Supabase
npm install
npx prisma db push
```

This creates all tables in Supabase Postgres.

### 4. Create storage buckets

In Supabase: **SQL Editor → New query**, paste the contents of [`supabase/setup.sql`](./supabase/setup.sql), and **Run**.

This creates:

- `vehicle-photos` — public read (vehicle thumbnails)
- `documents` — private (receipts; API serves signed URLs)
- `shop-proofs` — private (shop verification files)

### 5. Configure Auth

**Authentication → Providers → Email**

- Enable **Email** provider.
- For easiest first deploy: **disable “Confirm email”** under Email settings (you can turn it back on later).
- Optional: set **Site URL** to your future Vercel URL, e.g. `https://your-app.vercel.app`.
- Add the same URL under **Redirect URLs**.

**Authentication → URL configuration**

- Site URL: `https://your-app.vercel.app` (update after first deploy if needed)
- Redirect URLs: `https://your-app.vercel.app/**` and `http://localhost:5173/**` for local dev

**Brand password-reset emails as AutoHistory (no SMTP needed)**

Password reset uses Supabase’s built-in mailer. To stop emails showing as “Supabase Auth”:

1. Open **Authentication → Email Templates → Reset password**
2. Change the **Subject** to e.g. `AutoHistory — Reset your password`
3. Edit the body so it says AutoHistory (keep the `{{ .ConfirmationURL }}` link)
4. Optional (Pro / custom SMTP in Supabase): **Project Settings → Authentication → SMTP** — set sender name to `AutoHistory` and your own from-address

---

## Part 2 — Local environment (optional but recommended)

### Backend (`backend/.env`)

```env
DATABASE_URL=...pooler...6543...?pgbouncer=true
DIRECT_URL=...5432...
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
JWT_SECRET=any-long-random-string
APP_BASE_URL=http://localhost:5173
PUBLIC_BASE_URL=http://localhost:3001
CRON_SECRET=some-random-secret
OCR_DISABLED=true
```

`OCR_DISABLED=true` speeds up local uploads (Tesseract is heavy on serverless).

### Frontend (`frontend/.env`)

```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

### Run locally

Terminal 1:

```powershell
cd backend
npm run dev
```

Terminal 2:

```powershell
cd frontend
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) — sign up creates a Supabase Auth user, then syncs your app profile via `/api/auth/sync-profile`.

---

## Part 3 — Deploy to Vercel

### 1. Push code to GitHub

Vercel deploys from Git. Push this repo to GitHub (or GitLab/Bitbucket).

### 2. Import project

1. [vercel.com/new](https://vercel.com/new) → import your repository.
2. **Root directory**: leave as repository root (where `vercel.json` lives).
3. Framework preset: **Other** (we define build in `vercel.json`).

### 3. Environment variables

In Vercel → **Project → Settings → Environment Variables**, add:

| Name | Value | Environments |
|------|-------|--------------|
| `DATABASE_URL` | Supabase pooler URL (6543) | Production, Preview |
| `DIRECT_URL` | Supabase direct URL (5432) | Production, Preview |
| `SUPABASE_URL` | Supabase project URL | Production, Preview |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key | Production, Preview |
| `VITE_SUPABASE_URL` | Same as SUPABASE_URL | Production, Preview |
| `VITE_SUPABASE_ANON_KEY` | Anon key | Production, Preview |
| `APP_BASE_URL` | `https://YOUR-APP.vercel.app` | Production |
| `PUBLIC_BASE_URL` | `https://YOUR-APP.vercel.app` | Production |
| `JWT_SECRET` | Long random string | Production, Preview |
| `CRON_SECRET` | Long random string | Production |
| `OCR_DISABLED` | `true` | Production (recommended on free tier) |
| `PARTNER_API_KEY` | Your partner key | Production, Preview |
| `INSURANCE_API_KEY` | Your insurance key | Production, Preview |
| `VITE_PARTNER_API_KEY` | Same as PARTNER_API_KEY | Production, Preview |

**Important:** `VITE_*` variables are baked in at **build time**. Redeploy after changing them.

Optional email (app reminders/notifications only — password reset stays on Supabase Auth):

| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` |

### 4. Deploy

Click **Deploy**. Vercel will:

1. `npm install` in `backend/` and `frontend/`
2. `prisma generate` + `vite build`
3. Serve `frontend/dist` and route `/api/*` to the serverless Express app

### 5. Post-deploy checks

1. Open `https://YOUR-APP.vercel.app/api/health` — expect:
   ```json
   { "status": "ok", "storage": "supabase", "auth": "supabase" }
   ```
2. Register a new **Owner** account on the site.
3. Add a vehicle with a photo — confirm it appears (Supabase Storage → `vehicle-photos`).
4. Add a maintenance event with a receipt upload.
5. Enable sharing and open the buyer link.

### 6. Cron (service reminders)

`vercel.json` schedules hourly calls to `/api/cron/reminders`. Vercel sends:

```
Authorization: Bearer <CRON_SECRET>
```

Set `CRON_SECRET` in Vercel env vars. On the **free** Vercel plan, cron may be limited — upgrade or trigger manually if needed.

---

## Part 4 — Create an admin user

There is no public admin sign-up. After you have a normal account:

1. Supabase **Authentication → Users** — note the user UUID.
2. Supabase **SQL Editor**:

```sql
UPDATE "User"
SET role = 'ADMIN'
WHERE id = 'paste-user-uuid-here';
```

Sign out and back in — you should see admin routes.

For local-only dev **without** Supabase, the seed still creates `admin@autohistory.local` / `admin123` when using legacy JWT mode.

---

## Part 5 — File map (what runs where)

| Path | Role |
|------|------|
| `frontend/` | React UI (Vite) |
| `backend/src/app.js` | Express API (shared local + Vercel) |
| `api/index.js` | Vercel serverless entry |
| `vercel.json` | Build, rewrites, cron |
| `backend/prisma/schema.prisma` | Postgres schema |
| `backend/src/lib/storage.js` | Supabase Storage or local `./uploads` |
| `backend/src/lib/supabase.js` | Token verification (service role) |
| `frontend/src/lib/supabase.ts` | Browser Supabase client |
| `supabase/setup.sql` | Storage bucket setup |

---

## Troubleshooting

### “Profile not found. Complete registration.”

Auth user exists in Supabase but not in app DB. Sign out, sign up again, or call sync manually after sign-in.

### Upload fails on Vercel

- Confirm buckets exist (`supabase/setup.sql`).
- Confirm `SUPABASE_SERVICE_ROLE_KEY` is set.
- Check function logs in Vercel → Deployments → Functions.

### Prisma / database errors

- `DATABASE_URL` must use port **6543** with `?pgbouncer=true`.
- `DIRECT_URL` must use port **5432** for schema pushes.
- Re-run locally: `cd backend && npx prisma db push`.

### CORS errors

Set `APP_BASE_URL` to your exact Vercel URL (no trailing slash).

### Email confirmation blocks sign-up

Disable “Confirm email” in Supabase Auth settings, or confirm via email before first login.

### Share links wrong domain

Set `PUBLIC_BASE_URL` to your Vercel URL and redeploy.

---

## Cost notes (free tier)

- **Supabase free**: 500 MB database, 1 GB storage, 50k MAU auth — fine for a portfolio / small pilot.
- **Vercel free**: Serverless execution limits apply; set `OCR_DISABLED=true` in production to avoid heavy OCR on cold starts.
- Upgrade either service when you outgrow limits.

---

## Quick checklist

- [ ] Supabase project created
- [ ] `prisma db push` succeeded
- [ ] `supabase/setup.sql` executed
- [ ] Auth email settings configured
- [ ] All env vars set in Vercel
- [ ] Deploy succeeded
- [ ] `/api/health` shows `supabase`
- [ ] Sign-up, vehicle, upload, share link tested

---

## Deploy on Netlify (alternative to Vercel)

The repo includes `netlify.toml` and `netlify/functions/` so you can deploy the **same app** on Netlify while keeping Vercel as a backup option.

```
Browser  →  Netlify (React static + serverless Express function)
                ↓
         Supabase Postgres / Auth / Storage (unchanged)
```

### 1. Push code to GitHub

Repository: [github.com/Dh-Yassine/Repair_history](https://github.com/Dh-Yassine/Repair_history)

### 2. Import on Netlify

1. Go to [app.netlify.com](https://app.netlify.com) → **Add new site** → **Import an existing project**
2. Connect **GitHub** and select **Repair_history**
3. Netlify auto-detects settings from `netlify.toml`:
   - **Build command:** installs backend + frontend, runs `prisma generate`, builds Vite
   - **Publish directory:** `frontend/dist`
   - **Functions:** `netlify/functions`

Leave the defaults — do **not** override unless Netlify fails to read `netlify.toml`.

### 3. Environment variables (Netlify → Site settings → Environment variables)

Add the **same values** as Vercel (see Part 3 table above), plus:

| Name | Value |
|------|-------|
| `NETLIFY` | `true` |
| `DATABASE_URL` | Supabase transaction pooler (6543) |
| `DIRECT_URL` | Supabase session pooler (5432) |
| `SUPABASE_URL` | `https://ifjyjwhncjavwkdfvqsr.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | service role key |
| `VITE_SUPABASE_URL` | same as SUPABASE_URL |
| `VITE_SUPABASE_ANON_KEY` | anon key |
| `APP_BASE_URL` | `https://YOUR-SITE.netlify.app` |
| `PUBLIC_BASE_URL` | `https://YOUR-SITE.netlify.app` |
| `JWT_SECRET` | random string |
| `CRON_SECRET` | random string |
| `OCR_DISABLED` | `true` |

**Important:** `VITE_*` vars must be set **before** the first build (they are embedded at build time).

### 4. Deploy

Click **Deploy site**. First build takes a few minutes.

### 5. Post-deploy checks

1. Open `https://YOUR-SITE.netlify.app/api/health`
2. Expect: `{ "storage": "supabase", "auth": "supabase" }`
3. Sign up, add a vehicle, test sharing

### 6. Update Supabase Auth URLs

In Supabase → **Authentication → URL configuration**, add:

- Site URL: `https://YOUR-SITE.netlify.app`
- Redirect URLs: `https://YOUR-SITE.netlify.app/**`

### 7. Service reminders (cron)

- **Netlify:** `netlify/functions/reminders.js` runs on an `@hourly` schedule (may require a paid Netlify plan for scheduled functions).
- **Fallback:** call `GET https://YOUR-SITE.netlify.app/api/cron/reminders` with header `Authorization: Bearer YOUR_CRON_SECRET` from [cron-job.org](https://cron-job.org) (free).

### Netlify vs Vercel

| | Vercel | Netlify |
|---|--------|---------|
| Config | `vercel.json` + `api/index.js` | `netlify.toml` + `netlify/functions/` |
| Cron | Built-in (`vercel.json` crons) | Scheduled function or external cron |
| Supabase | Same env vars | Same env vars |

You can deploy to **both** platforms from the same GitHub repo — just create two projects pointing at the same repository.

### Netlify checklist

- [ ] GitHub repo pushed
- [ ] Netlify site connected to repo
- [ ] All env vars set (including `VITE_*`)
- [ ] Supabase Auth URLs updated for Netlify domain
- [ ] `/api/health` OK
- [ ] Sign-up and upload tested
