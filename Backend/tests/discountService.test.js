import { randomUUID } from 'node:crypto'
import { afterAll, describe, expect, it } from 'vitest'
import { sequelize } from '../src/db/index.js'
import models from '../src/db/models/index.js'
import { previewDiscount, redeemDiscount, resolveDiscount } from '../src/services/discountService.js'
import { createOrder } from '../src/services/orderService.js'

const { DiscountCode, DiscountRedemption, Product, CollectionProduct, ProductVariant } = models

async function createCode(overrides = {}) {
  return DiscountCode.create({
    code: `TEST-${randomUUID().slice(0, 8)}`,
    kind: 'percent',
    value: 10,
    minSubtotal: 0,
    ...overrides,
  })
}

// discount_redemptions.order_id has a real foreign key, so a redemption needs a genuine
// order behind it - a random uuid is not enough here, unlike order_status_events.actor_id.
async function realOrderId() {
  const variant = await ProductVariant.findOne({
    where: { isActive: true, isDefault: true },
    include: [{ association: 'product', required: true, where: { status: 'active' } }],
    order: [['stockQuantity', 'DESC']],
  })
  const { order } = await createOrder({
    email: 'discount-test@example.com',
    firstName: 'Test',
    lastName: 'Order',
    line1: '1 Test Street',
    city: 'Lahore',
    country: 'Pakistan',
    delivery: 'standard',
    paymentMethod: 'cod',
    lines: [{ handle: variant.product.handle, variantId: variant.id, quantity: 1 }],
  })
  return order.id
}

describe('previewDiscount', () => {
  it('computes the discount amount for a valid percent code', async () => {
    const discount = await createCode({ kind: 'percent', value: 20 })
    const result = await previewDiscount({ code: discount.code, subtotal: 10000 })
    expect(result).toEqual({ valid: true, kind: 'percent', amount: 2000, message: 'Discount applied' })
  })

  it('computes a fixed amount, capped at the subtotal', async () => {
    const discount = await createCode({ kind: 'fixed', value: 5000 })
    const result = await previewDiscount({ code: discount.code, subtotal: 3000 })
    expect(result.amount).toBe(3000)
  })

  it('reports free shipping without discounting the subtotal itself', async () => {
    const discount = await createCode({ kind: 'free_shipping', value: 0 })
    const result = await previewDiscount({ code: discount.code, subtotal: 10000 })
    expect(result).toMatchObject({ valid: true, kind: 'free_shipping', amount: 0 })
  })

  it('rejects an unknown code', async () => {
    const result = await previewDiscount({ code: 'DOES-NOT-EXIST', subtotal: 10000 })
    expect(result.valid).toBe(false)
  })

  it('rejects a code below its minimum subtotal', async () => {
    const discount = await createCode({ minSubtotal: 5000 })
    const result = await previewDiscount({ code: discount.code, subtotal: 1000 })
    expect(result.valid).toBe(false)
  })

  it('rejects an inactive code', async () => {
    const discount = await createCode({ isActive: false })
    const result = await previewDiscount({ code: discount.code, subtotal: 10000 })
    expect(result.valid).toBe(false)
  })

  it('rejects a code outside its date window', async () => {
    const expired = await createCode({ endsAt: new Date(Date.now() - 86_400_000) })
    expect((await previewDiscount({ code: expired.code, subtotal: 10000 })).valid).toBe(false)

    const notYet = await createCode({ startsAt: new Date(Date.now() + 86_400_000) })
    expect((await previewDiscount({ code: notYet.code, subtotal: 10000 })).valid).toBe(false)
  })

  it('rejects a code that has hit its usage cap', async () => {
    const discount = await createCode({ maxUses: 1, usedCount: 1 })
    const result = await previewDiscount({ code: discount.code, subtotal: 10000 })
    expect(result.valid).toBe(false)
  })

  it('is case-insensitive, matching how the storefront upcases what a customer types', async () => {
    const discount = await createCode({ code: 'MixedCase10' })
    const result = await previewDiscount({ code: 'MIXEDCASE10', subtotal: 10000 })
    expect(result.valid).toBe(true)
  })
})

describe('resolveDiscount - the authoritative check at order time', () => {
  it('re-validates from the database rather than trusting the caller', async () => {
    const discount = await createCode({ minSubtotal: 5000 })
    await expect(
      resolveDiscount({ code: discount.code, subtotal: 1000, lineProductIds: [], customerId: null }),
    ).rejects.toMatchObject({ code: 'DISCOUNT_INVALID' })
  })

  it('returns null when no code was given - a cart without a discount is not an error', async () => {
    const result = await resolveDiscount({ code: null, subtotal: 10000, lineProductIds: [] })
    expect(result).toBeNull()
  })

  it('accepts a product-scoped code only when a matching product is in the cart', async () => {
    const product = await Product.findOne({ where: { status: 'active' } })
    const discount = await createCode({ appliesTo: 'product', targetId: product.id })

    await expect(
      resolveDiscount({
        code: discount.code,
        subtotal: 10000,
        lineProductIds: [randomUUID()],
      }),
    ).rejects.toMatchObject({ code: 'DISCOUNT_INVALID' })

    const resolved = await resolveDiscount({
      code: discount.code,
      subtotal: 10000,
      lineProductIds: [product.id],
    })
    expect(resolved.id).toBe(discount.id)
  })

  it('accepts a collection-scoped code only when a member product is in the cart', async () => {
    const membership = await CollectionProduct.findOne()
    const discount = await createCode({ appliesTo: 'collection', targetId: membership.collectionId })

    await expect(
      resolveDiscount({
        code: discount.code,
        subtotal: 10000,
        lineProductIds: [randomUUID()],
      }),
    ).rejects.toMatchObject({ code: 'DISCOUNT_INVALID' })

    const resolved = await resolveDiscount({
      code: discount.code,
      subtotal: 10000,
      lineProductIds: [membership.productId],
    })
    expect(resolved.id).toBe(discount.id)
  })

  it('enforces a per-customer redemption limit', async () => {
    const discount = await createCode({ perCustomerLimit: 1 })
    // discount_redemptions.customer_id has a real foreign key too, unlike the lookup
    // below it which only ever reads - a seeded customer stands in for "someone real".
    const { id: customerId } = await models.Customer.findOne()

    await redeemDiscount(discount, { orderId: await realOrderId(), customerId, amount: 100 })

    await expect(
      resolveDiscount({ code: discount.code, subtotal: 10000, lineProductIds: [], customerId }),
    ).rejects.toMatchObject({ code: 'DISCOUNT_INVALID' })

    // A different customer is unaffected by someone else's redemption.
    const resolved = await resolveDiscount({
      code: discount.code,
      subtotal: 10000,
      lineProductIds: [],
      customerId: randomUUID(),
    })
    expect(resolved.id).toBe(discount.id)
  })
})

describe('redeemDiscount', () => {

  it('increments usedCount and records a redemption', async () => {
    const discount = await createCode()
    const orderId = await realOrderId()

    await redeemDiscount(discount, { orderId, customerId: null, amount: 500 })

    await discount.reload()
    expect(discount.usedCount).toBe(1)

    const redemption = await DiscountRedemption.findOne({ where: { discountId: discount.id, orderId } })
    expect(redemption.amount).toBe(500)
  })
})

afterAll(async () => {
  await sequelize.close()
})
