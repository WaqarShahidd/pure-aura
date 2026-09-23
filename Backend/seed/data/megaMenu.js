// Column and link data for the header's mega menu and flyout. Kept apart from
// config/navigation.js so that file stays readable as a nav structure rather than a wall of links.

import { collectionPath, productPath, ROUTES } from './routes.js'

export const collectionsMegaGroups = [
  {
    id: 'skin-types',
    label: 'Shop by skin types',
    allLabel: 'All products',
    allHref: collectionPath('all'),
    allLinks: [
      { label: 'Shop all skincare', href: collectionPath('skincare') },
      { label: 'Cleansers', href: collectionPath('cleansers') },
      { label: 'Toners', href: collectionPath('toners') },
      { label: 'Serums', href: collectionPath('serums') },
    ],
    columns: [
      {
        heading: 'Dry skin',
        href: collectionPath('skincare'),
        image: null,
        seed: 'dry-skin',
        links: [
          { label: 'Hydra Glow Serum', href: productPath('hydra-glow-serum') },
          { label: 'Rich Balm Moisturiser', href: productPath('rich-balm-moisturiser') },
          { label: 'Rose Dew Toner', href: productPath('rose-dew-toner') },
          { label: 'Active Cream', href: productPath('active-cream') },
        ],
      },
      {
        heading: 'Oily skin',
        href: collectionPath('skincare'),
        image: null,
        seed: 'oily-skin',
        links: [
          { label: 'Niacinamide Clarity Serum', href: productPath('niacinamide-clarity-serum') },
          { label: 'Oil-Free Gel Moisturiser', href: productPath('oil-free-gel-moisturiser') },
          { label: 'Clarifying Witch Hazel Toner', href: productPath('clarifying-witch-hazel-toner') },
          { label: 'Cleansing Oil Face and Eyes', href: productPath('cleansing-oil-face-and-eyes') },
        ],
      },
      {
        heading: 'Sensitive skin',
        href: collectionPath('skincare'),
        image: null,
        seed: 'sensitive-skin',
        links: [
          { label: 'Barrier Recovery Serum', href: productPath('barrier-recovery-serum') },
          { label: 'Calm Mist Toner', href: productPath('calm-mist-toner') },
          { label: 'Ceramide Day Cream', href: productPath('ceramide-day-cream') },
          { label: 'Gentle Foam Cleanser', href: productPath('gentle-foam-cleanser') },
        ],
      },
    ],
  },
  {
    id: 'concerns',
    label: 'Shop by concerns',
    allLabel: 'All concerns',
    allHref: collectionPath('skincare'),
    allLinks: [
      { label: 'Shop all concerns', href: collectionPath('skincare') },
      { label: 'Dullness', href: collectionPath('serums') },
      { label: 'Breakouts', href: collectionPath('cleansers') },
      { label: 'Fine lines', href: collectionPath('best-sellers') },
    ],
    columns: [
      {
        heading: 'Dullness',
        href: collectionPath('serums'),
        image: null,
        seed: 'dullness',
        links: [
          { label: 'Vitamin C Brightening Serum', href: productPath('vitamin-c-brightening-serum') },
          { label: 'Biological Peel', href: productPath('biological-peel') },
          { label: 'Everyday Skin Tint SPF30', href: productPath('skin-tint-spf30') },
          { label: 'Rose Dew Toner', href: productPath('rose-dew-toner') },
        ],
      },
      {
        heading: 'Breakouts',
        href: collectionPath('cleansers'),
        image: null,
        seed: 'breakouts',
        links: [
          { label: 'Niacinamide Clarity Serum', href: productPath('niacinamide-clarity-serum') },
          { label: 'Clarifying Witch Hazel Toner', href: productPath('clarifying-witch-hazel-toner') },
          { label: 'Oil-Free Gel Moisturiser', href: productPath('oil-free-gel-moisturiser') },
          { label: 'Balancing Essence Toner', href: productPath('balancing-essence-toner') },
        ],
      },
      {
        heading: 'Fine lines',
        href: collectionPath('best-sellers'),
        image: null,
        seed: 'fine-lines',
        links: [
          { label: 'Night Repair Complex', href: productPath('night-repair-complex') },
          { label: 'Age Defying Hydrating Fluid', href: productPath('age-defying-hydrating-fluid') },
          { label: 'Rich Balm Moisturiser', href: productPath('rich-balm-moisturiser') },
          { label: 'Hydra Glow Serum', href: productPath('hydra-glow-serum') },
        ],
      },
    ],
  },
  {
    id: 'ingredients',
    label: 'Shop by ingredients',
    allLabel: 'All ingredients',
    allHref: collectionPath('all'),
    allLinks: [
      { label: 'Shop all products', href: collectionPath('all') },
      { label: 'Hyaluronic Acid', href: collectionPath('serums') },
      { label: 'Vitamin C', href: collectionPath('serums') },
      { label: 'Niacinamide', href: collectionPath('skincare') },
    ],
    columns: [
      {
        heading: 'Hyaluronic Acid',
        href: collectionPath('serums'),
        image: null,
        seed: 'hyaluronic',
        links: [
          { label: 'Hydra Glow Serum', href: productPath('hydra-glow-serum') },
          { label: 'Night Repair Complex', href: productPath('night-repair-complex') },
          { label: 'Daily Veil Moisturiser', href: productPath('daily-veil-moisturiser') },
          { label: 'Silhouette Tinted Lip Balm', href: productPath('silhouette-lip-balm') },
        ],
      },
      {
        heading: 'Vitamin C',
        href: collectionPath('serums'),
        image: null,
        seed: 'vitamin-c',
        links: [
          { label: 'Vitamin C Brightening Serum', href: productPath('vitamin-c-brightening-serum') },
          { label: 'Biological Peel', href: productPath('biological-peel') },
          { label: 'Sunscreen SPF50 Travel Size', href: productPath('sunscreen-travel-spf50') },
          { label: 'Everyday Skin Tint SPF30', href: productPath('skin-tint-spf30') },
        ],
      },
      {
        heading: 'Niacinamide',
        href: collectionPath('skincare'),
        image: null,
        seed: 'niacinamide',
        links: [
          { label: 'Niacinamide Clarity Serum', href: productPath('niacinamide-clarity-serum') },
          { label: 'Balancing Essence Toner', href: productPath('balancing-essence-toner') },
          { label: 'Gentle Foam Cleanser', href: productPath('gentle-foam-cleanser') },
          { label: 'Soft Blur Setting Powder', href: productPath('soft-blur-setting-powder') },
        ],
      },
    ],
  },
  {
    id: 'featured',
    label: 'Shop by featured products',
    allLabel: 'All featured',
    allHref: collectionPath('best-sellers'),
    allLinks: [
      { label: 'Shop all', href: collectionPath('all') },
      { label: 'Best sellers', href: collectionPath('best-sellers') },
      { label: 'New arrivals', href: collectionPath('new-arrivals') },
      { label: 'Limited collection', href: collectionPath('limited') },
    ],
    columns: [
      {
        heading: 'Best sellers',
        href: collectionPath('best-sellers'),
        image: null,
        seed: 'best-sellers',
        links: [
          { label: 'Gentle Foam Cleanser', href: productPath('gentle-foam-cleanser') },
          { label: 'Rose Dew Toner', href: productPath('rose-dew-toner') },
          { label: 'Daily Veil Moisturiser', href: productPath('daily-veil-moisturiser') },
          { label: 'Made for Dreamy Nights', href: productPath('made-for-dreamy-nights') },
        ],
      },
      {
        heading: 'New arrivals',
        href: collectionPath('new-arrivals'),
        image: null,
        seed: 'new-arrivals',
        links: [
          { label: 'Barrier Recovery Serum', href: productPath('barrier-recovery-serum') },
          { label: 'Ceramide Day Cream', href: productPath('ceramide-day-cream') },
          { label: 'Calm Mist Toner', href: productPath('calm-mist-toner') },
          { label: 'Everyday Skin Tint SPF30', href: productPath('skin-tint-spf30') },
        ],
      },
      {
        heading: 'Gift sets',
        href: collectionPath('gift-sets'),
        image: null,
        seed: 'gift-sets',
        links: [
          { label: 'Natural Deodorant Trio', href: productPath('natural-deodorant-trio') },
          { label: 'Peppermint Halo Duo', href: productPath('peppermint-halo-duo') },
          { label: 'Silhouette Tinted Lip Balm', href: productPath('silhouette-lip-balm') },
          { label: 'Amber Body Oil', href: productPath('amber-body-oil') },
        ],
      },
    ],
  },
]

// Two-level flyout: hovering a panel label swaps the second column.
export const routinesFlyoutPanels = [
  {
    id: 'routines',
    label: 'Routines',
    href: collectionPath('all'),
    links: [
      { label: 'Morning routine', href: collectionPath('skincare') },
      { label: 'Evening routine', href: collectionPath('skincare') },
      { label: 'Minimal three-step', href: collectionPath('best-sellers') },
      { label: 'Barrier repair routine', href: collectionPath('serums') },
      { label: 'Brightening routine', href: collectionPath('serums') },
      { label: 'Oil-control routine', href: collectionPath('cleansers') },
      { label: 'Sensitive-skin routine', href: collectionPath('toners') },
      { label: 'Post-sun recovery', href: collectionPath('body-care') },
      { label: 'Travel routine', href: collectionPath('gift-sets') },
      { label: 'Weekly reset', href: collectionPath('cleansers') },
      { label: 'Build your own', href: ROUTES.quiz },
    ],
  },
  {
    id: 'concerns',
    label: 'Skin concerns',
    href: collectionPath('skincare'),
    links: [
      { label: 'Dryness and tightness', href: collectionPath('skincare') },
      { label: 'Dullness and uneven tone', href: collectionPath('serums') },
      { label: 'Breakouts and congestion', href: collectionPath('cleansers') },
      { label: 'Visible pores', href: collectionPath('serums') },
      { label: 'Redness and reactivity', href: collectionPath('toners') },
      { label: 'Fine lines and firmness', href: collectionPath('best-sellers') },
      { label: 'Dark spots', href: collectionPath('serums') },
      { label: 'Excess shine', href: collectionPath('skincare') },
      { label: 'Sun protection', href: collectionPath('body-care') },
      { label: 'Body dryness', href: collectionPath('body-care') },
      { label: 'Not sure? Take the quiz', href: ROUTES.quiz },
    ],
  },
  {
    id: 'bundles',
    label: 'Bundles & sets',
    href: collectionPath('gift-sets'),
    links: [
      { label: 'Gift sets', href: collectionPath('gift-sets') },
      { label: 'Starter kits', href: collectionPath('best-sellers') },
      { label: 'Travel sizes', href: collectionPath('body-care') },
      { label: 'Refill bundles', href: collectionPath('all') },
      { label: 'Limited collection', href: collectionPath('limited') },
      { label: 'Build a bundle', href: collectionPath('all') },
    ],
  },
]
