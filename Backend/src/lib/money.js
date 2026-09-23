// Every amount in this system is an INTEGER NUMBER OF RUPEES. Not cents, not a float.
// The storefront's formatPrice.js renders with minimumFractionDigits: 0, and the whole
// catalogue is written as whole rupees (price: 19000 means Rs 19,000). A float here is
// how you get Rs 14 express shipping, which is exactly the bug this replaces.
//
// Tax rates are stored as basis points (1800 = 18%) so the rate is an integer too and
// no floating-point value ever touches a total.

export function assertWholeRupees(amount, label = 'amount') {
  if (!Number.isInteger(amount)) {
    throw new TypeError(`${label} must be an integer number of rupees, received ${amount}`)
  }
  if (amount < 0) {
    throw new RangeError(`${label} must not be negative, received ${amount}`)
  }
  return amount
}

// Prices are tax-INCLUSIVE: the listed price already contains the tax, so tax is never
// added to the total. This extracts the portion of a tax-inclusive amount that is tax,
// which is what checkout shows as "(incl. GST Rs X)".
//
//   taxable = 29600, rate = 1800bp  ->  net 25085, tax 4515
export function taxIncludedIn(taxableAmount, rateBp) {
  assertWholeRupees(taxableAmount, 'taxableAmount')
  if (!Number.isInteger(rateBp) || rateBp < 0) {
    throw new RangeError(`rateBp must be a non-negative integer, received ${rateBp}`)
  }
  if (rateBp === 0) return 0

  const net = Math.round((taxableAmount * 10000) / (10000 + rateBp))
  return taxableAmount - net
}

// The single arithmetic for an order total, matching the CHECK constraint on the orders
// table. Tax is informational and deliberately absent from the sum.
export function orderTotals({ subtotal, discount = 0, shipping = 0, taxRateBp = 0 }) {
  assertWholeRupees(subtotal, 'subtotal')
  assertWholeRupees(discount, 'discount')
  assertWholeRupees(shipping, 'shipping')

  if (discount > subtotal) {
    throw new RangeError(`discount ${discount} exceeds subtotal ${subtotal}`)
  }

  const taxable = subtotal - discount + shipping

  return {
    subtotalAmount: subtotal,
    discountAmount: discount,
    shippingAmount: shipping,
    taxRateBp,
    taxAmount: taxIncludedIn(taxable, taxRateBp),
    totalAmount: taxable,
  }
}

// Mirrors shippingCostFor() in Customer/src/config/checkout.js so the client and server
// never disagree about what delivery costs.
export function shippingCostFor(method, subtotal) {
  if (!method) return 0
  if (method.freeOverAmount != null && subtotal >= method.freeOverAmount) return 0
  return method.priceAmount
}

export function applyDiscount(discount, subtotal) {
  if (!discount) return 0

  if (discount.kind === 'percent') {
    return Math.min(subtotal, Math.round((subtotal * discount.value) / 100))
  }
  if (discount.kind === 'fixed') {
    return Math.min(subtotal, discount.value)
  }
  // free_shipping does not reduce the subtotal; it zeroes the shipping line instead.
  return 0
}
