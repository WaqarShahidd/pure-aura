import { randomUUID } from 'node:crypto'
import { afterAll, describe, expect, it } from 'vitest'
import { sequelize } from '../src/db/index.js'
import models from '../src/db/models/index.js'
import { availableStock, heldQuantity, placeHold, sweepExpiredHolds } from '../src/services/inventoryService.js'

const { ProductVariant, InventoryHold, InventoryMove } = models

// Holds are a soft layer in front of stockQuantity: they never touch the column, they
// only shrink what `availableStock` reports and what `placeHold` will admit. The real
// decrement still happens exactly once, at order placement (covered in orderService.test).

// Raw stockQuantity is never touched by a hold, so the "highest stock" variant would be
// the SAME row every time this is called - and tests would silently contaminate each
// other's available stock. Each call gets its own, previously-unused variant instead.
let cursor = 0
async function freshVariant(minStock = 5) {
  const candidates = await ProductVariant.findAll({
    where: { isActive: true, isDefault: true },
    include: [{ association: 'product', required: true, where: { status: 'active' } }],
    order: [['stockQuantity', 'DESC']],
  })
  const eligible = candidates.filter((variant) => variant.stockQuantity >= minStock)
  if (eligible.length <= cursor) {
    throw new Error('Seed did not produce enough distinct in-stock variants for these tests')
  }
  return eligible[cursor++]
}

describe('placeHold', () => {
  it('holds stock without ever touching stockQuantity itself', async () => {
    const variant = await freshVariant()
    const before = variant.stockQuantity

    await placeHold({ cartToken: randomUUID(), variantId: variant.id, quantity: 2 })

    await variant.reload()
    expect(variant.stockQuantity).toBe(before) // unchanged - holds are computed, not physical
    expect(await availableStock(variant.id)).toBe(before - 2)
  })

  it('refuses a hold that would exceed available stock', async () => {
    const variant = await freshVariant()
    const before = variant.stockQuantity

    await expect(
      placeHold({ cartToken: randomUUID(), variantId: variant.id, quantity: before + 1 }),
    ).rejects.toMatchObject({ code: 'INSUFFICIENT_STOCK' })
  })

  it('two carts racing the last unit: the second one loses cleanly', async () => {
    const variant = await freshVariant(1)
    const available = await availableStock(variant.id)

    // Reserve everything but one unit with unrelated holds, so exactly one unit is left
    // to race over regardless of what earlier tests in this file already reserved.
    if (available > 1) {
      await placeHold({ cartToken: randomUUID(), variantId: variant.id, quantity: available - 1 })
    }
    expect(await availableStock(variant.id)).toBe(1)

    const [first, second] = await Promise.allSettled([
      placeHold({ cartToken: 'cart-a', variantId: variant.id, quantity: 1 }),
      placeHold({ cartToken: 'cart-b', variantId: variant.id, quantity: 1 }),
    ])

    const outcomes = [first.status, second.status].sort()
    expect(outcomes).toEqual(['fulfilled', 'rejected'])
    expect(await availableStock(variant.id)).toBe(0)
  })

  it('accumulates across multiple holds for the same cart', async () => {
    const variant = await freshVariant(6)
    const before = variant.stockQuantity
    const cartToken = randomUUID()

    await placeHold({ cartToken, variantId: variant.id, quantity: 2 })
    await placeHold({ cartToken, variantId: variant.id, quantity: 3 })

    expect(await heldQuantity(variant.id)).toBeGreaterThanOrEqual(5)
    expect(await availableStock(variant.id)).toBeLessThanOrEqual(before - 5)
  })
})

describe('sweepExpiredHolds', () => {
  it('releases an expired hold and writes a zero-delta ledger entry', async () => {
    const variant = await freshVariant()
    const before = await availableStock(variant.id) // sweeps clean, establishes a baseline

    const hold = await InventoryHold.create({
      cartToken: randomUUID(),
      variantId: variant.id,
      quantity: 1,
      expiresAt: new Date(Date.now() + 10 * 60_000), // active, so it counts against availability
    })

    expect(await availableStock(variant.id)).toBe(before - 1)

    // Age it past expiry directly, rather than waiting on the clock - availableStock
    // sweeps on every read, so creating the row pre-expired would never leave it
    // observable as "active" in the first place.
    await hold.update({ expiresAt: new Date(Date.now() - 1000) })

    const releasedCount = await sweepExpiredHolds({ variantId: variant.id })
    expect(releasedCount).toBeGreaterThanOrEqual(1)

    await hold.reload()
    expect(hold.releasedAt).not.toBeNull()

    // Freed - the whole point of the sweep.
    expect(await availableStock(variant.id)).toBe(before)

    const move = await InventoryMove.findOne({
      where: { variantId: variant.id, reason: 'hold_expiry' },
      order: [['createdAt', 'DESC']],
    })
    expect(move.delta).toBe(0) // never touched stockQuantity - this is provenance, not a quantity change
  })

  it('leaves a live hold alone', async () => {
    const variant = await freshVariant()
    const hold = await InventoryHold.create({
      cartToken: randomUUID(),
      variantId: variant.id,
      quantity: 1,
      expiresAt: new Date(Date.now() + 10 * 60_000),
    })

    await sweepExpiredHolds({ variantId: variant.id })

    await hold.reload()
    expect(hold.releasedAt).toBeNull()
  })
})

afterAll(async () => {
  await sequelize.close()
})
