# Deployment

Three independent deployments, per `plan/03-backend-and-admin.md`'s open item #5: Backend
(API), Admin (SPA), Customer (SPA). The Backend does not serve either frontend's built
assets - each is a static bundle deployed on its own, talking to the Backend only over
HTTPS + CORS.

## 1. Backend

### Environment

Copy `Backend/.env.example` to `Backend/.env` (or set the same vars in your host's
environment) and fill in every value. `src/config/env.js` parses this with zod at process
start and **refuses to boot** if anything is missing or malformed - a misconfigured
deploy fails immediately with a list of what's wrong, not as a 500 three requests later.

Notes on the less obvious ones:

- `JWT_SECRET` / `JWT_ADMIN_SECRET` - two independent secrets on purpose. A customer
  token presented to an admin route must fail at the signature, not at a role check.
  Generate each with `openssl rand -base64 48` or similar; 32+ characters, never reused
  between environments.
- `STOREFRONT_ORIGIN` / `ADMIN_ORIGIN` - the CORS allowlist, and must be the exact
  production origins (`https://shop.example.com`, not a wildcard) since both apps send
  credentials, which browsers refuse to combine with `*`.
- `COOKIE_DOMAIN` - leave unset unless the API and frontends share a parent domain you
  want cookies scoped to (e.g. `.example.com`). `COOKIE_SECURE=true` is required in
  production - refresh-token cookies must not go out over plain HTTP.
- `STORAGE_DRIVER` - `local` is fine for a single-instance deploy with a persistent
  disk. Use `s3` for anything horizontally scaled or ephemeral-filesystem (containers,
  most PaaS targets), since a second instance or a redeploy would otherwise see none of
  the files the first one wrote. See §4 for the flip procedure.
- `SMTP_URL` - required in production (the process throws on first send attempt if
  unset and `NODE_ENV=production`). Outside production, omitting it sends through a
  disposable Ethereal test inbox and logs a preview URL instead of delivering anything
  real - useful for staging without real customer inboxes.
- `SEED_ADMIN_PASSWORD` - only read by `npm run seed`. Leave unset to have the seed
  script generate and print one instead of committing a real password to shell history.

### Migrate, seed, start

```bash
npm ci
npm run migrate        # applies every pending migration, in order, and stops at the first failure
npm run create-admin   # or npm run seed for a full demo dataset - see Backend/scripts/seed.js
npm start               # node src/server.js - no --watch in production
```

`npm run migrate:status` shows what's applied without changing anything, which is the
first thing to run if a deploy's migration step is suspected to have partially failed.

### Reverse proxy

The app trusts one hop of `X-Forwarded-*` (`app.set('trust proxy', 1)`) and expects to
sit behind a single reverse proxy or load balancer terminating TLS. Point it at
`PORT` (default 4000) and forward `/api/*` (and `/media/*` when `STORAGE_DRIVER=local`).

## 2. Admin and Customer (static SPAs)

Each reads its API base URL from a build-time env var, falling back to localhost for
local dev:

- Admin: `VITE_ADMIN_API_URL` (defaults to `http://localhost:4000/api`), and
  `VITE_STOREFRONT_URL` (used only to build "preview on storefront" links from the
  homepage/content editors - defaults to `http://localhost:5173`).
- Customer: `VITE_API_URL` (defaults to `http://localhost:4000/api`).

```bash
npm ci
VITE_ADMIN_API_URL=https://api.example.com/api npm run build   # Admin
VITE_API_URL=https://api.example.com/api npm run build          # Customer
```

Vite inlines these at build time, so each app needs its own build per target
environment - there is no runtime env var to change after the bundle is built. Deploy
`dist/` to any static host. `Admin/public/robots.txt` already disallows all crawling
(the admin panel has no reason to be indexed); the Customer app intentionally ships
without a `robots.txt`, since the storefront should be crawled.

## 3. Backups

`Backend/scripts/backupDb.js` and `restoreDb.js` wrap `pg_dump`/`pg_restore` rather than
reimplementing them - the correct, standard tool for a Postgres schema of this shape.
Both require the `postgresql-client` package on `PATH` (`apt install postgresql-client`
on Debian/Ubuntu, `brew install postgresql` on macOS); if it's missing, the script fails
immediately with that exact instruction rather than a cryptic `ENOENT`.

```bash
npm run backup                                    # writes backups/pure_aura-<timestamp>.dump
npm run backup -- --out /path/to/file.dump         # explicit destination

npm run restore -- --file backups/pure_aura-2026-09-23T10-00-00-000Z.dump
npm run restore -- --file ./that.dump --yes        # skip the confirmation prompt (e.g. in CI)
```

`restore` drops and recreates every object in the target database before restoring
(`pg_restore --clean --if-exists`) - it is meant for standing up a fresh copy or
recovering a broken one, not merging into a live database, and it asks for
confirmation before running unless `--yes` is passed. Point `DATABASE_URL` at the
target database before running either script; `backups/` is git-ignored.

Schedule `npm run backup` on a cron/scheduled task against production, and store the
`.dump` files somewhere other than the same disk as the database (S3, a separate volume)
- a backup that lives next to what it backs up doesn't survive the failure it exists for.

## 4. Flipping to S3

1. Create the bucket and an IAM user/key scoped to it (`s3:GetObject`, `s3:PutObject`,
   `s3:HeadObject`, `s3:DeleteObject` on `arn:aws:s3:::<bucket>/*`).
2. Set `STORAGE_DRIVER=s3`, `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`,
   `S3_SECRET_ACCESS_KEY`, and `MEDIA_PUBLIC_BASE_URL` pointing straight at the bucket
   (e.g. `https://<bucket>.s3.<region>.amazonaws.com`) - there is no CDN layer built in.
   `env.js` refuses to boot with `STORAGE_DRIVER=s3` and any of the four S3 vars missing.
3. Before restarting the API on the new config, copy existing files across:
   ```bash
   npm run migrate:media -- --dry-run   # reports what would copy, touches nothing
   npm run migrate:media
   ```
   This is idempotent (re-running skips anything already present on the far side) and
   copies FROM local disk TO the bucket - it never reads from S3. Nothing in the database
   changes: keys are identical on both drivers and URLs are computed from
   `MEDIA_PUBLIC_BASE_URL`, which is what makes the flip reversible.
4. Restart the API with the new env. Confirm every product image, admin-uploaded asset
   and bank-transfer proof still loads. Flipping `STORAGE_DRIVER` back to `local`
   afterwards should also still work, since neither driver ever touched the database.

## 5. Security headers

Helmet is wired in `Backend/src/app.js` with its full default header set (CSP, HSTS,
`X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`,
`Referrer-Policy: no-referrer`, COOP/CORP) plus an explicit `Permissions-Policy` denying
camera/microphone/geolocation/payment/USB/FLoC, since Helmet doesn't set that one by
default. `crossOriginResourcePolicy` is relaxed to `cross-origin` deliberately - product
images are fetched by the storefront, a different origin, and the default would block
every one of them. Nothing here needs environment-specific configuration.
