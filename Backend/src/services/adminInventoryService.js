import { Op } from 'sequelize'
import { sequelize } from '../db/index.js'
import models from '../db/models/index.js'
import { heldQuantity } from './inventoryService.js'
import { notFound, unprocessable } from '../lib/errors.js'

const { ProductVariant, Product, InventoryMove } = models

function serializeVariant(variant, held) {
  return {
    id: variant.id,
    sku: variant.sku,
    label: variant.label,
    productId: variant.productId,
    productTitle: variant.product?.title,
    productHandle: variant.product?.handle,
    stockQuantity: variant.stockQuantity,
    lowStockThreshold: variant.lowStockThreshold,
    isLowStock: variant.stockQuantity <= variant.lowStockThreshold,
    heldQuantity: held,
    availableQuantity: Math.max(0, variant.stockQuantity - held),
    isActive: variant.isActive,
  }
}

export async function listVariants({ q, lowStockOnly, page = 1, perPage = 25 }) {
  const clauses = []
  if (q) {
    clauses.push({
      [Op.or]: [
        { sku: { [Op.iLike]: `%${q}%` } },
        { label: { [Op.iLike]: `%${q}%` } },
        { '$product.title$': { [Op.iLike]: `%${q}%` } },
      ],
    })
  }
  // A column-to-column comparison, not a value - filtered at the database so it composes
  // correctly with pagination instead of thinning out an already-paginated page.
  if (lowStockOnly) {
    clauses.push(sequelize.where(sequelize.col('ProductVariant.stock_quantity'), Op.lte, sequelize.col('ProductVariant.low_stock_threshold')))
  }

  const { rows, count } = await ProductVariant.findAndCountAll({
    where: clauses.length ? { [Op.and]: clauses } : {},
    include: [{ association: 'product', attributes: ['id', 'title', 'handle'], required: true }],
    order: [[{ model: Product, as: 'product' }, 'title', 'ASC'], ['position', 'ASC']],
    limit: perPage,
    offset: (page - 1) * perPage,
    distinct: true,
  })

  const filtered = await Promise.all(
    rows.map(async (variant) => serializeVariant(variant, await heldQuantity(variant.id))),
  )

  return { data: filtered, meta: { page, perPage, total: count, totalPages: Math.max(1, Math.ceil(count / perPage)) } }
}

export async function listMoves(variantId) {
  const rows = await InventoryMove.findAll({
    where: { variantId },
    order: [['createdAt', 'DESC']],
    limit: 50,
  })
  return rows.map((row) => ({
    id: row.id,
    delta: row.delta,
    reason: row.reason,
    note: row.note,
    orderId: row.orderId,
    createdAt: row.createdAt,
  }))
}

// The admin's own move reasons - 'order', 'cancel' and 'hold_expiry' are written only by
// the checkout and reservation flows, never by a person clicking a button here.
const ADMIN_REASONS = new Set(['restock', 'adjustment'])

export async function adjustStock(variantId, { delta, reason, note, adminUserId }) {
  if (!ADMIN_REASONS.has(reason)) {
    throw unprocessable('INVALID_REASON', 'Use restock or adjustment', [{ field: 'reason', message: 'Invalid' }])
  }
  if (!Number.isInteger(delta) || delta === 0) {
    throw unprocessable('INVALID_DELTA', 'Enter a non-zero whole number', [{ field: 'delta', message: 'Required' }])
  }

  return sequelize.transaction(async (transaction) => {
    const variant = await ProductVariant.findByPk(variantId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    })
    if (!variant) throw notFound('No such variant')

    const nextStock = variant.stockQuantity + delta
    if (nextStock < 0) {
      throw unprocessable(
        'INSUFFICIENT_STOCK',
        `Only ${variant.stockQuantity} on hand - cannot remove ${Math.abs(delta)}`,
        [{ field: 'delta', message: 'Would go below zero' }],
      )
    }

    await variant.update({ stockQuantity: nextStock }, { transaction })
    await InventoryMove.create(
      { variantId, delta, reason, note: note || null, adminUserId },
      { transaction },
    )

    const held = await heldQuantity(variantId, { transaction })
    const withProduct = await ProductVariant.findByPk(variantId, {
      include: [{ association: 'product', attributes: ['id', 'title', 'handle'] }],
      transaction,
    })
    return serializeVariant(withProduct, held)
  })
}
