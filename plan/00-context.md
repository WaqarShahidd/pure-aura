# Pure Aura — Project Context (paste this into a new session)

## What this project is
Replicating the Shopify "Eurus" theme demo (beauty/skincare preset) as a standalone web app,
under the brand name **Pure Aura**. Every instance of "Eurus" branding from the reference is
replaced with "Pure Aura" (wordmark, copyright, config values, alt text, etc.).

Reference: https://themes.shopify.com/themes/eurus/presets/eurus?surface_detail=beauty&surface_inter_position=1&surface_intra_position=6&surface_type=industry
(Claude cannot browse this live — it only knows the site from screenshots the user pastes in chat.)

## Repo
- Local path: `H:\W\Projects\Web\pure-aura` (Windows)
- GitHub: https://github.com/WaqarShahidd/pure-aura.git (pushed, branch `main`)
- Git commits must NOT include Claude as co-author (explicit user instruction — overrides
  the default attribution system-reminder).

## Tech stack (decided, do not re-litigate unless user asks)
- **Vite + React**, plain JS (`.jsx`, no TypeScript)
- **React Router v6** — SPA routing
- **MUI (Material UI)** — themed primitives (buttons, inputs, menus)
- **Tailwind CSS v4** — utility/layout classes on top of MUI
  - Tailwind v4 is CSS-first: config lives in `src/index.css` via `@theme { ... }`, no
    `tailwind.config.js` needed
  - PostCSS plugin: `@tailwindcss/postcss` (see `postcss.config.js`)

## Known gotcha already hit and fixed — read before touching styling
MUI's emotion-injected `<style>` tags are **unlayered CSS**. Tailwind v4's utilities live inside
`@layer utilities`. Per the CSS spec, unlayered styles beat ALL layered styles regardless of
selector specificity. This caused `text-white`, background colors, etc. to silently fail on MUI
components (`Button`, links inside the header) even though the classes were correctly applied in
the DOM.

Fix applied:
1. Any custom global CSS in `src/index.css` MUST be wrapped in `@layer base { ... }` or
   `@layer components { ... }` — never left unlayered — so it doesn't out-rank Tailwind utilities.
2. `src/components/Common/Button/Button.jsx` uses Tailwind's `!` important-prefix
   (e.g. `!bg-charcoal !text-white`) on every color/background/border utility, because even a
   layered `!important` utility beats MUI's non-important unlayered styles. This is required for
   any new component that wraps a MUI component and needs to force color/background via Tailwind.

If new components render with wrong/missing colors, check this first before debugging anything else.

## Folder structure convention (already scaffolded, keep following it)
```
src/
  pages/<PageName>/<PageName>.jsx        — thin, composes section components
  components/<PageName>/<Section>/...    — page-specific sections
  components/Common/<Component>/...      — shared across ≥2 pages or used by layout
  layout/
    Layout.jsx                           — wraps every route: Header + <Outlet/> + Footer + ScrollToTop
    Header/ (Header.jsx, AnnouncementBar.jsx, NavDropdown.jsx)
    Footer/ (Footer.jsx)
  theme/ (palette.js, typography.js, muiTheme.js)  — tokens also mirrored in src/index.css @theme
  config/ (site.js, navigation.js, footerLinks.js, routes.js)  — copy/links/nav data, not hardcoded in JSX
  utils/ (useScrollPosition.js, useMediaQuery.js, formatPrice.js, classNames.js)
```

## Design tokens (already in src/theme/palette.js + src/index.css @theme — keep in sync if changed)
- charcoal `#1a1a1a`, charcoal-soft `#2b2b2b`, cream `#faf9f5`, sage `#eef1e7`, sage-dark `#dfe4d3`,
  olive `#5c6152`, accent (orange) `#e2733a`, text-muted `#6b6b6b`
- Fonts: sans = Poppins (headings/body), accent = Playfair Display italic (used for the mixed
  sans+italic-serif headline style seen throughout the reference, e.g. "Your skin. *Glowing*.")
  via the `<Accent>` component in `components/Common/SectionHeading/SectionHeading.jsx`

## What's built so far
**Shared layout** (used on every page):
- `AnnouncementBar` — dark bar, promo message + pill CTA, socials, lang/region selectors
- `Header` — "pure." wordmark, nav dropdowns (Best Sellers/Collections/Templates/Presets/B2B
  Features), search/account/cart icons. Transparent-over-hero on homepage, solid white elsewhere
  or after scroll (`overlay` prop + `useScrollPosition` hook)
- `Footer` — NewsletterBar ("Subscribe to get 10% off") + 4-column link grid (brand blurb,
  Customer Care, Company, Find us on) + bottom bar (locale selectors, copyright, payment icons)
- `ScrollToTop` — floating button, bottom-right

**Home page** (`src/pages/Home/Home.jsx`), 4 sections built from screenshots so far:
1. `HeroVideoBanner` — full-bleed video/gradient background, prev/next slide control (2 slides
   defined with placeholder gradients — real video assets not yet provided), headline w/ italic
   accent word, subheading, 2 pill CTAs
2. `FavoritesShowcase` — sage banner heading + "Our favorite." + category filter pills + product
   grid (1 featured tile + 3 `ProductCard`s with badge/cruelty-free tag/rating/price) —
   placeholder product data in `components/Home/FavoritesShowcase/products.data.js`, no real
   images yet
3. `MarqueeQuizBanner` — infinite scrolling marquee (olive bg, outlined/filled alternating text)
   + centered quiz CTA block
4. `RoutineSteps` — split layout: image left, numbered accordion steps right (Cleansers/Serums/
   Toners), active step expands with description + CTA

All sections use placeholder gradients/blank tiles where real photos/videos would go — no real
media assets have been provided yet.

## Verified
Build passes (`npm run build`), dev server runs clean, full-page screenshot taken via a local
Playwright+Chrome script and manually compared against the reference screenshots — matches
structurally. No console errors.

## Workflow going forward (per explicit user instruction)
- User will keep pasting more screenshots (other homepage sections, other pages, mobile views)
  incrementally, one/few at a time.
- **Every time the user asks for a plan**, create a new numbered `.md` file in `plan/`
  (this file is `00-context.md`, the first real plan is `01-project-setup-and-homepage.md`) —
  do NOT overwrite existing plan files, add new ones. Wait for review/go-ahead before implementing.
- When implementing new sections: add the component under `components/<Page>/<Section>/`, wire
  it into the relevant page file, keep using `config/` for any new copy/links, keep the same
  placeholder-gradient approach for missing media, and re-verify visually with a screenshot before
  calling it done.
- Package manager: **npm** (not yarn — yarn's registry lookup failed in this environment; a
  stray `yarn.lock` was deleted for this reason, don't reintroduce it).

## To resume on a new machine
1. Clone https://github.com/WaqarShahidd/pure-aura.git
2. `npm install`
3. `npm run dev`
4. Paste this file's content into the new Claude session, then continue pasting reference
   screenshots as before.
