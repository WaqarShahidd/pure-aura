# Pure Aura — Mega-menu, Collection page, PDP & Cart drawer

## Context

Pure Aura replicates the Shopify "Eurus" beauty theme demo as a standalone React app. Four
homepage sections and the shared layout exist and are committed. Seven new reference screenshots
cover four features that have **no implementation at all** today:

1. **Mega-menu dropdowns** — full-width panels. Collections has a left sidebar of "Shop by…"
   categories plus image columns; Templates is a two-level flyout. Today `NavDropdown.jsx` is a
   plain MUI `Menu` with a flat list.
2. **Collection / Products listing page** — breadcrumb, title, category image cards, a filter bar
   with 10 filter dropdowns + swatch filters + sort + list/grid toggle, and a 5-column grid.
3. **Product detail page** — gallery, price, gift wrap/gift card, file dropzone, qty + add-to-cart,
   pickup info, ingredient-bar accordion, cross-sell row.
4. **Cart drawer** — reservation countdown, free-shipping meter, line items, share/note/discount,
   totals with savings, payment logos, upsell rail.

Outcome: a browsable storefront — homepage → collection → product → cart — with a working
client-side cart and functional filtering, still on placeholder media until the admin panel lands.

### Decisions already made with the user
- **Phased**, reviewed after each phase.
- **Real client-side cart**: Context + localStorage, working add-to-cart, header badge.
- **Functional filters/sort/view toggle** over ~30 mock products.
- **Header matches the reference**: announcement bar always visible; header forced solid while a
  mega-menu is open; transparent-over-hero otherwise.
- **Templates/Presets/B2B get Pure Aura-appropriate copy**, keeping the reference's two-level
  flyout structure and column counts.
- **Payment logos as `<symbol>` entries in `public/icons.svg`**, referenced with `<use>`.
- **Placeholder tiles vary tint per product** (hashed from the handle).

> Per `plan/00-context.md`, implementation also starts by committing this as `plan/02-menu-collection-product-cart.md`.

---

## Conventions this must honour

- **MUI emotion CSS is unlayered and beats Tailwind's `@layer utilities`.** Any MUI wrapper needs
  the `!` prefix on color/bg/border utilities (see `src/components/Common/Button/Button.jsx`), or
  `sx`. Non-MUI elements use no `!`.
- **`shape.borderRadius: 999` is global** in `src/theme/muiTheme.js` — every MUI `Paper`
  (Drawer/Menu/Popover/Accordion) renders as a capsule unless locally overridden. The plan
  hand-rolls almost everything to dodge this; only `Drawer` earns its MUI dependency.
- Containers: `mx-auto max-w-7xl px-6 py-16 md:px-10`. Full-bleed bands: `bg-sage px-6 py-14 md:px-10`.
- Breakpoints `md:`/`lg:` only. Radius `rounded-2xl` tiles, `rounded-full` pills.
- Headings via `SectionHeading` + `Accent`; prices via `formatPrice`; classes via `cn` (**no**
  conflict resolution — emit exactly one of two conflicting classes, never both).
- Copy/links live in `src/config/`.

---

## 1. Data layer — `src/data/`

**`products.js`** — ~30 records. `id === handle` (kebab slug), so `<ProductCard key={p.id} {...p} />`
in `FavoritesShowcase` keeps working untouched.

```
handle, title, subtitle, description, vendor, badge|null, crueltyFree,
rating, reviewCount, price, compareAtPrice|null,
image: null, images: [null,null,null], inStock, stockLabel, variantSummary,
ingredients: [{ name, percent }], ingredientNote,
// facets — one per filter pill in the screenshot
availability, tags[], color, colorHex, brand, skinType[], size, texture,
collectionFilter, ingredientFilter[],
// merchandising
collections[], category, isFavorite, isUpsell, routineWith[]
```

Every facet value must appear **at least twice**, or a filter checkbox yields a one-item grid and
looks broken. Give each of the 3 homepage categories exactly 3 `isFavorite` products so the
`md:grid-cols-4` row never goes ragged.

**`collections.js`** — `{ handle, title, description, image: null, cardLabel }` plus
`featuredCollectionCards` (the 4 cards atop the listing page).

**`catalog.js`** — accessors, keeping `products.js` a pure literal:
`getAllProducts`, `getProductByHandle`, `getProductsByCollection`, `getFavorites`,
`getUpsells(excludeHandles)`, `getRoutineProducts`, `getProductsByCategory`.

**`megaMenu.data.js`** — the bulky column/link data, imported by `config/navigation.js`.

`src/config/routes.js`: keep `ROUTES` as-is (nav + footer depend on it), **append**
`ROUTE_PATTERNS`, `collectionPath(handle)`, `productPath(handle)`. Sweep `navigation.js` off
template literals onto the builders.

---

## 2. Cart — `src/context/`

Three files, because `reactRefresh.configs.vite`'s `only-export-components` flags a `.jsx`
exporting both a provider and a hook:
`cartContext.js` (createContext only) · `CartProvider.jsx` (reducer + persistence) · `useCart.js`.

State: `{ items[], isOpen, reservedUntil, note, discountCodes }`. Line items key off `handle` and
**snapshot `price`/`compareAtPrice` at add time**, plus `giftWrap`/`giftCard`/`giftMessage`.

Actions: `ADD_ITEM` (merges by key, sets `reservedUntil` if null, opens drawer), `REMOVE_ITEM`,
`SET_QUANTITY` (≤0 removes), `SET_LINE_OPTION`, `CLEAR_CART`, `OPEN/CLOSE/TOGGLE_DRAWER`,
`SET_NOTE`, `APPLY/REMOVE_DISCOUNT`, `RESET_RESERVATION`.

Derived in the provider via `useMemo`, never stored: `count`, `subtotal`, `compareSubtotal`,
`savings`, `remainingForFreeShipping`, `shippingProgress`.

Persistence: key `pure-aura:cart:v1`. **Hydrate lazily** via
`useReducer(reducer, undefined, loadInitialCart)` — not an effect — to avoid a StrictMode empty-cart
flash and an initial write that clobbers storage. `loadInitialCart` try/catches `JSON.parse`,
validates `Array.isArray(parsed.items)`, and force-sets `isOpen: false`. Persist on
`[items, note, discountCodes, reservedUntil]` — **not** `isOpen`.

Provider goes in `src/main.jsx` inside `ThemeProvider`, outside `App` (not in `Layout`, which is a
route element). Drawer visibility lives in cart state so a `ProductCard` deep in a grid can open it
without callback threading.

`src/config/cart.js` holds `freeShippingThreshold: 100`, `reservationMinutes: 10`, and drawer copy.

---

## 3. Mega-menu — hand-rolled, not MUI `Menu`

MUI `Menu` is wrong here: its Paper inherits `borderRadius: 999`; it portals to document root and
positions by transform off an anchor, so a full-viewport-width panel means overriding
`anchorReference`/`marginThreshold`/`PaperProps` until you've hand-rolled it anyway; it traps focus
(`NavDropdown` already passes `disableEnforceFocus`/`disableAutoFocus` to fight this); and nested
portalled menus make the two-level flyout's mouse-travel problem much harder.

**Key positioning insight:** `<header>` is `absolute` on home and `relative` elsewhere — *both are
positioned*, so it is already a containing block, and it is `w-full` in both modes. A child with
`absolute left-0 top-full w-full` lands exactly at the bottom edge of the header **including** the
announcement bar, full-bleed. No portal, no measurement, no `useLayoutEffect`.

State lifts from `NavDropdown` up to `Header`: one `openLabel` guarantees a single open panel, makes
cross-item hover instant, and feeds `transparent = overlay && !scrolled && !openLabel`.

Close intent: a ~120ms `setTimeout` in a `useRef`, cancelled by `onMouseEnter` on nav or panel —
without it the gap between nav row and panel closes the menu mid-travel. Also close on `Escape`,
route change, and any link click. Triggers are `<button>`s with `aria-expanded`/`aria-haspopup`
and an `onClick` toggle, so touch and keyboard work without hover.

Backdrop: `fixed inset-0 z-30 bg-black/20`, below the header.

**Nav config gains a `layout` discriminator** — `'mega'` (Collections: `groups[]` each with
`label`, `allLinks[]`, and `columns[]` of `{ heading, href, image, links[] }`), `'flyout'`
(Templates: `panels[]` each with `label` + `links[]`), `'list'` (keeps today's `children`), `'link'`.
Default to `'list'` when `children` exists, else `'link'`.

Per the user's decision, Templates/Presets/B2B keep the reference's **structure** (two-level flyout,
same column counts, ~11 links in the second panel) with **skincare-appropriate labels** — routines,
skin concerns, bundles — not "Product with quick order list".

Components under `src/layout/Header/`: `NavBar`, `NavItem` (trigger only), `MegaPanel`,
`FlyoutPanel`, `ListPanel`, `MobileNav`. **`NavDropdown.jsx` is deleted.**

> **`ListPanel` positioning exception:** mega and flyout panels render at header level (full width);
> list panels must anchor under their own item, so they render *inside* a `relative` `NavItem`
> wrapper. Two render sites driven by the discriminator — handle this explicitly.

**Mobile nav** (none exists today): MUI `Drawer anchor="left"` with
`slotProps={{ paper: { sx: { borderRadius: 0, width: 320 } } }}`, containing a hand-rolled accordion
(**not** MUI `Accordion` — Paper-based, inherits the capsule radius). Hamburger `className="lg:hidden"`,
matching the nav's existing `lg` breakpoint.

---

## 4. Filter engine — config-driven, not 10 bespoke components

`src/config/filters.js`: `FILTER_DEFS` — ten one-line entries of
`{ id, label, field, type: 'list'|'swatch'|'range', swatchField? }`; plus `SORT_OPTIONS` (each with
a `compare` fn), `DEFAULT_SORT`, `PRICE_RANGES`. `type` drives only row rendering, not logic.

`src/utils/productFilters.js` — pure, no React:
```js
const valuesOf = (p, field) => { const v = p[field]; return Array.isArray(v) ? v : v == null ? [] : [v] }
buildFacets(products, defs)      // -> { color: [{ value, count, swatch }], … }
applyFilters(products, active, defs)  // AND across defs, OR within one
sortProducts(products, sortId)   // returns a copy
countActive(active)
```

**Facet counts are computed over the whole collection, not the filtered set** — so a count doesn't
change to its own result count when you check it. Comment this.

UI: `FilterBar` (hide/show + live count + view toggle + sort) → `FilterPills` → one generic
`FilterPill` whose open panel is hand-rolled (`rounded-2xl border border-charcoal/15 bg-white
shadow-lg`, `relative` wrapper, `z-20`), rendering rows per `def.type`.

State lives in `Collection.jsx`: `active`, `sortId`, `view`, `filtersOpen`, with
`base`/`facets`/`results` memos. Reset `active` when `handle` changes.
Optional follow-up once verified: mirror into `useSearchParams` for linkable filtered views.

Show the **real `results.length`**, never the reference's hardcoded "217".

---

## 5. File tree

**New — commons** (`src/components/Common/`): `PriceTag` (extracted from `ProductCard`, reused in
PDP/cart/upsells), `QuantityStepper`, `ProgressBar` (free-shipping meter *and* PDP ingredient bars),
`Breadcrumb`, `Accordion` (hand-rolled), `PaymentIcons`, `ImagePlaceholder`, `EmptyState`.

**New — pages/sections**, following `pages/X` ↔ `components/X`:
- `pages/Collection/Collection.jsx` + `components/Collection/{CollectionHero, CategoryCards, FilterBar/{FilterBar,FilterPills,FilterPill}, ProductGrid}`
- `pages/Product/Product.jsx` + `components/Product/{ProductGallery, ProductSummary, ProductOptions, FileDropzone, ProductPurchase, PickupInfo, MoreDeals, IngredientBars, ProductAccordions, RoutineRow}`
- `pages/Cart/Cart.jsx` + `components/Cart/{CartDrawer, CartHeader, ReservationBanner, FreeShippingMeter, CartLineItem, CartActions, CartTotals, CartUpsells}`
- `pages/NotFound/NotFound.jsx`

**New — other:** `src/data/*`, `src/context/*`, `src/config/{cart,filters,productPage}.js`,
`src/config/socialIcons.jsx` (de-dupes the map copied in `AnnouncementBar` + `Footer`),
`src/utils/{productFilters,useCountdown,useScrollToTopOnRouteChange}.js`.

**Modified:** `main.jsx` (+CartProvider) · `App.jsx` (+5 routes incl. `*`) · `Layout.jsx`
(+scroll reset, +`<CartDrawer/>`) · `Header.jsx` · `AnnouncementBar.jsx` · `Footer.jsx` ·
`routes.js` · `navigation.js` · `site.js` · `ProductCard.jsx` · `Button.jsx` ·
`FavoritesShowcase.jsx` + `products.data.js` · the three Home sections using `Button href`.

**`public/icons.svg`**: add `<symbol>` entries for Visa/Mastercard/Amex/PayPal/Diners/Discover;
`PaymentIcons` renders `<use href="/icons.svg#visa" />`.

---

## 6. Changes to existing components

**`ProductCard` — additive only, no breaking change.** New optional props appended:
`handle` (wraps *media tile and title only* in `<Link to={productPath(handle)}>` — not the whole
card, or the quick-add button inside would navigate), `variantSummary`, `layout = 'grid'|'list'`,
`showQuickAdd = false`, `className`. The existing `{...product}` spread keeps working and homepage
cards become linked for free. Quick-add calls `useCart()` **inside** `ProductCard` rather than
threading `onAddToCart` down through every grid.

**`Button`** gains a `to` prop → `component={RouterLink}`; `href` stays for external links. Sweep
the 4 existing `href` call sites (HeroVideoBanner ×2, RoutineSteps, MarqueeQuizBanner).

**`Header`** — always render `<AnnouncementBar />` (it has its own opaque `bg-charcoal`, so it reads
correctly over the hero). The white bg/shadow moves off `<header>` onto a **new full-width wrapper**
around the `max-w-7xl` container — putting it on the container itself would render a centered white
box, not a full-bleed bar. Cart icon becomes a `<button onClick={openCart}>` with a count badge;
`/cart` stays reachable via the drawer's "View Cart".

**`Footer`/`AnnouncementBar`** — internal `<a href>` → `<Link to>`, socials stay `<a target="_blank"
rel="noreferrer">`, shared `SOCIAL_ICONS`, text payment pills → `<PaymentIcons />`.

**`FavoritesShowcase`** — read from `getFavorites()` and actually filter by `activeCategory`,
closing the "holds state but never filters" gap.

---

## 7. Phase order

Each step leaves the app runnable and screenshot-able.

**Phase 0 — foundations** (nothing visible changes): route builders → `data/*` → re-point
`FavoritesShowcase` → `Button to` + sweep → scroll reset → register all routes against stub pages.

**Phase 1 — header/mega-menu**: extract social icons (no visual change) → header restructure
(always-on bar, bg wrapper) → `layout` discriminator + `NavItem`/`ListPanel`, delete `NavDropdown`
→ `openLabel` lifting + close-intent + Escape + backdrop + force-solid → `MegaPanel` → `FlyoutPanel`
→ `MobileNav`.

**Phase 2 — collection page**: commons → hero + category cards + plain grid → filter config +
pure engine → `FilterPill` → wire filtering → sort + hide/show + live count → list/grid toggle.

**Phase 3 — PDP**: commons (extract `PriceTag` out of `ProductCard` in the same step) → gallery +
summary, unknown handle → NotFound → options → dropzone (filename in local state, 25MB validation,
no upload target) → purchase → pickup + deals → ingredient bars + accordions → routine row.

**Phase 4 — cart**: context + provider (verify StrictMode doesn't double-add) → header badge →
wire PDP add-to-cart → drawer shell + line items + totals → countdown + shipping meter → actions →
upsells → payment icons + `/cart` page → quick-add on the grid.

---

## 8. Risks and gotchas

1. **"Pages are thin, zero state" cannot survive Phase 2.** `Collection.jsx` must own filter/sort
   state; `Product.jsx` must own `useParams` + the not-found branch. Amend the convention in
   `plan/00-context.md` to *"pages own routing-derived and cross-section state, but no markup beyond
   composing sections"* — otherwise a future session will "fix" it back.
2. **z-index ladder.** `ScrollToTop` is `z-50` and would paint over a mega-menu panel inside a `z-40`
   header (stacking context — raising the panel alone won't help). Fix: bump `<header>` to `z-50`
   and `ScrollToTop` to `z-40`. MUI Drawer's default 1200 stays above both.
3. **`cn()` has no conflict resolution.** For `ProductCard`'s `layout` ternary and `FilterPill`'s
   active state, emit exactly one of two conflicting classes — never both, expecting the later
   string position to win. It doesn't; stylesheet order decides.
4. **Hand-roll `ProgressBar` and checkboxes** rather than MUI `LinearProgress`/`Checkbox` — ~10 lines
   each, no `!` prefix needed, and they dodge `borderRadius: 999` entirely.
5. **Track local `borderRadius: 0` overrides.** At the fourth one, switch to global
   `MuiDrawer`/`MuiMenu`/`MuiPopover`/`MuiDialog`/`MuiAccordion`/`MuiPaper` overrides in one
   deliberate commit rather than scattering them.
6. **Route-change scroll reset must use `behavior: 'auto'`**, not `'smooth'`, and must skip
   search-string-only changes — otherwise applying a filter yanks the user back to the breadcrumb.
7. **Animate `background-color`, not `height`**, on the header state change, or the panel's
   `top-full` anchor jitters.
8. **`useCountdown` must clear its interval** in cleanup, or StrictMode leaves two timers ticking
   at 2× speed.
9. **Facet counts will read "(3)" not "(186)"** — correct behaviour against 30 products, not a bug.
10. **Authoring 30 × ~25 fields is the largest mechanical chunk here.** Generate in one pass, then
    sanity-check facet coverage.

---

## 9. Verification

Per phase, using the script set up earlier in this session (it serves the app itself on port 5199,
so it cannot screenshot another project by mistake):

```
npm run lint
npm run build
npm run screenshot -- --path /                         # homepage unchanged + working category pills
npm run screenshot -- --path /collections/all          # listing page
npm run screenshot -- --path /products/<handle>        # PDP
npm run screenshot -- --viewport mobile --path /       # mobile nav
```

The script reports console errors alongside the capture — treat any as a phase blocker. Compare each
capture against the corresponding reference screenshot before moving to the next phase.

Interactive paths that screenshots can't cover, to check by hand in the browser:
- Hover Collections → panel opens full-width below the announcement bar, header goes solid, page dims;
  mouse travel from nav to panel does not close it; Escape and route change close it.
- Check a colour swatch → grid shrinks, result count updates, counts stay stable.
- PDP add-to-cart → drawer opens, badge increments, reload persists the cart, qty change moves the
  free-shipping bar, removing the last item resets the countdown.
