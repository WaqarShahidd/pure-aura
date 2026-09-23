# Pure Aura — Backend API & Admin Panel

## Context

`Customer/` is a complete, good-looking storefront with **no backend at all**. Every product, collection, page, menu and order is a JavaScript literal in `src/data/` or `src/config/`. There are no `fetch` calls anywhere. Every product image, collection image and hero video is `null`, rendered through a deterministic tinted placeholder. Checkout invents a random order number, saves nothing, and a page refresh loses the order forever — it never reaches `/account/orders`. The account pages render an already-signed-in shell over mock data, and `AddressBook`'s Add/Edit/Remove buttons have no `onClick` at all.

This work adds `Backend/` (Express + Sequelize + PostgreSQL) and `Admin/` (React + Vite + MUI) so the shop can actually be run: products and categories managed, orders taken and moved through a courier delivery flow, payments collected by COD or bank transfer, and every piece of storefront content edited without a code change.

Both directories already exist and are empty. The storefront was built anticipating this — `src/data/catalog.js` carries the comment *"so swapping the data source later is a change in one file"*, and `ImagePlaceholder` says *"All of this disappears once `src` is non-null."* This plan makes both true.

**House rule from `plan/00-context.md`: a new plan is a new numbered file.** Step one of execution is copying this to `plan/03-backend-and-admin.md`. That file also records an explicit instruction that **git commits must not list Claude as co-author** — it overrides the default attribution.

---

## Decisions locked

| Area | Decision |
|---|---|
| Backend | Express + Sequelize + PostgreSQL, plain JS (no TypeScript) |
| Admin | Separate Vite app, React 19 + MUI v9 + TanStack Query. **No Tailwind.** |
| Homepage CMS | Fixed 4 sections in fixed order; every field editable, each toggleable |
| Customer auth | Full accounts (JWT) + guest checkout |
| Media | Local disk now, behind an adapter; `STORAGE_DRIVER=local\|s3` flips to S3. **No CloudFront.** |
| Payments | COD + Bank Transfer live. Card/PayPal/Stripe kept, behind feature flags. |
| Bank transfer | Customer uploads proof → admin verifies → order advances |
| Courier | Manual status updates + tracking number. No courier API in v1. |
| **Variants** | **Real variants.** Size/shade with own price, stock, SKU, image. |
| **Tax** | **Included in listed prices.** Shown as an informational breakdown, never added on. |
| Reviews | `rating`/`reviewCount` stay admin-editable numbers. No reviews table. |
| Locale | Cut. English + PKR only. Remove the language/region selectors. |
| Seed | Realistic fake data + real downloaded stock photos, cached in repo |
| Also fixing | URL filters + pagination · real discount codes · real inventory + reservation · the Rs 14 express bug |

---

## 1. The principle everything hangs off

**The public API's product JSON stays shape-compatible with today's `products.js` literal** — all 34 fields, same names, same value vocabulary (`availability` stays the string `'In stock'`, `category` stays `'Serums'`, `collections` stays an array of handles). The database is normalised properly underneath and a serializer projects it back.

This is what turns "rewrite the storefront" into "make 9 functions async". `Backend/src/serializers/product.js` is the contract file and gets the one test that matters: serialize the seeded catalog, diff against the literal array copied out of `Customer/src/data/products.js`. If that passes, the storefront cannot break.

**Variants extend the shape, they don't change it.** Product-level `price`, `compareAtPrice`, `inStock` and `variantSummary` all serialize from the product's **default variant**, so `ProductCard` (`Customer/src/components/Common/ProductCard/ProductCard.jsx`) and every grid keeps working untouched. A new `variants[]` array is added, which only the PDP reads.

---

## 2. Schema

**Conventions:** uuid PKs (`gen_random_uuid()`), `timestamptz` always, `citext` for emails/handles, snake_case columns with Sequelize `underscored: true`, `created_at`/`updated_at` everywhere. Soft delete (`deleted_at`) only on `products` and `collections`. Migrations via `umzug` with real `up`+`down` — **never `sequelize.sync()`**, because the seed/unseed pair depends on a stable schema.

**Money:** `INTEGER`, whole PKR, `CHECK (>= 0)`. No decimals, no cents — `Customer/src/utils/formatPrice.js` uses `minimumFractionDigits: 0`. Tax stored as basis points (`tax_rate_bp INTEGER`, 1800 = 18%) so integer arithmetic only.

### 2.1 Catalog + variants

```
categories       id, handle citext UQ, title, description, position, media_id
collections      id, handle citext UQ, title, description, card_label, media_id,
                 position, is_featured, featured_position, is_active, deleted_at
                 IDX (is_featured, featured_position)   -- featuredCollectionCards

products         id, handle citext UQ, title, subtitle, description, vendor,
                 badge enum('BEST SELLER','SALE') NULL, cruelty_free,
                 rating smallint CHECK 1..5, review_count int,
                 ingredient_note, category_id FK RESTRICT, primary_image_id,
                 is_favorite, is_upsell, stock_label,
                 status enum('draft','active','archived'), published_at,
                 position, seo_title, seo_description, deleted_at
                 IDX (status, published_at) · (category_id)
                 partial IDX WHERE is_favorite · WHERE is_upsell

product_options        id, product_id FK CASCADE, name ('Size'|'Shade'), position
                       UQ (product_id, name)
product_option_values  id, option_id FK CASCADE, value ('30ml'), position
                       UQ (option_id, value)

product_variants       id, product_id FK CASCADE, sku citext UQ NULL,
                       label text,                      -- 'Unscented / 30ml'
                       price int NOT NULL CHECK >= 0,
                       compare_at_price int NULL,
                       CHECK (compare_at_price IS NULL OR compare_at_price >= price),
                       stock_quantity int DEFAULT 0 CHECK >= 0,
                       low_stock_threshold int DEFAULT 5,
                       media_id FK SET NULL, position, is_default bool, is_active
                       partial UQ (product_id) WHERE is_default   -- exactly one default
                       IDX (product_id, position)

variant_option_values  variant_id FK CASCADE, option_value_id FK RESTRICT
                       PK (variant_id, option_value_id)

product_images       id, product_id FK CASCADE, media_id FK RESTRICT, position, alt_text
                     UQ (product_id, position)
product_ingredients  id, product_id FK CASCADE, name, percent smallint CHECK 0..100, position
collection_products  collection_id, product_id, position   PK both
product_routine_products  product_id, related_product_id, position   PK both
                          CHECK (product_id <> related_product_id)
```

**Derived, never stored:** `availability` (`'In stock'`/`'Out of stock'`), product-level `inStock` (any active variant with stock), `price`/`compareAtPrice`/`variantSummary` (from the default variant). Two sources of truth for stock is how you get a product that filters as in-stock and renders as out-of-stock.

A single-variant product is the normal case: one `product_variants` row, `is_default: true`, no `product_options`. The PDP shows a selector only when `options.length > 0`.

### 2.2 Managed facet vocabularies — the quiz-safety layer

`Customer/src/config/filters.js` and `Customer/src/components/Page/Quiz/Quiz.jsx` both reference the same product fields and the same literal facet values. Free-text editing would silently break the quiz.

```
facets       id, key citext UQ, label, field_key text, position,
             type enum('list','swatch','range'), swatch_field,
             cardinality enum('single','multi'), is_active, is_system
facet_values id, facet_id FK CASCADE, value, label, swatch_hex char(7) NULL,
             position, is_active     UQ (facet_id, value)
product_facet_values  product_id, facet_value_id FK RESTRICT, facet_id
                      PK (product_id, facet_value_id)
price_ranges id, key UQ, label, min_amount int, max_amount int NULL, position
sort_options id, key UQ, label, field enum(...), direction enum('asc','desc'),
             position, is_default   partial UQ WHERE is_default
quiz_questions     id, key UQ, prompt, facet_id FK RESTRICT, position, is_active
quiz_answers       id, question_id FK CASCADE, label, position
quiz_answer_values answer_id FK CASCADE, facet_value_id FK RESTRICT   PK both
```

- `facets.field_key` is the data-level fix for the two mismatched ids in `filters.js:19-20` — `key='collection', field_key='collectionFilter'` and `key='ingredient', field_key='ingredientFilter'`. It stops being a naming coincidence someone can break.
- **`ON DELETE RESTRICT` on `quiz_answer_values → facet_values` is the whole answer** to "admin edits a vocabulary and the quiz breaks." It can't. Deleting `'Dry skin'` returns `409 FACET_VALUE_IN_USE` naming the question that uses it.
- `price_ranges.max_amount NULL` replaces `max: Infinity` (`filters.js:29`) — `JSON.stringify(Infinity)` is `null`, so this is a real bug the moment ranges come from an API.
- **Live bug to fix in the seed:** `Quiz.jsx` answers with `'Aloe Vera'` but `products.js` stores `'Aloe Vera Extract'`. That answer currently scores zero on every product. Pick one value; the FK makes it impossible to reintroduce.

### 2.3 Customers, auth, admin

```
customers    id, email citext UQ, password_hash NULL, first_name, last_name, phone,
             birthday, marketing_opt_in, sms_opt_in, reward_points,
             email_verified_at, last_login_at, status enum('active','blocked')
addresses    id, customer_id FK CASCADE, label, is_default, name, line1, line2,
             city, region, postcode, country, phone
             partial UQ (customer_id) WHERE is_default
admin_users  id, email citext UQ, password_hash, name,
             role enum('owner','manager','staff'), is_active, last_login_at
refresh_tokens  id, subject_type enum('customer','admin'), subject_id, token_hash,
                expires_at, revoked_at, replaced_by_id, user_agent, ip
password_resets id, subject_type, subject_id, token_hash, expires_at, used_at
audit_log       id, admin_user_id, action, entity_type, entity_id,
                before jsonb, after jsonb, ip, created_at
```

Separate `admin_users`, not a role column on `customers` — different lifecycles, different password policies, different token audiences. Merging them is how privilege-escalation bugs happen.

### 2.4 Orders — reconciling two incompatible shapes

`Checkout.jsx` produces `{orderId, email, total, delivery}` with 8% tax and discards it. `data/account.js` carries `{id, placedOn, status, deliveredOn, trackingNumber, shippingAddressId, paymentLabel, shipping, items}` with no tax. One table, superset of both, **totals snapshotted at write time and never recomputed.**

```
orders  id, number text UQ,              -- 'PA-' || nextval(order_number_seq @ 10248)
        customer_id FK SET NULL, guest_email citext NULL,
        CHECK (customer_id IS NOT NULL OR guest_email IS NOT NULL),
        access_token_hash,                -- guest order lookup
        status order_status, payment_status payment_status,
        currency char(3) DEFAULT 'PKR',
        subtotal_amount, discount_amount DEFAULT 0, shipping_amount,
        tax_rate_bp, tax_amount, tax_inclusive bool DEFAULT true, total_amount,
        CHECK (total_amount = subtotal_amount - discount_amount + shipping_amount),
        delivery_method_id, delivery_method_label,
        payment_method_id,  payment_method_label,
        contact_email, contact_phone, marketing_opt_in,
        ship_* (name,line1,line2,city,region,postcode,country,phone),
        billing_same, bill_* (same 8, nullable),
        courier_id FK SET NULL, tracking_number, tracking_url,
        customer_note, admin_note,
        placed_at, confirmed_at, handed_to_courier_at, delivered_at,
        cancelled_at, cancel_reason
        IDX (customer_id, placed_at DESC) · (status) · (payment_status) · (tracking_number)

order_items  id, order_id FK CASCADE,
             product_id FK SET NULL, variant_id FK SET NULL,
             handle, title, variant_label, image_url, sku,   -- all snapshots
             unit_price, compare_at_price, quantity CHECK > 0, line_total,
             gift_wrap, gift_card, gift_message, position
```

**Tax-inclusive arithmetic** (`Backend/src/lib/money.js`):

```
taxable   = subtotal_amount - discount_amount + shipping_amount
tax_amount = taxable - Math.round(taxable * 10000 / (10000 + tax_rate_bp))
total_amount = taxable          // tax is NEVER added on
```

The `CHECK` constraint permanently settles the account-vs-checkout inconsistency: there is one arithmetic, enforced by the database. `OrderSummary.jsx` changes from an "Estimated tax" row that adds, to an "(incl. GST Rs X)" sub-line under the total that doesn't.

`order_items` snapshots everything, so **`OrderDetail.jsx` drops its `getProductByHandle` call entirely** — no lookups, no broken rows when a product is archived, and `product_id FK SET NULL` means deleting a product never destroys order history.

Order addresses are **embedded snapshots, not FKs**. An order must not re-render differently because the customer later edited their address book. `OrderDetail.jsx` stops calling `getAddressById`.

### 2.5 Order lifecycle + courier

```sql
CREATE TYPE order_status AS ENUM (
  'pending_payment','confirmed','processing','packed','handed_to_courier',
  'in_transit','out_for_delivery','delivered','failed_delivery',
  'returned_to_sender','cancelled','refunded');
CREATE TYPE payment_status AS ENUM (
  'unpaid','awaiting_verification','paid','partially_refunded','refunded','failed');
```

**Two orthogonal axes, deliberately.** COD is `delivered` + `paid` at the same instant; bank transfer is `confirmed` + `paid` days before anything ships. One enum would need a combinatorial explosion of statuses and make the admin order list unfilterable.

```
order_status_events  id, order_id FK CASCADE, from_status NULL, to_status,
                     actor_type enum('admin','customer','system'), actor_id,
                     note, metadata jsonb, created_at
                     IDX (order_id, created_at)
couriers             id, name, code UQ, tracking_url_template, phone, is_active, position
```

Append-only enforced two ways: no service method issues UPDATE/DELETE against it, **and** the migration runs `REVOKE UPDATE, DELETE ON order_status_events FROM <app_role>`. The second is what makes it actually append-only rather than aspirationally so.

Transition matrix lives in `Backend/src/lib/orderStatus.js` as a plain exported object so Admin can grey out illegal buttons:

```
pending_payment → confirmed, cancelled          handed_to_courier → in_transit, failed_delivery
confirmed       → processing, cancelled          in_transit       → out_for_delivery, failed_delivery
processing      → packed, cancelled              out_for_delivery → delivered, failed_delivery
packed          → handed_to_courier, cancelled   failed_delivery  → out_for_delivery, returned_to_sender
delivered       → refunded                       returned_to_sender → refunded
cancelled, refunded → terminal
```

Role gates: **customer** may only `cancel`, only from `pending_payment`/`confirmed` · **staff** all forward transitions to `delivered` + `failed_delivery` · **manager** adds `cancelled`, `returned_to_sender` · **owner** adds `refunded` (the only status that moves money). Illegal → `422 ILLEGAL_TRANSITION` with the allowed set in `details`.

Every accepted transition writes an event row **and** stamps the matching `*_at` column in one transaction, so timestamps can never drift from history.

`PATCH /orders/:id/fulfilment {courierId, trackingNumber}` is the **only** path to `handed_to_courier` and requires both fields. `tracking_url` is computed once from the courier's template and stored, so changing a template later doesn't rewrite old orders.

**Storefront changes:** `OrderList.jsx:32` and `OrderDetail.jsx:23` both hardcode `order.status === 'Delivered' ? 'light' : 'dark'`. Both become a lookup into a new `Customer/src/config/orders.js` holding a 12-key `ORDER_STATUS_META` map of `{label, tone, isTerminal}`. Plus a new `components/Account/OrderTimeline/` rendering `order.events`, and a guarded tracking block (`tracking_number` is null before handoff; the current JSX renders it unconditionally).

### 2.6 Payments

```
payment_methods  id, code citext UQ, label, kind enum('offline','manual_transfer','gateway'),
                 is_enabled, requires_proof, instructions, icon_key,
                 surcharge_amount, config jsonb, position, is_deletable DEFAULT false
payments         id, order_id FK CASCADE, payment_method_id FK RESTRICT, kind, amount,
                 status enum('pending','awaiting_verification','succeeded','failed','refunded'),
                 reference_code UQ NULL, proof_media_id, bank_account_snapshot jsonb,
                 gateway_ref, verified_by_admin_id, verified_at, failure_reason
feature_flags    key PK, label, description, is_enabled, updated_by, updated_at
```

Seeded — **nothing deleted, `is_deletable=false` on all five so DELETE returns 403:**

| code | kind | enabled | gated by |
|---|---|---|---|
| `cod` | offline | **yes** | — |
| `bank_transfer` | manual_transfer | **yes** | `requires_proof=true` |
| `card` | gateway | no | `payments.stripe` |
| `paypal` | gateway | no | `payments.paypal` |
| `stripe` | gateway | no | `payments.stripe` |

**Two-key gate:** a gateway is offered only if `is_enabled` **and** its feature flag is on. `is_enabled` is the merchant switch (Admin UI); the flag is the engineering switch (requires a deploy with credentials). This stops someone flipping "Card" on in Admin and landing customers on a form with no processor behind it. `GET /api/payment-methods` returns only enabled-and-flagged methods, so the storefront cannot render a method that isn't live.

**`PaymentStep` splits** (currently an unconditional card form with PAN/CVC in plain React state):

```
PaymentStep/
  PaymentStep.jsx        radio list from the API; renders the method's instructions + body
  CardFields.jsx         TODAY'S FORM, MOVED VERBATIM — rendered only for kind==='gateway'
  BankTransferPanel.jsx  instructions + reference code + proof upload
  CodPanel.jsx           one paragraph, no fields
```

Keeping the card form byte-identical means re-enabling Stripe later is wiring a token exchange, not rewriting a form.

**Bank transfer flow:** select → see bank details from the DB → `POST /api/orders` creates the order at `pending_payment`/`unpaid` with a generated `reference_code` (`PA-BT-` + sequence) → confirmation page shows the code and an upload control → `POST /api/orders/:id/proof` (multipart, 10MB, jpg/png/pdf, magic-byte sniffed) sets `awaiting_verification` → Admin's **Payments to verify** queue approves, which in one transaction marks `paid`, system-transitions the order to `confirmed`, and writes the status event. COD skips all of it: opens at `confirmed`/`unpaid`, auto-flips to `paid` when status reaches `delivered`.

Proof files are the one place a non-admin writes to storage. They go to a `private/` prefix, are never statically served, and are fetched through an authenticated `GET /api/admin/media/:id/raw`.

**`PaymentIcons.jsx` and `site.paymentIcons` are two concerns wearing one hat** — the footer strip is a *trust signal*, the checkout row is a *capability list*. `PaymentIcons.jsx` takes an `icons` prop instead of importing `site` (it's the only consumer, a 3-line change). Footer passes an admin-ordered list from settings; PaymentStep passes the enabled methods' icon keys. Add `cod` and `bank` `<symbol>`s to `Customer/public/icons.svg`. `GET /api/settings` filters icon keys against a server-side allowlist of symbols that actually exist, so Admin can't produce a broken `<use href="#foo-icon">`.

### 2.7 Inventory + discounts (both now in scope)

```
inventory_holds  id, cart_token, variant_id FK CASCADE, quantity, expires_at, released_at
                 IDX (cart_token) · (expires_at) WHERE released_at IS NULL
inventory_moves  id, variant_id, delta int, reason enum('order','cancel','restock',
                 'adjustment','hold_expiry'), order_id NULL, admin_user_id NULL, note
discount_codes   id, code citext UQ, kind enum('percent','fixed','free_shipping'),
                 value int, min_subtotal, max_uses, used_count, per_customer_limit,
                 starts_at, ends_at, is_active, applies_to enum('all','collection','product'),
                 target_id NULL
discount_redemptions  id, discount_id, order_id, customer_id, amount
```

**Reservation becomes real.** `Customer/src/components/Cart/ReservationBanner/ReservationBanner.jsx` currently counts down 10 minutes and holds nothing. Now: adding to cart calls `POST /api/carts/hold`, which inserts an `inventory_holds` row with a TTL from settings. Available stock = `stock_quantity - SUM(active holds)`. A background sweep (or a lazy check on read) releases expired holds and writes an `inventory_moves` row. Expiry genuinely frees the stock, and the banner's copy becomes true.

`inventory_moves` is an append-only ledger, so stock is always reconstructable and "where did those 3 units go" is answerable.

**Discounts become real.** `POST /api/carts/discount {code}` validates and returns `{valid, kind, amount, message}`. `orders.discount_amount` participates in the CHECK constraint. `OrderSummary.jsx` gains a Discount row it doesn't have today, and `CartActions.jsx` stops accepting any arbitrary string.

### 2.8 CMS

```
homepage_sections  id, key citext UQ, label, is_enabled, position, content jsonb, updated_by
                   -- EXACTLY 4 rows, positions 1-4, locked:
                   -- hero · favorites · marquee_quiz · routine_steps
                   -- API refuses POST and DELETE on this resource
static_pages       id, slug citext UQ, title, accent, kind enum('policy','page'),
                   custom_component NULL, updated_label, intro, is_published, seo_*
page_sections      id, page_id FK CASCADE, heading, body jsonb (string[]), position
faqs               id, key citext UQ, question, answer, position, is_published
nav_items          id, parent_id self FK CASCADE, kind enum('root','group','column','link'),
                   label, layout enum('mega','flyout','list','link'),
                   target_type enum('collection','product','page','policy','custom','none'),
                   target_id, custom_href, media_id, seed, highlight, all_label,
                   position, is_active
footer_link_groups / footer_links / announcements / social_links
settings           key PK, value jsonb, group, updated_at
delivery_methods   id, code UQ, label, detail, price_amount, free_over_amount,
                   is_pickup, eta_min_days, eta_max_days, is_enabled, position
tax_rates          id, country, rate_bp, is_inclusive, is_default, is_active
media_assets       id, key UQ, original_filename, mime, bytes, width, height, alt_text,
                   checksum_sha256, folder, visibility enum('public','private'), created_by
media_variants     id, media_id FK CASCADE, label enum('thumb','md','lg'), key UQ, width, height
seed_records       id bigserial, batch_id, table_name, record_id, sequence
```

- `static_pages.custom_component` collapses the **second registry** — `CUSTOM_PAGES` in `Customer/src/pages/Page/Page.jsx` maps 4 slugs to interactive components, and their titles/intros are hardcoded there, so they're currently not editable at all. One table now lists all 13 routes; `Page.jsx` looks up a component only when `custom_component` is non-null, against a hardcoded whitelist (the DB can never name a component that doesn't exist).
- `page_sections.body` is a jsonb string array, not a `page_paragraphs` table. Paragraphs have no identity and no FK targets; Admin edits one textarea split on blank lines.
- `social_links.icon_key` fixes a crash hazard — `config/socialIcons.jsx` has only 4 keys and an unknown one renders `undefined` as a component. The picker offers only valid keys, the API filters unknown ones out, and a bad row degrades to a missing icon rather than a white screen. Expand `SOCIAL_ICONS` to ~10 networks in the same commit so the picker isn't uselessly narrow.
- `nav_items` is relational rather than jsonb specifically so `target_type='product'` + `target_id` gives referential integrity. `megaMenu.data.js` hardcodes 24 product URLs as strings today; archiving a product leaves a dead link. With FKs the API resolves hrefs at read time and omits archived targets.
- **`delivery_methods` seeds express at 2,500, not `14.0`** (`config/checkout.js:18` — an unconverted USD value rendering as "Rs 14", cheaper than standard's Rs 1,700). An integer column with `CHECK >= 0` makes `14.0` unrepresentable going forward. *The real figure is yours to set — 2,500 is a placeholder.*
- **Keys are stored, URLs are never stored.** That single rule is what makes the S3 flip a config change.

---

## 3. API surface

Base `/api`. Every response `{ data, meta? }`, unwrapped once in the client. Errors:

```json
{ "error": { "code": "VALIDATION_FAILED", "message": "…",
             "details": [{ "field": "email", "message": "Enter a valid email address" }],
             "requestId": "01J8…" } }
```

`details[].message` strings are written to **match the storefront's existing inline copy verbatim** (`'Required'`, `'Enter a valid email address'`, `'Use MM/YY'`) so a server response drops straight into the existing `useState({})` errors object with no translation layer. A deliberate concession to the house form pattern.

Codes: `400` malformed · `401` no/expired token · `403` role · `404` · `409` conflict · `422` domain rule · `429` rate limit · `500`. Pagination `?page=&perPage=` (max 100) with `meta:{page,perPage,total,totalPages}`. Validation by `zod` schemas in `src/schemas/` via a `validate(schema, 'body'|'query')` middleware that coerces query strings first.

**Public:** `/health` · `/bootstrap` (settings + nav + footer + announcements + socials in one call, fetched once in `Layout`, `staleTime: Infinity`) · `/products` (`?collection=&category=&q=&sort=&page=&favorites=1&upsell=1&exclude=`) · `/products/:handle` · `/collections[/:handle|/featured]` · `/categories` · `/filters` · `/quiz` · `/homepage` · `/pages[/:slug]` · `/faqs` · `/payment-methods` · `/delivery-methods` · `/carts/validate` · `/carts/hold` · `/carts/discount` · `/orders` (POST, guest or authed, returns a one-time `accessToken`) · `/orders/lookup?token=` · `/orders/:id/proof` · `/newsletter` `/contact` `/bookings` · `/auth/*` · `/me` · `/me/addresses` · `/me/orders[/:id]` · `/me/orders/:id/cancel`.

Search reuses **the exact weighted algorithm** from `Customer/src/utils/searchProducts.js` (title 6, subtitle/category 3, brand/texture/tags/skinType/ingredientFilter 2, description 1; every term must match; tie-break title A-Z), ported to `src/services/searchService.js`. Not Postgres FTS — it would rank differently for no visible benefit at this catalog size.

**Admin** (`/api/admin`, separate JWT audience): full CRUD for products (+ variants, options, images, ingredients, facets, collections, routine), collections, categories, facets + values, sort options, price ranges, quiz, orders (`/transition`, `/fulfilment`, `/payments/:pid/verify|reject`, `/refund`), customers, homepage sections, pages, faqs, nav items (`/move`), footer, announcements, social links, settings, payment methods (PATCH only), delivery methods, couriers, discounts, inventory adjustments, feature flags, media, admin users, audit log. Every write wrapped by an `audit()` call inside the same transaction.

**Auth:** customer access JWT 15 min `aud:'storefront'`, held **in memory only** (never localStorage — the cart already lives there and is XSS-readable). Refresh token 30 days in an `httpOnly; Secure; SameSite=Lax` cookie, rotated every use, reuse of a revoked token revokes the whole family. Admin uses a **separate secret and audience** so a customer token fails at signature, not at a role check — two independent gates. Rate limits on login (5/15min), register (3/hr), contact/newsletter (5/hr), orders (10/hr).

---

## 4. Media / storage adapter

```
Backend/src/lib/storage/{index,localDisk,s3}.js
  put(key, buffer, {contentType, visibility}) · get(key) · delete(key) · exists(key) · url(key)
```

`index.js` throws **at boot** if `STORAGE_DRIVER=s3` and any of `S3_BUCKET/S3_REGION/S3_ACCESS_KEY_ID/S3_SECRET_ACCESS_KEY/MEDIA_PUBLIC_BASE_URL` is missing — fail fast, never silently fall back to local in production.

`localDisk.url(key)` and `s3.url(key)` are **literally the same expression**: `${MEDIA_PUBLIC_BASE_URL}/${key}`. The URL shape is env-driven, not driver-driven. Under `local`, `app.js` mounts `express.static` at `/media` scoped to the `uploads/` and `derived/` prefixes — `private/` is never statically served under either driver.

**Upload pipeline:** sniff magic bytes with `file-type` (never trust client `Content-Type`) → `sha256` dedupe → `sharp` reads dimensions and strips EXIF GPS → original to `uploads/{yyyy}/{mm}/{uuid}.{ext}` → three webp variants to `derived/…-{thumb|md|lg}.webp` at 200/800/1600px → `media_assets` + `media_variants` in one transaction, rolling back storage writes on failure so there are no orphan rows.

The product serializer emits `image` and `images[]` as plain **`md` URL strings**, exactly where `null` sits today. `ImagePlaceholder.jsx` already does `{src && <img …/>}`, so the tinted tile stays as the loading/missing state and a photo appears the moment the field is non-null. **Zero changes to `ImagePlaceholder.jsx`.**

**Flipping to S3:** set the env vars, restart, run `npm run migrate:media`. It copies every key to S3 with identical keys, verifies with `exists()`, and reports. Because keys are identical and URLs are computed from `MEDIA_PUBLIC_BASE_URL`, **no database rows change**. Idempotent and re-runnable. Objects written with a bucket policy (not per-object ACLs) and `Cache-Control: immutable` — uuid keys are never overwritten.

---

## 5. Seed + unseed

```
Backend/seed/data/     copies of the storefront literals (frozen inputs, not cross-repo imports)
Backend/seed/assets/   downloaded photos, gitignored, cached after first run
Backend/scripts/       fetchSeedImages.js · seed.js · unseed.js · createAdmin.js · migrateMedia.js
```

**Images:** `fetchSeedImages.js` downloads a **curated, pinned list of photo ids** (not a random endpoint — random URLs give different images per run and make seeding non-reproducible) into `seed/assets/`, writing `ATTRIBUTION.md` with photographer and licence per file. Cached, so later runs are offline. Then sharp generates the 3 variants and the real `mediaService` uploads them through the actual pipeline — exercising sharp, variants, the storage adapter and the URL layer exactly as a live upload would.

Coverage: 30 products × 3 angles, 11 collections, 2 hero posters, 3 routine steps, 1 promo tile, 6 mega-menu columns ≈ 110 files.

**Content is realistic fake data** — the same 30 products, 11 collections, 13 pages, 8 FAQs and 4 homepage sections that are hardcoded today, so the seeded storefront should look essentially identical to the current one. That similarity *is* the regression test for the migration. Plus enough orders, customers and stock movement to make the Admin screens look like a working shop: ~40 orders spread across every status, ~15 customers, a few low-stock variants, a couple of pending bank-transfer verifications.

```
npm run seed                  # fetch images if absent, then seed
npm run seed -- --skip-media  # content only, fast
npm run unseed                # latest batch
npm run unseed -- --batch=<uuid> | --all
```

Seeding refuses to run under `NODE_ENV=production` without `--force`, runs in **one transaction**, and writes a `seed_records` row per insert. Unseed reads that ledger in **reverse sequence** (insertion order reversed is automatically FK-safe), deletes the recorded media keys from storage via the adapter, resets `order_number_seq`, and drops the ledger rows.

**Safety gate:** before deleting, unseed counts non-seed rows referencing seeded ones — a real order containing a seeded product, a real address, a real image on a seeded product. If any exist it aborts with a report and requires `--force`. That's the difference between a dev convenience and a foot-gun.

Seeded historical orders reproduce the three in `data/account.js` (`PA-10248`, `PA-10193`, `PA-10311`) with back-dated status event chains so `OrderTimeline` has something real to render, then `order_number_seq` continues from 10312 — which also kills the `Math.random()` collision in today's checkout.

---

## 6. Admin panel

**Stack:** React 19 + Vite + MUI v9 + react-router v7 + TanStack Query v5 + react-hook-form + zod + axios. **No Tailwind at all** — this deletes the unlayered-emotion-vs-`@layer utilities` hazard from `plan/00-context.md` by construction. No `!` prefixes, no `cn()` conflict traps, no third place to define colours.

**`Admin/src/theme/adminTheme.js` is written from scratch and does not import the storefront's.** `shape.borderRadius: 8`, not `999` — the storefront's value exists to make pill buttons and would turn every `Paper`, `Card`, `Menu` and `Dialog` in a dashboard into a capsule. Palette borrows the brand tokens (charcoal primary, accent secondary, sage for selected rows) so it looks like the same company; nothing else is shared.

The auth context is split across **three files** (`AuthProvider.jsx` / `authContext.js` / `useAuth.js`) from the first commit, mirroring `Customer/src/context/` — `eslint-plugin-react-refresh`'s `only-export-components` rule forces this, and retrofitting is worse.

| Route | Screen |
|---|---|
| `/` | Dashboard — today's orders, revenue 7/30d, awaiting verification, low stock |
| `/products` `/products/:id` | Table + editor tabs: Details · **Variants** · Media · Facets · Ingredients · Collections · Routine · SEO |
| `/collections` `/categories` | Tables + editors; separate Featured-cards panel (pick 4, order them) |
| `/facets` `/quiz` `/sort-and-filters` | Vocabulary management with RESTRICT guards |
| `/orders` `/orders/:id` | Table with saved views (Awaiting verification · Ready to hand over · In transit); detail with allowed-transition buttons only, timeline, payment verify/reject, courier + tracking |
| `/customers` | List, detail with orders + addresses, block/unblock |
| `/inventory` `/discounts` | Stock levels + adjustments ledger; discount CRUD |
| `/content/homepage` | The 4 fixed section cards |
| `/content/pages` `/faqs` `/navigation` `/footer` `/announcements` | CMS |
| `/media` | Grid library, upload, alt text, usage count, delete blocked when referenced |
| `/settings/*` | general · shipping · payments · tax · users · audit |

**Variant editor** (the screen the variants decision adds): define options (`Size` → `30ml, 50ml`), then a generated matrix of variants, each row carrying SKU, price, compare-at, stock and an image. Single-variant products show one row with no option columns — the common case stays one-line simple.

**Homepage editor — "fixed sections, editable fields".** Four cards in locked order, each with an enable toggle, a "Preview on site" link and an Edit form. No add-section, no reorder handle, no raw JSON textarea. Each `content` blob is validated server-side against a per-key zod schema in `Backend/src/schemas/homepage.js`, so the shape can't drift.

- **Hero** — array editor over slides (add/remove/move; reordering *within* a section is fine, reordering *sections* is what's out of scope). Per slide: `heading {text, accent}`, subheading, background media + poster, **`fallbackGradient {from, to}` as two colour pickers** (the current `'from-[#7a6a5f] to-[#3f342c]'` Tailwind class string cannot survive an admin field — and a runtime-constructed Tailwind class would never be compiled by the scanner anyway, so the component switches to an inline `linear-gradient` style), and both CTAs as `{enabled, label, target}`. **`enabled` matters:** `HeroVideoBanner.jsx` dereferences `slide.primaryCta.href` unconditionally, so a null CTA is a white screen.
- **Favorites** — two headings + the promo tile. Products are *not* picked here; they come from `product.isFavorite`, edited on the product. The form shows a per-category count with a warning when a category doesn't have exactly 3, because the 4-column row (promo tile + 3 cards) breaks otherwise — an invariant that today is only a code comment.
- **Marquee + Quiz** — marquee words, speed, eyebrow, heading, body, CTA, privacy note.
- **Routine steps** — heading + step list with optional description and CTA, plus an explicit `defaultOpenStepIndex` (currently hardcoded to "last").

**`AccentHeadingField`.** Every heading is `Plain text <Accent>italic bit</Accent>`. Stored as **`{text, accent}`** where `accent` is a substring of `text`. A new `Customer/src/components/Common/AccentText/AccentText.jsx` splits on `indexOf` and renders plain if not found. This generalises the contract `PageHero.jsx` **already implements** (`title.endsWith(accent)`, degrading to plain) from `endsWith` to `indexOf` — one function, and it makes ~30 headings consistent with the 13 pages that already work this way. Chosen over a brace-marker syntax because two plain inputs with a live preview beat teaching an escape syntax, and a typo yields a plain heading rather than broken markup. Never `dangerouslySetInnerHTML`.

**Mega-menu editor** — a 3-pane master-detail over `nav_items` (top-level → groups → links + detail). Ordering by **▲▼ buttons** calling `POST /nav-items/:id/move`, not drag-drop: no drag library, no reorder-on-drop race. Depth bounded by `kind` so the tree can't nest into something `MegaPanel`/`FlyoutPanel`/`ListPanel` can't draw. A `TargetPicker` (Collection/Product/Page/Policy/Custom) replaces hand-typed hrefs, retiring the 24 hardcoded product URLs in `megaMenu.data.js` and the dead links they cause. **This is the largest single admin screen** — budget it like the product editor. If P4 slips, ship `nav_items` seeded and the editor read-only, and finish it in P7.

**Theming is deliberately not admin-editable.** Tailwind v4 compiles `@theme{}` at build time, so runtime retinting needs CSS custom property overrides — which works for Tailwind utilities but **not** for the MUI theme, built once at import. It would also miss every arbitrary value (`from-[#7a6a5f]`, `bg-black/25`, `ImagePlaceholder`'s `TINTS`) and make `palette.js` and `index.css` into a third and fourth source of truth. Admin edits content, not colour.

---

## 7. Storefront migration — the hardest part

Tractable only because of §1. Three properties keep it small: the wire format equals the current literal; `data/catalog.js` keeps all 9 function names; and site chrome falls back to the current static config so nav/footer can never flash or fail.

**TanStack Query v5 in both apps.** The same product data is needed by Home, Collection, Product, Search, cart upsells and Quiz — a cache is not optional, and hand-rolling one ends in six in-flight `/products` requests on one page. Query also gives the uniform `isPending`/`isError` surface that doesn't exist anywhere today.

```
src/lib/api.js         fetch wrapper: VITE_API_URL, credentials:'include', unwraps {data},
                       throws ApiError {status, code, details}
src/lib/queryClient.js src/data/queryKeys.js
src/data/useCatalog.js  useAccount.js  useContent.js
```

`data/catalog.js` becomes the **fetcher** module (`fetchAllProducts`, …) and `useCatalog.js` wraps each in `useQuery` — so the file's existing promise ("a change in one file") comes true rather than becoming a lie. Per consumer the diff is one line plus an early return:

```js
const products = getAllProducts()
↓
const { data: products = EMPTY_PRODUCTS, isPending, isError } = useAllProducts()
```

`EMPTY_PRODUCTS` must be a **module-level frozen const**, not an inline `[]` — `Collection.jsx` feeds it into three `useMemo`s and a fresh literal each render would recompute facets every render.

**Loading/error pattern**, applied mechanically, matching the early-return style already in `Collection.jsx` (`if (!collection) return <NotFound/>`):

```js
if (query.isPending) return <CollectionSkeleton />
if (query.isError)   return <LoadError onRetry={query.refetch} />
```

Three new `Common/` components: `Skeleton/` (reusing `ImagePlaceholder`'s `TINTS` vocabulary so skeletons look like the site, not generic grey bars), `LoadError/` (same prop API as the existing `EmptyState` so it reads as a sibling), and `ErrorBoundary/` (the only class component in the codebase — the prose comment above it should say why).

**Hook-ordering hazard:** `Collection.jsx` runs three `useMemo`s *before* its `if (!collection)` early return, and `Product.jsx` has the same shape. Loading returns must sit **after** all hooks. Worth a comment in each.

### The six awkward spots

1. **`FavoritesShowcase.jsx:12` calls `getFavoriteCategories()` at module scope** and seeds `useState(categories[0])`. Fix by deriving instead of storing: `const activeCategory = chosen ?? categories[0]`. No effect syncing state to data, no flash of an empty pill row.
2. **JSX-valued headings** — `HeroVideoBanner.SLIDES[].heading` is literal JSX. Becomes `{text, accent}` → `<AccentText />`, same for the Favorites, Marquee and Routine headings, with `PageHero` generalising in the same commit.
3. **`SORT_OPTIONS` comparator functions** aren't serializable. API sends `{key, label, field, direction}`; `productFilters.js` gains a `COMPARATORS` module const keyed by field — exactly the hoisted-lookup-object pattern the house style already uses. Admin can add "Newest first" without a code change; it can't invent a new *field*, which is correct since that needs a column anyway. **Also fix `max: Infinity` → `null`.**
4. **`cartCopy` template functions** (`freeShippingProgress(amount)`, `savings(amount)`, `reservation(time)`) become `"Add {amount} more to get FREE shipping"` strings plus a 3-line `utils/template.js` `fill()`. Unknown placeholders render empty, so an admin typo is invisible rather than embarrassing.
5. **`data/account.js` has no seam** — six components import the raw arrays directly. Gets the `useAccount.js` seam it never had, plus mutations that finally make `AddressBook`'s inert buttons work. `orderSubtotal`/`orderTotal` are deleted (the server sends totals); `orderItemCount` survives as a two-line util. `pages/Account/Account.jsx` gains `if (!isAuthenticated) return <SignInForm />`, and the `// No auth` comment in `routes.js` gets deleted.
6. **Cart line key** — `cartLine.js:5` uses `key: product.handle`, so the same product added twice with different gift options merges and the second add's options are silently discarded. With variants it becomes `variantId` plus a gift-option suffix. **Bump `storageKey` to `pure-aura:cart:v2`** so stored v1 carts don't collide with the new scheme.

**URL filters + pagination** (in scope): filter and sort state move into the query string via `useSearchParams` — the pattern `pages/Search/Search.jsx` already uses — encoded to mirror `toggleFilterValue`'s shape (`?brand=Saje,Puff&price=7k-14k&sort=price-asc&page=2`). Facet counts stay computed over the whole collection, not the filtered set; that's deliberate and documented, and a count that changed to its own result count the moment you ticked it would read as a bug.

**Locale removal:** delete `LocaleSelect.jsx` and its usages in `AnnouncementBar.jsx` and `Footer.jsx`; drop `languages`/`regions` from settings. `currency: 'PKR'` stays in settings as the single place to change if you expand later.

---

## 8. Phases

Each is independently shippable with a verification step that works today.

**Tests: Backend only, and only enough.** Vitest + supertest, ~60 route-level integration tests against a `pure_aura_test` database. Four areas earn coverage: the **product serializer snapshot** (serialize the seeded catalog, diff against the literal from `products.js` — worth more than everything else combined), the **order state machine** (every legal transition, a sample of illegal ones, the role gates), **money** (tax-inclusive arithmetic, the CHECK constraint, free-shipping thresholds), and **auth** (refresh rotation, reuse detection, audience separation). Plus the seed/unseed round-trip. Storefront and Admin get no unit tests — component tests here would mostly assert that MUI renders, and the project shipped a full storefront without them. Verification stays `npm run lint` + `npm run build` + screenshots; extend `Customer/scripts/screenshot.js` with a `--routes a,b,c` batch flag and use its existing console-error reporting as the smoke test.

| Phase | Contents | Verify |
|---|---|---|
| **P0** Foundations | Scaffold, `env.js` (zod, throws at boot), Sequelize + umzug, all migrations, models, error handler, logging, CORS, rate limits, storage adapter (both drivers), `createAdmin.js`, `/health`, vitest harness | Migrate up → down → up cleanly on an empty DB; upload a file under `local` and fetch it at the returned URL |
| **P1** Catalog API + seed | Catalog/collection/facet/variant/quiz endpoints, product serializer, `fetchSeedImages.js`, `seed.js`, `unseed.js` | Serializer snapshot passes against `products.js`; `curl /api/products \| jq` diffs clean; seed → unseed → seed gives an identical content hash; unseed refuses when a real order references a seeded product |
| **P2** Storefront → API | TanStack Query, `lib/api.js`, `useCatalog.js`, skeletons, `LoadError`, `ErrorBoundary`, all 9 catalog consumers, comparator descriptors, `Infinity` fix, `FavoritesShowcase` fix, URL filters + pagination | **Screenshots captured before this phase, re-captured after, compared by eye** — identical except real photos now fill placeholder tiles. Lint + build clean, zero console errors. Kill the API: every page shows `LoadError`, not a blank screen |
| **P3** Admin shell + catalog | Admin scaffold, `adminTheme.js`, auth + refresh interceptor, `AdminLayout`, `DataTable`, `MediaLibrary`/`MediaPicker`, products + **variant matrix**, collections, categories, media, audit log | Sign in; upload a photo to a product; refresh the storefront and see it. Create a draft product, confirm it stays invisible publicly. Confirm no MUI `Paper` renders as a capsule |
| **P4** CMS | Homepage sections + 4 forms + `AccentText`, static pages (collapsing `CUSTOM_PAGES`), FAQs, nav tree + 3-pane editor + `TargetPicker`, footer, announcements, settings, socials, locale removal. Storefront `/bootstrap` with static config as `initialData` | Change a hero heading's accent word, reload, see it. Disable a section, confirm it vanishes cleanly. Stop the API: header/footer still render from fallback. Archive a product in the mega menu: the link disappears rather than 404s |
| **P5** Customer accounts | Register/login/refresh/reset, `AuthProvider`, `SignInForm`, `useAccount.js`, 6 account consumers, addresses CRUD, admin customers screens. Do the global MUI `borderRadius` override commit here (`plan/02` §8.5's fourth-override rule) | Register → sign in → add an address → set default → refresh and stay signed in → sign out → `/account` shows sign-in. A customer token is rejected by `/api/admin/*` |
| **P6** Checkout + orders | `POST /orders`, lifecycle + events + transition matrix, COD + bank transfer + proof + verification queue, couriers + tracking, `PaymentStep` split, `config/orders.js`, `OrderTimeline`, `OrderConfirmed` via access token, cart key fix, tax-inclusive totals, the Rs 14 fix | Place a guest COD order → appears in Admin → walk it to `handed_to_courier` (blocked until courier + tracking set) → `delivered` → payment auto-flips to `paid` → refresh the confirmation page and it still resolves. Bank transfer: upload proof → verify → order advances and appears in `/account/orders` with a timeline. Illegal transition via curl returns `422` with the allowed set |
| **P7** Inventory, discounts, vocabularies | `inventory_holds` + `inventory_moves` + real reservation, discount engine + `OrderSummary` discount row, facet/value admin with RESTRICT guards, quiz editor, sort options, price ranges, `cart_copy` templates, tax rates, payment + flag settings screens | Add to cart → a hold row appears → let it expire → stock frees and a ledger row is written. Two browsers race the last unit; one fails cleanly with `422`. Delete a quiz-referenced facet value → `409` naming the question. Add a "Newest first" sort in Admin → it appears in `SortSelect` and sorts |
| **P8** Hardening + S3 | `migrateMedia.js`, S3 driver against a real bucket, transactional email (order confirmation, shipped, proof verified, password reset), backups, security headers, `robots.txt` on Admin, deployment docs | Flip `STORAGE_DRIVER=s3`, migrate, confirm every image loads from S3 with **zero DB rows changed** (diff `media_assets` before/after). Flip back to `local` and it still works |

**P2 is the risky phase** — every page's render path changes at once. Capture the full screenshot set *before* starting, ship it as one PR rather than incrementally (half-async is worse than either end), and make sure P1's serializer snapshot is green first.

---

## 9. Open items

**Assumptions I'm proceeding on** — tell me if any is wrong:

1. **GST rate: 18%, tax-inclusive.** You chose tax-included pricing; the rate itself wasn't specified. Seeded as a `tax_rates` row you can change in Admin, and the arithmetic is rate-agnostic.
2. **Express delivery: Rs 2,500.** Placeholder replacing the `14.0` bug. Your real figure goes in the seed.
3. **Reservation window stays 10 minutes**, now backed by real holds.
4. **No email until P8.** This means password reset in P5 is half-built — either pull SMTP forward into P5, or accept admin-initiated resets in between. Worth deciding before P5.
5. **Deployment shape unknown.** Three separate deployments, or does the Backend also serve the built storefront and Admin bundles? This affects CORS and cookie config, so it's cheapest to answer at P0.

**Known risk:** `FavoritesShowcase` assumes exactly 3 favourites per category to fill its 4-column row. Admin can now break the homepage by unfavouriting one product. Mitigated by a warning in the form; consider making the grid tolerate 1–4 instead.
