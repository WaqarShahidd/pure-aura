# Pure Aura

A Shopify-style e-commerce demo: three independent apps in this repo.

| App        | Path        | Stack                                  | Default URL             |
| ---------- | ----------- | --------------------------------------- | ------------------------ |
| Backend    | `Backend/`  | Node/Express + Sequelize + Postgres     | http://localhost:4000    |
| Admin      | `Admin/`    | React + Vite + MUI                      | http://localhost:5174    |
| Customer   | `Customer/` | React + Vite + Tailwind                 | http://localhost:5173    |

Full production deployment mechanics (env var reference, S3 flip, backups) are in
[`docs/deployment.md`](docs/deployment.md). This file covers running it locally and
what's outstanding before it could actually go live.

## Running it locally

### Prerequisites

- Node 20 LTS or newer
- A local Postgres instance (any version 14+)

### 1. Backend

```bash
cd Backend
npm install
cp .env.example .env
```

Edit `.env`:
- `DATABASE_URL` - point at a Postgres database you've created (e.g.
  `postgres://postgres:postgres@localhost:5432/pure_aura`)
- `DATABASE_URL_TEST` - a **separate** database; `npm test` truncates every table
  between suites and must never touch the dev data
- `JWT_SECRET` / `JWT_ADMIN_SECRET` - any 32+ character strings for local dev
- Leave `STORAGE_DRIVER=local` and `SMTP_URL` empty - files land on local disk under
  `Backend/storage/`, and email sends through a disposable Ethereal inbox with the
  preview link printed to the console

```bash
npm run migrate        # creates the schema
npm run seed            # full demo catalog, orders, and an admin login (prints the password)
# or: npm run create-admin   # just one admin user, no demo data
npm run dev              # http://localhost:4000, restarts on file change
```

`npm run migrate:status` shows what's applied. `npm test` runs the 95-test suite
against `DATABASE_URL_TEST`.

### 2. Admin

```bash
cd Admin
npm install
cp .env.example .env.local   # defaults already point at localhost:4000, edit only if needed
npm run dev                   # http://localhost:5174
```

Sign in with the admin credentials `npm run seed` (or `create-admin`) printed.

### 3. Customer

```bash
cd Customer
npm install
cp .env.example .env.local   # defaults already point at localhost:4000, edit only if needed
npm run dev                   # http://localhost:5173
```

All three need to be running at once for the full flow (browse on Customer, place an
order, manage it in Admin).

## Production readiness

What's already in place, and what's genuinely still missing before this should take
real traffic or real payments.

### Already done

- Full backend test suite (95 tests: money math, order state machine, inventory holds,
  discounts, serializer parity) - `npm test` in `Backend/`
- Fail-fast env validation (`Backend/src/config/env.js`) - a misconfigured deploy
  refuses to boot instead of failing weirdly on the first request
- Security headers (CSP, HSTS, frame/content-type/referrer/permissions policy) via
  Helmet, tuned for this app - see `docs/deployment.md` §5
- CORS locked to an explicit origin allowlist with credentials, not a wildcard
- Graceful shutdown on `SIGTERM`/`SIGINT` (`Backend/src/server.js`) - in-flight
  requests finish before the process exits
- S3-compatible storage driver with a one-way local→S3 migration script
  (`npm run migrate:media`), switchable via `STORAGE_DRIVER` with zero DB changes
- `pg_dump`/`pg_restore`-based backup/restore scripts (`npm run backup` / `restore`)
- Transactional email for order confirmation, shipped, payment verified, and password
  reset, sent after (never inside) the DB transaction that triggers them
- Row-locked stock decrement at checkout plus a separate soft "holds" layer, so two
  customers can't both check out the last unit
- Append-only order status history enforced by a DB trigger, not just app logic

### Still needed before going live

1. **A real SMTP provider.** `SMTP_URL` is unset in every environment tested so far;
   email has only been verified against a disposable Ethereal inbox. Pick a provider
   (SES, Postgres-adjacent Mailgun/SendGrid/etc.), set `SMTP_URL` and `MAIL_FROM`, and
   send a real order-confirmation email end-to-end before launch. The process throws on
   first send if `SMTP_URL` is unset and `NODE_ENV=production`, so this can't be
   silently skipped - but it hasn't been done yet.
2. **A real S3 bucket, live-verified.** The driver and `migrateMedia.js` are complete
   and reviewed, but neither has run against an actual AWS account in this environment
   (no credentials available here). Follow `docs/deployment.md` §4 and confirm every
   image still loads after the flip before relying on it.
3. **Backups actually running.** The scripts work (verified their error paths), but
   nothing runs them yet - no cron job, no scheduled task, no offsite copy. Also verify
   the `postgresql-client` package (`pg_dump`/`pg_restore`) is installed wherever this
   deploys; this dev machine doesn't have it, so the scripts could only be checked for
   correct behavior on failure, not a real dump/restore cycle.
4. **Real business figures instead of placeholders.** The GST rate (seeded as 18%,
   tax-inclusive) and express delivery fee (seeded as Rs 2,500) were both assumptions
   made during earlier phases - confirm the real numbers in Admin → Settings before
   launch.
5. **Production secrets.** `JWT_SECRET`, `JWT_ADMIN_SECRET`, `S3_SECRET_ACCESS_KEY`,
   `SEED_ADMIN_PASSWORD`, `SMTP_URL` credentials, `DATABASE_URL` - generate fresh values
   for production and put them in a secrets manager or your host's env var store, never
   in a committed file. `COOKIE_SECURE=true` and a correct `COOKIE_DOMAIN` must be set
   once real domains exist, or refresh-token cookies will go out over plain HTTP.
6. **Hosting and process management.** There's no Dockerfile, CI pipeline, or
   `.github/workflows` in this repo yet - deployment is currently manual (`npm run
   migrate && npm start`). `npm start` runs the bare Node process with no restart
   policy; put a process manager (pm2, systemd, or your platform's container restart
   policy) in front of it, and decide on hosting for the Backend (a long-running Node
   host, not a serverless one - it holds a Postgres connection pool) versus the two
   static SPA bundles (any static host/CDN).
7. **No automated tests on the frontends.** `Admin/` and `Customer/` have no test
   script or test files at all - only `Backend/` is covered. The 95 backend tests catch
   regressions in money/order/inventory logic; a broken checkout button or a UI
   regression on either frontend would currently only be caught by hand.
8. **No error tracking or uptime monitoring.** Structured logs exist (pino) but go
   nowhere outside the process's own stdout - nothing pages anyone or aggregates errors
   across restarts. Worth wiring a provider (Sentry, or your host's log drain) before
   relying on this in production.
9. **SEO basics not done on the storefront.** `Customer/index.html` has one static
   `<title>Pure Aura</title>` and no per-page meta/OG tags or `sitemap.xml`. Fine for a
   demo, not for a storefront meant to be found via search.
10. **One known layout risk, called out in the original plan:** `FavoritesShowcase` on
    the homepage assumes exactly 3 favourited products per category to fill its 4-column
    row. Admin can currently unfavourite down to fewer and break that layout; there's a
    warning in the Admin form but no hard validation preventing it.
11. **Rate limiting is a single in-memory limiter** (300 req/min/IP, resets on every
    restart or across multiple instances). Fine behind one instance; if this ever runs
    as more than one process, move it to a shared store (Redis) or put a WAF/CDN in
    front instead.
