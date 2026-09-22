export const CHECKOUT_STEPS = [
  { id: 'contact', label: 'Contact' },
  { id: 'shipping', label: 'Shipping' },
  { id: 'delivery', label: 'Delivery' },
  { id: 'payment', label: 'Payment' },
  { id: 'review', label: 'Review' },
]

export const DELIVERY_METHODS = [
  {
    id: 'standard',
    label: 'Standard',
    detail: '3-5 working days',
    price: 1700,
    freeOver: 28000,
  },
  { id: 'express', label: 'Express', detail: 'Next working day if ordered before 2pm', price: 14.0 },
  { id: 'pickup', label: 'Collect in store', detail: 'Ready at Head Office in 24 hours', price: 0 },
]

export const COUNTRIES = ['Pakistan', 'United Arab Emirates', 'Saudi Arabia', 'United Kingdom']

export const TAX_RATE = 0.08

// Standard delivery is free over the threshold; everything else always costs what it costs.
export function shippingCostFor(methodId, subtotal) {
  const method = DELIVERY_METHODS.find((candidate) => candidate.id === methodId)
  if (!method) return 0
  if (method.freeOver != null && subtotal >= method.freeOver) return 0
  return method.price
}
