import { Op } from 'sequelize'
import { sequelize } from '../db/index.js'
import models from '../db/models/index.js'
import { notFound, unprocessable } from '../lib/errors.js'

const { ProductVariant, InventoryHold, InventoryMove, Setting } = models

// Available stock is stockQuantity minus the sum of live holds - so two carts racing the
// last unit cannot both "win" it, without ever touching stockQuantity itself. The real,
// physical decrement still happens exactly once, at order placement (orderService), under
// its own row lock. Holds are a soft layer in front of that, not a second source of truth.

async function reservationMinutes(transaction) {
  const row = await Setting.findByPk('reservation_minutes', { transaction })
  return row?.value ?? 10
}

// Lazy sweep rather than a cron job: called at the top of every read or write that cares
// about availability, scoped to one variant when possible so it can use the partial index
// the migration created (variant_id, expires_at) WHERE released_at IS NULL.
//
// A swept hold never touched stockQuantity, so there is nothing to restore - but a row is
// still written to the ledger, because the plan is explicit that expiry writes one. It
// carries delta: 0 deliberately; it is provenance ("this reservation lapsed"), not a
// quantity change, and a reconstruction of stockQuantity from the ledger already ignores
// zero-delta rows.
export async function sweepExpiredHolds({ variantId, transaction } = {}) {
  const where = { releasedAt: null, expiresAt: { [Op.lte]: new Date() } }
  if (variantId) where.variantId = variantId

  const expired = await InventoryHold.findAll({ where, transaction })

  for (const hold of expired) {
    await hold.update({ releasedAt: new Date() }, { transaction })
    await InventoryMove.create(
      {
        variantId: hold.variantId,
        delta: 0,
        reason: 'hold_expiry',
        note: `Released expired hold of ${hold.quantity} (cart ${hold.cartToken})`,
      },
      { transaction },
    )
  }

  return expired.length
}

export async function heldQuantity(variantId, { transaction } = {}) {
  const total = await InventoryHold.sum('quantity', {
    where: { variantId, releasedAt: null, expiresAt: { [Op.gt]: new Date() } },
    transaction,
  })
  return total ?? 0
}

export async function availableStock(variantId, { transaction } = {}) {
  await sweepExpiredHolds({ variantId, transaction })

  const variant = await ProductVariant.findByPk(variantId, { transaction })
  if (!variant) throw notFound('No such variant')

  const held = await heldQuantity(variantId, { transaction })
  return Math.max(0, variant.stockQuantity - held)
}

// Adding to cart calls this. It is the one place that can say no before checkout does -
// the race the plan calls out ("two browsers, one unit") is decided here, under a row
// lock on the variant, not at order time.
export async function placeHold({ cartToken, variantId, quantity }) {
  return sequelize.transaction(async (transaction) => {
    const variant = await ProductVariant.findByPk(variantId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    })
    if (!variant) throw notFound('No such variant')

    await sweepExpiredHolds({ variantId, transaction })
    const held = await heldQuantity(variantId, { transaction })
    const available = Math.max(0, variant.stockQuantity - held)

    if (available < quantity) {
      throw unprocessable('INSUFFICIENT_STOCK', `Only ${available} left`, [
        { field: 'quantity', message: `Only ${available} available` },
      ])
    }

    const minutes = await reservationMinutes(transaction)
    const expiresAt = new Date(Date.now() + minutes * 60_000)

    return InventoryHold.create({ cartToken, variantId, quantity, expiresAt }, { transaction })
  })
}

// Called from inside createOrder's own transaction once an order is placed: the holds
// that backed this cart are superseded by a real stock decrement, so they are released
// and linked to the order rather than left to expire on their own clock.
export async function releaseHoldsForCart(cartToken, orderId, { transaction } = {}) {
  if (!cartToken) return
  await InventoryHold.update(
    { releasedAt: new Date(), orderId },
    { where: { cartToken, releasedAt: null }, transaction },
  )
}
