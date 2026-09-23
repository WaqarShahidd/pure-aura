// Cart tuning and drawer copy.
export const cartConfig = {
  freeShippingThreshold: 28000,
  // How long items are "reserved" for; drives the drawer countdown.
  reservationMinutes: 10,
  storageKey: 'pure-aura:cart:v1',
  maxLineQuantity: 99,
  upsellLimit: 5,
}

export const cartCopy = {
  title: 'Your cart',
  empty: {
    title: 'Your cart is empty',
    body: 'Once you add something, it will show up here.',
    action: 'Start shopping',
  },
  reservation: (time) => `Items in your cart are reserved for ${time} minutes!`,
  reservationExpired: 'Your reservation has expired, but your items are still here.',
  freeShippingProgress: (amount) => `Add ${amount} more to get FREE shipping`,
  freeShippingReached: 'You have unlocked FREE shipping!',
  taxNote: 'Taxes and shipping calculated at checkout',
  savings: (amount) => `You've saved ${amount}!`,
  upsellTitle: "You'll love this too",
}
