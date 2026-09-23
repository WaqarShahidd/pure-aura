import { Op } from 'sequelize'
import models from '../db/models/index.js'
import { applyDiscount } from '../lib/money.js'
import { unprocessable } from '../lib/errors.js'

const { DiscountCode, DiscountRedemption, CollectionProduct } = models

// Everything a code must satisfy regardless of who is asking - active, inside its window,
// under its usage caps, the cart big enough. Scope (a specific product or collection) is
// checked separately in resolveDiscount, because it needs the cart's line items, which the
// storefront's live preview call does not send.
async function baseEligibility(discount, { subtotal, customerId, transaction }) {
  if (!discount || !discount.isActive) return 'That code is not valid'

  const now = new Date()
  if (discount.startsAt && discount.startsAt > now) return 'That code is not active yet'
  if (discount.endsAt && discount.endsAt < now) return 'That code has expired'
  if (discount.maxUses != null && discount.usedCount >= discount.maxUses) {
    return 'That code has been fully redeemed'
  }
  if (subtotal < discount.minSubtotal) {
    return `Spend Rs ${discount.minSubtotal} or more to use this code`
  }
  if (customerId && discount.perCustomerLimit != null) {
    const used = await DiscountRedemption.count({
      where: { discountId: discount.id, customerId },
      transaction,
    })
    if (used >= discount.perCustomerLimit) return 'You have already used this code'
  }
  return null
}

// The cart drawer's live check as someone types a code. Not authoritative - it exists so
// a customer finds out a code is dead before checkout, not after. It never touches usage
// counters, because typing a code into a box is not redeeming it.
export async function previewDiscount({ code, subtotal }) {
  const discount = await DiscountCode.findOne({ where: { code } })
  const problem = await baseEligibility(discount, { subtotal, customerId: null })

  if (problem) return { valid: false, message: problem }

  return {
    valid: true,
    kind: discount.kind,
    amount: applyDiscount(discount, subtotal),
    message: discount.kind === 'free_shipping' ? 'Free shipping applied' : 'Discount applied',
  }
}

// The authoritative check, run inside createOrder's transaction. Re-derives everything
// from the database rather than trusting whatever the preview call returned earlier - the
// same pattern payment and delivery methods already use here, because a cart can sit open
// for an hour after the preview ran.
export async function resolveDiscount({ code, subtotal, lineProductIds, customerId, transaction }) {
  if (!code) return null

  const discount = await DiscountCode.findOne({ where: { code }, transaction })
  const problem = await baseEligibility(discount, { subtotal, customerId, transaction })
  if (problem) {
    throw unprocessable('DISCOUNT_INVALID', problem, [{ field: 'discountCode', message: problem }])
  }

  if (discount.appliesTo !== 'all') {
    let matches = false

    if (discount.appliesTo === 'product') {
      matches = lineProductIds.includes(discount.targetId)
    } else if (discount.appliesTo === 'collection') {
      const memberships = await CollectionProduct.count({
        where: { collectionId: discount.targetId, productId: { [Op.in]: lineProductIds } },
        transaction,
      })
      matches = memberships > 0
    }

    if (!matches) {
      throw unprocessable(
        'DISCOUNT_INVALID',
        'That code does not apply to the items in your cart',
        [{ field: 'discountCode', message: 'Not valid for these items' }],
      )
    }
  }

  return discount
}

export async function redeemDiscount(discount, { orderId, customerId, amount, transaction }) {
  await discount.increment('usedCount', { by: 1, transaction })
  await DiscountRedemption.create(
    { discountId: discount.id, orderId, customerId: customerId ?? null, amount },
    { transaction },
  )
}
