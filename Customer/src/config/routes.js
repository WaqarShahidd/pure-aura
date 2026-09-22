export const ROUTES = {
  home: '/',
  bestSellers: '/collections/best-sellers',
  collections: '/collections',
  templates: '/pages/templates',
  presets: '/pages/presets',
  b2b: '/pages/b2b-features',
  wholesale: '/pages/wholesale',
  bulkOrders: '/pages/bulk-orders',
  search: '/search',
  cart: '/cart',
  checkout: '/checkout',
  orderConfirmed: '/checkout/confirmed',

  // Account area. No auth — these render as an already-signed-in shell.
  account: '/account',
  accountOrders: '/account/orders',
  accountAddresses: '/account/addresses',
  accountProfile: '/account/profile',

  shipping: '/policies/shipping-policy',
  privacy: '/policies/privacy-policy',
  returns: '/policies/refund-policy',
  terms: '/policies/terms-of-service',
  faqs: '/pages/faqs',
  about: '/pages/about-us',
  bookTreatment: '/pages/book-a-treatment',
  promotions: '/pages/promotion-programs',
  promises: '/pages/our-promises',
  contact: '/pages/contact',
  quiz: '/pages/quiz',
}

// Patterns for <Route path=...>. ROUTES above holds concrete links; these hold the params.
export const ROUTE_PATTERNS = {
  home: '/',
  collections: '/collections',
  collection: '/collections/:handle',
  product: '/products/:handle',
  cart: '/cart',
  checkout: '/checkout',
  orderConfirmed: '/checkout/confirmed',
  search: '/search',
  account: '/account',
  accountSection: '/account/:section',
  orderDetail: '/account/orders/:id',
  // One component renders every static page, keyed off the slug.
  policy: '/policies/:slug',
  page: '/pages/:slug',
  notFound: '*',
}

// Always build parameterised URLs through these rather than template literals, so the
// path shape lives in one place.
export const collectionPath = (handle) => `/collections/${handle}`
export const productPath = (handle) => `/products/${handle}`
export const orderPath = (id) => `/account/orders/${id}`

// The collection every product belongs to — the listing page's default.
export const ALL_COLLECTION = 'all'
