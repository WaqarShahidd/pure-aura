# Pure Aura — Project Setup & Homepage Plan

Source reference: Shopify "Eurus" theme demo (beauty/skincare preset). All "Eurus" branding is
replaced with **Pure Aura** throughout (wordmark, copyright, alt text, config values, etc.).

This plan covers project scaffolding, shared layout (header/footer), theming, and the homepage
sections identified so far from the screenshots provided. It will be extended/updated as more
screenshots are shared and reviewed.

## 1. Tech Stack

- **Vite + React** — SPA, `.jsx` files (no TypeScript)
- **React Router v6** — client-side routing between pages
- **MUI (Material UI)** — themed component primitives (buttons, text fields, menus/dropdowns,
  drawers for mobile nav)
- **Tailwind CSS** — layout/spacing/utility classes on top of MUI
  - `corePlugins.preflight: false` so Tailwind doesn't clobber MUI's CSS baseline
  - Tailwind config reads the same design tokens as the MUI theme (single source of truth)

## 2. Folder Structure

```
src/
  pages/
    Home/
      Home.jsx
    (About/, Collections/, Product/, Contact/, ... added as new screenshots/pages arrive)

  components/
    Common/
      Button/            MUI Button wrapper incl. pill variant
      Input/             MUI TextField wrapper (newsletter, search)
      SectionHeading/    Mixed sans + italic-serif accent-word heading
      Marquee/           Infinite scrolling text banner
      ScrollToTop/       Floating "up arrow" button (persists across all pages)
      ProductCard/       Image, badge, rating, price/compare-price, cruelty-free tag
      RatingStars/
      Badge/             "Best Seller" / "Sale" pills
      CategoryPills/     Filter tabs (e.g. Saje Kits / Lipstick / Make Up)
      NewsletterBar/     "Subscribe to get 10% off" band (lives in footer)
    Home/
      HeroVideoBanner/   Dual background video, prev/next control, headline + CTAs
      FavoritesShowcase/ Sage banner + filterable product grid (section 2)
      MarqueeQuizBanner/ Scrolling marquee + quiz CTA block (section 3)
      RoutineSteps/      Image + numbered accordion steps (section 4)

  layout/
    Layout.jsx           Wraps every page: AnnouncementBar + Header + <Outlet/> + Footer
    Header/
      Header.jsx
      AnnouncementBar.jsx  Promo carousel bar, socials, language/currency selectors
      NavDropdown.jsx      Dropdown menu (Best Sellers / Collections / Templates / Presets / B2B)
    Footer/
      Footer.jsx           NewsletterBar + 4-column links + bottom bar (locale, copyright, payment icons)

  theme/
    palette.js            Sage / cream / charcoal / orange-accent color tokens
    typography.js         Sans family + italic serif accent family, type scale
    muiTheme.js            createTheme() consuming palette.js + typography.js
    global.css             Tailwind directives, @font-face imports, minimal resets
  (tailwind.config.js at project root imports palette/typography tokens from theme/)

  config/
    site.js               Brand name "Pure Aura", tagline, social URLs, currency/language options
    navigation.js          Header nav + dropdown items
    footerLinks.js         Customer Care / Company link lists
    routes.js              Path constants shared by React Router + Header/Footer links

  utils/
    useScrollPosition.js   Header transparent → solid transition on scroll
    useMediaQuery.js
    formatPrice.js
    classNames.js          Conditional Tailwind class helper

  App.jsx                  Router setup, wraps routes in Layout
  main.jsx
```

### Conventions
- Every `pages/X` folder has a matching `components/X` folder. Page files stay thin — they compose
  section components and pass in config/data. All markup/logic lives in `components/X/*`.
- `components/Common/` only holds components reused across ≥2 pages or used by the layout.
  Page-specific pieces stay under that page's own component folder.
- Color/typography/spacing tokens are defined once in `theme/` and consumed by **both**
  `muiTheme.js` and `tailwind.config.js` — never duplicated.
- Copy, links, and nav structure live in `config/`, not hardcoded inline in JSX.

## 3. Shared Layout (built once, used everywhere)

### Announcement Bar
- Dark background, prev/next carousel arrows
- Rotating promo message + pill CTA (e.g. "LIMITED COLLECTION UNLOCKED" / "SHOP NOW")
- Social icons (X, Facebook, Pinterest, Instagram)
- Language selector + Country/currency selector (dropdowns)

### Header
- "Pure Aura" wordmark (styled like the reference's lowercase wordmark + accent dot)
- Nav items with dropdowns: Best Sellers (with sparkle icon), Collections, Templates, Presets,
  B2B Features
- Right-aligned icons: search, account, cart
- Transparent-over-hero on homepage load; solid white background once scrolled or on inner pages
  (via `useScrollPosition`)

### Footer
- **Newsletter band**: sage background, "Subscribe to *get 10% off*." heading (italic serif accent),
  supporting line, email input + "Submit" button
- **4-column link grid**:
  1. Pure Aura brand blurb
  2. Customer Care (Shipping Policy, Privacy Policy, Return & Refund, Terms & Conditions, FAQs)
  3. Company (About us, Book a Treatment, Promotion programs, Our Promises, Contact)
  4. Find us on (Twitter/X, Facebook, Pinterest, Instagram — icon + label)
- **Bottom bar**: language/currency selectors, "© 2026, Pure Aura. Powered by Shopify"-style
  copyright, payment method icons (Visa, Mastercard, Amex, PayPal, Diners, Discover)

### Scroll-to-top button
- Floating circular button, bottom-right, visible on scroll, present on every page

## 4. Homepage Sections (from screenshots received so far)

### Section 1 — Hero
- Full-bleed **video background** (two videos available; prev/next arrow control bottom-right with
  a small thumbnail preview of the next video)
- Bottom-left aligned text block: large headline mixing sans + italic serif accent word
  (e.g. "Your skin. *Glowing*.")
- Supporting subheading line
- Two pill CTAs: outline ("Find my Match") + solid white ("Shop All")
- Dark gradient/overlay for text contrast over video

### Section 2 — Favorites Showcase
- Sage-colored banner strip above the grid with a playful heading mixing text and inline
  icons/images (e.g. "Own your 💄 *Glow*. Feeling confident in the skin you're 🌿 in.")
- "Our *favorite*." section heading
- Category filter pills (e.g. Saje Kits / Lipstick / Make Up)
- Product grid: one large featured product tile + 3 product cards, each with:
  - Optional badge ("Best Seller", sale %)
  - Cruelty-free tag
  - Title, star rating + review count
  - Price (with strikethrough compare-at price when discounted)

### Section 3 — Marquee + Quiz
- Infinite horizontal **marquee** banner on an olive background — outlined/hollow text style,
  alternating filled/outline words (e.g. ORGANIC / AWARD-WINNING / PLANT-POWERED)
- Centered quiz CTA block: eyebrow text ("2 minutes · 4 questions"), heading
  ("Find Your Ultimate Glow Routine"), supporting copy, "Start the Quiz" button, privacy note link

### Section 4 — Routine Steps
- "How to take care for *glowing skin*." heading (italic serif accent)
- Split layout: large lifestyle/product image (left) + vertical numbered step list (right)
  - Steps (e.g. Cleansers / Serums / Toners), each with a small round thumbnail
  - Active/expanded step shows description copy + a CTA button (e.g. "Shop Toners")

## 5. Build Workflow

1. Scaffold the Vite + React project with the folder structure above.
2. Set up Tailwind + MUI theme wiring (palette, typography, `muiTheme.js`, `tailwind.config.js`).
3. Build `config/` data files (site info, nav, footer links, routes) with Pure Aura branding.
4. Build shared `layout/` — AnnouncementBar, Header (incl. dropdowns), Footer (incl. newsletter
   band), ScrollToTop.
5. Build `Home.jsx` and its four section components in order (Hero → Favorites → Marquee/Quiz →
   Routine Steps), using placeholder/stock media where real assets aren't provided yet.
6. Run the dev server after each major section to visually check against the reference screenshots.
7. As additional screenshots are shared (new sections, new pages, mobile views), extend this plan
   with a new numbered `.md` file in `plan/` before implementing, per your instruction — every future
   planning request creates a new `.md` file in this folder for review before implementation.

## 6. Open Items / Assumptions to Confirm Later
- Exact Pure Aura wordmark styling (lowercase + accent dot like reference, or different treatment)
- Real product data/images vs. placeholders for initial build
- Whether hero videos are provided assets or need stock placeholders initially
- Mobile/responsive behavior for header nav (drawer vs. accordion) — to be detailed once a mobile
  screenshot is provided
