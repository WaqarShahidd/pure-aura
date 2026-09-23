import models from '../db/models/index.js'
import { conflict, notFound } from '../lib/errors.js'

const { DiscountCode, DiscountRedemption } = models

function serialize(row) {
  return {
    id: row.id,
    code: row.code,
    kind: row.kind,
    value: row.value,
    minSubtotal: row.minSubtotal,
    maxUses: row.maxUses,
    usedCount: row.usedCount,
    perCustomerLimit: row.perCustomerLimit,
    appliesTo: row.appliesTo,
    targetId: row.targetId,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    isActive: row.isActive,
  }
}

export async function listDiscounts() {
  const rows = await DiscountCode.findAll({ order: [['createdAt', 'DESC']] })
  return rows.map(serialize)
}

async function loadDiscount(id) {
  const row = await DiscountCode.findByPk(id)
  if (!row) throw notFound('No such discount code')
  return row
}

export async function getDiscount(id) {
  return serialize(await loadDiscount(id))
}

export async function createDiscount(payload) {
  const row = await DiscountCode.create(payload)
  return serialize(row)
}

export async function updateDiscount(id, payload) {
  const row = await loadDiscount(id)
  const before = serialize(row)
  await row.update(payload)
  return { before, after: serialize(row) }
}

// discount_redemptions -> discount_codes is ON DELETE CASCADE at the database, so nothing
// there would stop a delete from silently erasing which orders used this code. This check
// is what actually protects that history - deactivating is the real "turn this off"
// action; delete is for a code that was never used.
export async function deleteDiscount(id) {
  const row = await loadDiscount(id)

  const redemptions = await DiscountRedemption.count({ where: { discountId: id } })
  if (redemptions > 0) {
    throw conflict(
      'DISCOUNT_IN_USE',
      `Used on ${redemptions} order${redemptions === 1 ? '' : 's'} - deactivate it instead of deleting`,
    )
  }

  await row.destroy()
}
