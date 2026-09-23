// Collection metadata — drives the listing page title, breadcrumb label and category cards.
// Handles here must match the values used in each product's `collections` array.

export const collections = [
  {
    handle: 'all',
    title: 'Products',
    description: 'Every Pure Aura formula, in one place.',
    image: null,
    cardLabel: 'All products',
  },
  {
    handle: 'best-sellers',
    title: 'Best Sellers',
    description: 'The formulas our customers reorder most.',
    image: null,
    cardLabel: 'Best sellers',
  },
  {
    handle: 'new-arrivals',
    title: 'New Arrivals',
    description: 'Just landed, and worth knowing about.',
    image: null,
    cardLabel: 'New in',
  },
  {
    handle: 'skincare',
    title: 'Skin Care',
    description: 'Cleansers, serums and creams for every skin type.',
    image: null,
    cardLabel: 'Skin care',
  },
  {
    handle: 'makeup',
    title: 'Make Up',
    description: 'Skin-first colour that wears like nothing at all.',
    image: null,
    cardLabel: 'Make up',
  },
  {
    handle: 'body-care',
    title: 'Body Care',
    description: 'Washes, oils and lotions for the rest of you.',
    image: null,
    cardLabel: 'Body',
  },
  {
    handle: 'gift-sets',
    title: 'Gift Sets',
    description: 'Ready-to-give sets, wrapped on request.',
    image: null,
    cardLabel: 'Gift sets',
  },
  {
    handle: 'limited',
    title: 'Limited Collection',
    description: 'Small-batch formulas, here until they are gone.',
    image: null,
    cardLabel: 'Limited',
  },
  {
    handle: 'serums',
    title: 'Serums',
    description: 'Targeted treatments that do the heavy lifting.',
    image: null,
    cardLabel: 'Serums',
  },
  {
    handle: 'cleansers',
    title: 'Cleansers',
    description: 'The first step, and the one worth getting right.',
    image: null,
    cardLabel: 'Cleansers',
  },
  {
    handle: 'toners',
    title: 'Toners',
    description: 'Hydrating essences and mists to prep the skin.',
    image: null,
    cardLabel: 'Toners',
  },
]

// The row of image cards at the top of the listing page.
export const featuredCollectionCards = ['skincare', 'makeup', 'body-care', 'gift-sets']
