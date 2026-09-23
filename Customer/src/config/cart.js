// Cart tuning and drawer copy.
export const cartConfig = {
  freeShippingThreshold: 28000,
  // How long items are "reserved" for; drives the drawer countdown.
  reservationMinutes: 10,
  // Bumped to v2 with the line-key change: a stored v1 cart keys its lines by handle
  // alone, which would collide with the new variant-aware keys.
  storageKey: 'pure-aura:cart:v2',
  maxLineQuantity: 99,
  upsellLimit: 5,
}

// Not part of the CMS `cart_copy` setting - there is no cart to be empty about once the
// drawer has items, so an admin never needs to edit this.
export const cartEmptyCopy = {
  title: 'Your cart is empty',
  body: 'Once you add something, it will show up here.',
  action: 'Start shopping',
}

// Every value here is a TEMPLATE STRING with `{placeholder}` tokens, filled by
// utils/template.js `fill()` - matching Backend's `cart_copy` setting field for field, so
// this is exactly what a component sees before `/bootstrap` has answered and exactly the
// shape the server sends once it has.
export const cartCopyFallback = {
  title: 'Your cart',
  reservation: 'Items in your cart are reserved for {time} minutes!',
  reservationExpired: 'Your reservation has expired, but your items are still here.',
  freeShippingProgress: 'Add {amount} more to get FREE shipping',
  freeShippingReached: 'You have unlocked free shipping.',
  savings: 'You saved {amount}',
  taxNote: 'Taxes and shipping calculated at checkout',
  upsellTitle: 'Pairs well with',
}
