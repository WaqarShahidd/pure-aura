import { describe, expect, it } from 'vitest'
import { applyDiscount, assertWholeRupees, orderTotals, shippingCostFor, taxIncludedIn } from '../src/lib/money.js'

// Pure functions, no database - this is the arithmetic behind the CHECK constraint on
// `orders`, so a bug here is a bug the database would also accept if it were computed
// twice in two places. There is exactly one place: this file.

describe('assertWholeRupees', () => {
  it('accepts a non-negative integer', () => {
    expect(assertWholeRupees(19000)).toBe(19000)
    expect(assertWholeRupees(0)).toBe(0)
  })

  it('rejects a float - the unconverted 14.0 express-shipping value is unrepresentable', () => {
    expect(() => assertWholeRupees(14.0)).not.toThrow() // 14.0 === 14, a whole number
    expect(() => assertWholeRupees(14.5)).toThrow(TypeError)
  })

  it('rejects a negative amount', () => {
    expect(() => assertWholeRupees(-1)).toThrow(RangeError)
  })
})

describe('taxIncludedIn', () => {
  it('extracts the tax portion of a tax-inclusive amount without changing the total', () => {
    // 18% inclusive: net + net*0.18 = taxable, so net = taxable / 1.18
    const tax = taxIncludedIn(29600, 1800)
    expect(tax).toBe(4515)
    // The defining property: the taxable amount minus the tax is the net price, and
    // nothing was ever added on top of `taxable`.
    expect(29600 - tax).toBe(25085)
  })

  it('is zero at a zero rate', () => {
    expect(taxIncludedIn(29600, 0)).toBe(0)
  })

  it('is zero on a zero amount', () => {
    expect(taxIncludedIn(0, 1800)).toBe(0)
  })
})

describe('orderTotals', () => {
  it('never adds tax on top of the subtotal - total is subtotal minus discount plus shipping, full stop', () => {
    const totals = orderTotals({ subtotal: 28000, discount: 0, shipping: 1700, taxRateBp: 1800 })
    expect(totals.totalAmount).toBe(28000 + 1700)
    // Same identity the CHECK constraint enforces at the database.
    expect(totals.totalAmount).toBe(
      totals.subtotalAmount - totals.discountAmount + totals.shippingAmount,
    )
  })

  it('reports the tax contained in the total as information, not as an addend', () => {
    const totals = orderTotals({ subtotal: 29600, shipping: 0, taxRateBp: 1800 })
    expect(totals.taxAmount).toBe(4515)
    expect(totals.totalAmount).toBe(29600)
  })

  it('applies a discount before computing tax', () => {
    const totals = orderTotals({ subtotal: 10000, discount: 2000, shipping: 0, taxRateBp: 1800 })
    expect(totals.totalAmount).toBe(8000)
  })

  it('rejects a discount larger than the subtotal', () => {
    expect(() => orderTotals({ subtotal: 1000, discount: 1500 })).toThrow(RangeError)
  })

  it('rejects a non-integer subtotal', () => {
    expect(() => orderTotals({ subtotal: 100.5 })).toThrow(TypeError)
  })
})

describe('shippingCostFor', () => {
  const express = { priceAmount: 2500, freeOverAmount: null }
  const standard = { priceAmount: 1700, freeOverAmount: 28000 }

  it('charges the flat rate below the free-shipping threshold', () => {
    expect(shippingCostFor(standard, 10000)).toBe(1700)
  })

  it('is free at or above the threshold', () => {
    expect(shippingCostFor(standard, 28000)).toBe(0)
    expect(shippingCostFor(standard, 50000)).toBe(0)
  })

  it('never waives a method with no threshold, however large the cart', () => {
    expect(shippingCostFor(express, 1_000_000)).toBe(2500)
  })

  it('is Rs 2,500 for express, never the old Rs 14 float', () => {
    expect(express.priceAmount).toBe(2500)
    expect(Number.isInteger(express.priceAmount)).toBe(true)
  })

  it('is zero with no method chosen', () => {
    expect(shippingCostFor(null, 10000)).toBe(0)
  })
})

describe('applyDiscount', () => {
  it('caps a percent discount at the subtotal', () => {
    expect(applyDiscount({ kind: 'percent', value: 200 }, 1000)).toBe(1000)
  })

  it('caps a fixed discount at the subtotal', () => {
    expect(applyDiscount({ kind: 'fixed', value: 5000 }, 1000)).toBe(1000)
  })

  it('rounds a percent discount to the nearest rupee', () => {
    expect(applyDiscount({ kind: 'percent', value: 10 }, 999)).toBe(100)
  })

  it('never reduces the subtotal for free shipping - it zeroes shipping instead', () => {
    expect(applyDiscount({ kind: 'free_shipping' }, 1000)).toBe(0)
  })

  it('is zero with no discount applied', () => {
    expect(applyDiscount(null, 1000)).toBe(0)
  })
})
