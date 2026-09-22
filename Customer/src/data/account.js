// Mock account data. There is no auth — the account pages render as an already-signed-in
// shell, which is what a real backend would fill in later.

export const account = {
  firstName: 'Jamie',
  lastName: 'Fletcher',
  email: 'jamie.fletcher@example.com',
  phone: '+1 555 0134',
  birthday: '1992-04-18',
  memberSince: 'March 2024',
  rewardPoints: 640,
  marketingOptIn: true,
  smsOptIn: false,
}

export const addresses = [
  {
    id: 'addr-1',
    label: 'Home',
    isDefault: true,
    name: 'Jamie Fletcher',
    line1: '42 Chancery Lane',
    line2: 'Apt 3B',
    city: 'Brooklyn',
    region: 'NY',
    postcode: '11201',
    country: 'United States',
    phone: '+1 555 0134',
  },
  {
    id: 'addr-2',
    label: 'Work',
    isDefault: false,
    name: 'Jamie Fletcher',
    line1: 'Pure Aura Studio',
    line2: '18 Vestry Street, Floor 4',
    city: 'New York',
    region: 'NY',
    postcode: '10013',
    country: 'United States',
    phone: '+1 555 0134',
  },
]

// `items` reference real product handles so order rows can link back into the catalogue.
export const orders = [
  {
    id: 'PA-10248',
    placedOn: '2026-08-14',
    status: 'Delivered',
    deliveredOn: '2026-08-18',
    trackingNumber: 'TRK-48120394',
    shippingAddressId: 'addr-1',
    paymentLabel: 'Visa ending 4242',
    shipping: 0,
    items: [
      { handle: 'hydra-glow-serum', quantity: 1, price: 19000 },
      { handle: 'gentle-foam-cleanser', quantity: 1, price: 10600 },
    ],
  },
  {
    id: 'PA-10193',
    placedOn: '2026-06-02',
    status: 'Delivered',
    deliveredOn: '2026-06-06',
    trackingNumber: 'TRK-47003321',
    shippingAddressId: 'addr-2',
    paymentLabel: 'PayPal',
    shipping: 1700,
    items: [
      { handle: 'rose-dew-toner', quantity: 2, price: 11800 },
    ],
  },
  {
    id: 'PA-10311',
    placedOn: '2026-09-19',
    status: 'In transit',
    deliveredOn: null,
    trackingNumber: 'TRK-49551208',
    shippingAddressId: 'addr-1',
    paymentLabel: 'Visa ending 4242',
    shipping: 0,
    items: [
      { handle: 'night-repair-complex', quantity: 1, price: 33600 },
      { handle: 'calm-mist-toner', quantity: 1, price: 9500 },
      { handle: 'daily-veil-moisturiser', quantity: 1, price: 15700 },
    ],
  },
]

export function getOrderById(id) {
  return orders.find((order) => order.id === id)
}

export function getAddressById(id) {
  return addresses.find((address) => address.id === id)
}

export function orderSubtotal(order) {
  return order.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
}

export function orderTotal(order) {
  return orderSubtotal(order) + (order.shipping ?? 0)
}

export function orderItemCount(order) {
  return order.items.reduce((sum, item) => sum + item.quantity, 0)
}
