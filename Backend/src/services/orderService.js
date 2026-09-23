import { createHash, randomBytes } from 'node:crypto'
import { Op } from 'sequelize'
import { sequelize } from '../db/index.js'
import models from '../db/models/index.js'
import { mediaUrl } from '../serializers/media.js'
import { nextBankReference, nextOrderNumber } from '../lib/orderNumber.js'
import { applyDiscount, orderTotals, shippingCostFor } from '../lib/money.js'
import { releaseHoldsForCart } from './inventoryService.js'
import { resolveDiscount, redeemDiscount } from './discountService.js'
import {
  STATUS_TIMESTAMPS,
  allowedFor,
  canTransition,
  customerCanCancel,
} from '../lib/orderStatus.js'
import { conflict, forbidden, notFound, unprocessable } from '../lib/errors.js'
import { sendMail } from '../lib/mailer.js'
import { orderConfirmedEmail } from '../emails/orderConfirmed.js'
import { orderShippedEmail } from '../emails/orderShipped.js'
import { paymentVerifiedEmail } from '../emails/paymentVerified.js'

const {
  Order, OrderItem, OrderStatusEvent, Payment, PaymentMethod, DeliveryMethod, TaxRate,
  Courier, Product, ProductVariant, Customer, FeatureFlag, MediaAsset,
} = models

// A guest needs some way to see the order they just placed without an account. The raw
// token goes to the browser once; only its hash is stored, so a database read does not
// hand someone else's receipt over.
function hashToken(token) {
  return createHash('sha256').update(token).digest('hex')
}

// A gateway is only offered when the merchant switch AND the engineering flag are both on.
// The first is the admin toggle; the second needs a deploy with real credentials. Two keys
// means nobody can turn on "Card" in the admin and strand a customer on a dead form.
export async function listPaymentMethods() {
  const [methods, flags] = await Promise.all([
    PaymentMethod.findAll({ where: { isEnabled: true }, order: [['position', 'ASC']] }),
    FeatureFlag.findAll(),
  ])

  const flagOn = Object.fromEntries(flags.map((flag) => [flag.key, flag.isEnabled]))

  return methods
    .filter((method) => !method.featureFlagKey || flagOn[method.featureFlagKey])
    .map((method) => ({
      code: method.code,
      label: method.label,
      kind: method.kind,
      iconKey: method.iconKey,
      instructions: method.instructions,
      requiresProof: method.requiresProof,
      surcharge: method.surchargeAmount,
      // Bank details are public by nature - they are what the customer pays into.
      config: method.kind === 'manual_transfer' ? method.config : undefined,
    }))
}

export async function listDeliveryMethods() {
  const rows = await DeliveryMethod.findAll({
    where: { isEnabled: true },
    order: [['position', 'ASC']],
  })

  return rows.map((row) => ({
    id: row.code,
    label: row.label,
    detail: row.detail,
    price: row.priceAmount,
    freeOver: row.freeOverAmount,
    isPickup: row.isPickup,
  }))
}

// Re-prices a cart against the live catalogue. The cart is client-authoritative and lives
// in localStorage, so by the time someone checks out the prices in it may be days old and
// the stock may be gone.
export async function validateCart(lines) {
  const variantIds = lines.map((line) => line.variantId).filter(Boolean)
  const handles = lines.map((line) => line.handle)

  const variants = await ProductVariant.findAll({
    where: {
      [Op.or]: [
        variantIds.length ? { id: { [Op.in]: variantIds } } : null,
        { '$product.handle$': { [Op.in]: handles } },
      ].filter(Boolean),
    },
    include: [{ association: 'product', required: true }],
  })

  const byId = new Map(variants.map((variant) => [variant.id, variant]))
  const defaultByHandle = new Map(
    variants.filter((variant) => variant.isDefault).map((v) => [v.product.handle, v]),
  )

  return lines.map((line) => {
    const variant = byId.get(line.variantId) ?? defaultByHandle.get(line.handle)

    if (!variant || !variant.isActive || variant.product.status !== 'active') {
      return { key: line.key, removed: true, reason: 'No longer available' }
    }

    return {
      key: line.key,
      variantId: variant.id,
      currentPrice: variant.price,
      // A price change is surfaced rather than silently applied: being charged more than
      // the cart said is the single worst checkout surprise.
      priceChanged: line.price != null && line.price !== variant.price,
      inStock: variant.stockQuantity > 0,
      availableQuantity: variant.stockQuantity,
      quantityReduced: line.quantity > variant.stockQuantity,
      removed: false,
    }
  })
}

async function resolveTaxRate(country) {
  const specific = await TaxRate.findOne({ where: { country, isActive: true } })
  if (specific) return specific
  return TaxRate.findOne({ where: { isDefault: true, isActive: true } })
}

/**
 * Places an order. Everything happens in one transaction: totals, line snapshots, stock
 * decrement, the payment row and the first status event either all land or none do.
 */
export async function createOrder(payload, { customer = null } = {}) {
  const [paymentMethod, deliveryMethod] = await Promise.all([
    PaymentMethod.findOne({ where: { code: payload.paymentMethod, isEnabled: true } }),
    DeliveryMethod.findOne({ where: { code: payload.delivery, isEnabled: true } }),
  ])

  if (!paymentMethod) {
    throw unprocessable('PAYMENT_METHOD_UNAVAILABLE', 'That payment method is not available', [
      { field: 'paymentMethod', message: 'Choose another method' },
    ])
  }
  if (!deliveryMethod) {
    throw unprocessable('DELIVERY_METHOD_UNAVAILABLE', 'That delivery option is not available', [
      { field: 'delivery', message: 'Choose another option' },
    ])
  }

  // A gateway that is enabled but whose flag is off must not be reachable, even by a
  // hand-crafted request that skips the UI.
  if (paymentMethod.featureFlagKey) {
    const flag = await FeatureFlag.findByPk(paymentMethod.featureFlagKey)
    if (!flag?.isEnabled) {
      throw unprocessable('PAYMENT_METHOD_UNAVAILABLE', 'That payment method is not available', [
        { field: 'paymentMethod', message: 'Choose another method' },
      ])
    }
  }

  const result = await sequelize.transaction(async (transaction) => {
    // Locked for update so two simultaneous orders for the last unit cannot both succeed.
    //
    // `of` matters: Postgres refuses FOR UPDATE on the nullable side of an outer join, and
    // including the product produces exactly that. Locking only the variant rows is also
    // what we actually want - the stock being contended for lives there.
    const variants = await ProductVariant.findAll({
      where: { id: { [Op.in]: payload.lines.map((line) => line.variantId) } },
      include: [{ association: 'product', required: true }],
      transaction,
      lock: { level: transaction.LOCK.UPDATE, of: ProductVariant },
    })
    const byId = new Map(variants.map((variant) => [variant.id, variant]))

    const items = []
    let subtotal = 0

    for (const [index, line] of payload.lines.entries()) {
      const variant = byId.get(line.variantId)
      if (!variant || !variant.isActive || variant.product.status !== 'active') {
        throw unprocessable('LINE_UNAVAILABLE', `${line.handle} is no longer available`, [
          { field: 'lines', message: 'Remove it and try again' },
        ])
      }
      if (variant.stockQuantity < line.quantity) {
        throw unprocessable(
          'INSUFFICIENT_STOCK',
          `Only ${variant.stockQuantity} left of ${variant.product.title}`,
          [{ field: 'lines', message: `Only ${variant.stockQuantity} available` }],
        )
      }

      const image = variant.product.primaryImageId
        ? await MediaAsset.findByPk(variant.product.primaryImageId, {
            include: [{ association: 'variants' }],
            transaction,
          })
        : null

      const lineTotal = variant.price * line.quantity
      subtotal += lineTotal

      items.push({
        productId: variant.productId,
        variantId: variant.id,
        handle: variant.product.handle,
        title: variant.product.title,
        variantLabel: variant.label,
        sku: variant.sku,
        imageUrl: mediaUrl(image),
        unitPrice: variant.price,
        compareAtPrice: variant.compareAtPrice,
        quantity: line.quantity,
        lineTotal,
        giftWrap: line.giftWrap ?? false,
        giftCard: line.giftCard ?? false,
        giftMessage: line.giftMessage ?? null,
        position: index,
      })
    }

    // Re-derived from the database, never from whatever the cart drawer's preview call
    // returned - the same reason payment and delivery methods are re-validated here too.
    const discount = await resolveDiscount({
      code: payload.discountCode,
      subtotal,
      lineProductIds: items.map((item) => item.productId),
      customerId: customer?.id ?? null,
      transaction,
    })
    const discountAmount = discount ? applyDiscount(discount, subtotal) : 0

    const shipping =
      discount?.kind === 'free_shipping'
        ? 0
        : shippingCostFor(
            { priceAmount: deliveryMethod.priceAmount, freeOverAmount: deliveryMethod.freeOverAmount },
            subtotal,
          )

    const taxRate = await resolveTaxRate(payload.country)
    const totals = orderTotals({
      subtotal,
      discount: discountAmount,
      shipping,
      taxRateBp: taxRate?.rateBp ?? 0,
    })

    // COD is confirmed the moment it is placed; a bank transfer waits for the money.
    const isTransfer = paymentMethod.kind === 'manual_transfer'
    const status = isTransfer ? 'pending_payment' : 'confirmed'

    const accessToken = randomBytes(24).toString('base64url')
    const number = await nextOrderNumber(sequelize, transaction)

    const order = await Order.create(
      {
        number,
        customerId: customer?.id ?? null,
        guestEmail: customer ? null : payload.email,
        accessTokenHash: hashToken(accessToken),
        status,
        paymentStatus: 'unpaid',
        discountId: discount?.id ?? null,
        discountCode: discount?.code ?? null,
        ...totals,
        taxInclusive: taxRate?.isInclusive ?? true,
        deliveryMethodId: deliveryMethod.id,
        deliveryMethodLabel: deliveryMethod.label,
        paymentMethodId: paymentMethod.id,
        paymentMethodLabel: paymentMethod.label,
        contactEmail: payload.email,
        contactPhone: payload.phone ?? null,
        marketingOptIn: payload.marketingOptIn ?? false,
        shipName: `${payload.firstName} ${payload.lastName}`.trim(),
        shipLine1: payload.line1,
        shipLine2: payload.line2 ?? null,
        shipCity: payload.city,
        shipRegion: payload.region ?? null,
        shipPostcode: payload.postcode ?? null,
        shipCountry: payload.country,
        shipPhone: payload.phone ?? null,
        billingSame: payload.billingSame ?? true,
        customerNote: payload.note ?? null,
        placedAt: new Date(),
        confirmedAt: status === 'confirmed' ? new Date() : null,
      },
      { transaction },
    )

    for (const item of items) {
      await OrderItem.create({ ...item, orderId: order.id }, { transaction })
    }

    // Stock comes out now, with a ledger row, so the running total is always
    // reconstructable from the moves.
    for (const line of payload.lines) {
      const variant = byId.get(line.variantId)
      await variant.decrement('stockQuantity', { by: line.quantity, transaction })
      await models.InventoryMove.create(
        {
          variantId: variant.id,
          delta: -line.quantity,
          reason: 'order',
          orderId: order.id,
        },
        { transaction },
      )
    }

    const referenceCode = isTransfer ? await nextBankReference(sequelize, transaction) : null

    await Payment.create(
      {
        orderId: order.id,
        paymentMethodId: paymentMethod.id,
        kind: paymentMethod.kind,
        amount: totals.totalAmount,
        status: isTransfer ? 'pending' : 'pending',
        referenceCode,
        // What we told them to pay into, frozen. Changing the shop's bank details later
        // must not rewrite where an old payment was supposed to go.
        bankAccountSnapshot: isTransfer ? paymentMethod.config : null,
      },
      { transaction },
    )

    await OrderStatusEvent.create(
      {
        orderId: order.id,
        fromStatus: null,
        toStatus: status,
        actorType: 'system',
        metadata: { via: 'checkout' },
      },
      { transaction },
    )

    if (discount) {
      await redeemDiscount(discount, {
        orderId: order.id,
        customerId: customer?.id ?? null,
        amount: discountAmount,
        transaction,
      })
    }

    // The cart's soft holds are superseded by the real decrement above - release them
    // rather than leaving them to expire on their own clock and briefly under-report
    // availability for whatever else was in the same cart.
    await releaseHoldsForCart(payload.cartToken, order.id, { transaction })

    return { order, items, accessToken, referenceCode }
  })

  // Sent after the transaction has committed, never inside it - a slow or unreachable
  // mail server must not hold the row lock open or roll the order back.
  const email = orderConfirmedEmail({ order: result.order, items: result.items })
  await sendMail({ to: payload.email, ...email })

  return { order: result.order, accessToken: result.accessToken, referenceCode: result.referenceCode }
}

/**
 * The only way an order changes status. Validates the transition, checks the actor is
 * allowed to make it, writes the event and stamps the matching timestamp - all in one
 * transaction so history and dates can never disagree.
 */
export async function transitionOrder(
  orderId,
  toStatus,
  { actorType, actorId, role, note = null, metadata = {} } = {},
) {
  const updatedOrder = await sequelize.transaction(async (transaction) => {
    const order = await Order.findByPk(orderId, { transaction, lock: transaction.LOCK.UPDATE })
    if (!order) throw notFound('No such order')

    const from = order.status

    if (!canTransition(from, toStatus)) {
      throw unprocessable(
        'ILLEGAL_TRANSITION',
        `An order cannot go from ${from} to ${toStatus}`,
        [{ field: 'toStatus', message: `Allowed: ${(allowedFor(from, 'owner')).join(', ') || 'nothing'}` }],
      )
    }

    if (actorType === 'admin' && !allowedFor(from, role).includes(toStatus)) {
      throw forbidden(`Your role cannot move an order to ${toStatus}`)
    }

    if (actorType === 'customer' && !(toStatus === 'cancelled' && customerCanCancel(from))) {
      throw forbidden('This order can no longer be changed here')
    }

    // Reaching the courier requires a courier and a tracking number, so the fulfilment
    // endpoint is the only way in - a bare status button must not get there.
    if (toStatus === 'handed_to_courier' && (!order.courierId || !order.trackingNumber)) {
      throw unprocessable(
        'FULFILMENT_REQUIRED',
        'Set a courier and tracking number before handing the parcel over',
        [{ field: 'trackingNumber', message: 'Required' }],
      )
    }

    const patch = { status: toStatus }
    const stamp = STATUS_TIMESTAMPS[toStatus]
    if (stamp) patch[stamp] = new Date()

    // Cash on delivery is paid at the door, so delivery IS the payment event.
    if (toStatus === 'delivered' && order.paymentStatus === 'unpaid') {
      const payment = await Payment.findOne({ where: { orderId: order.id }, transaction })
      if (payment?.kind === 'offline') {
        patch.paymentStatus = 'paid'
        await payment.update({ status: 'succeeded', verifiedAt: new Date() }, { transaction })
      }
    }

    // Cancelling or returning puts the stock back, with a ledger row for each line.
    if (['cancelled', 'returned_to_sender'].includes(toStatus)) {
      const items = await OrderItem.findAll({ where: { orderId: order.id }, transaction })
      for (const item of items) {
        if (!item.variantId) continue
        await ProductVariant.increment('stockQuantity', {
          by: item.quantity,
          where: { id: item.variantId },
          transaction,
        })
        await models.InventoryMove.create(
          { variantId: item.variantId, delta: item.quantity, reason: 'cancel', orderId: order.id },
          { transaction },
        )
      }
    }

    await order.update(patch, { transaction })

    await OrderStatusEvent.create(
      { orderId: order.id, fromStatus: from, toStatus, actorType, actorId, note, metadata },
      { transaction },
    )

    return order
  })

  if (toStatus === 'handed_to_courier') {
    const courier = updatedOrder.courierId ? await Courier.findByPk(updatedOrder.courierId) : null
    const email = orderShippedEmail({
      order: {
        number: updatedOrder.number,
        trackingNumber: updatedOrder.trackingNumber,
        trackingUrl: updatedOrder.trackingUrl,
        courierName: courier?.name,
      },
    })
    await sendMail({ to: updatedOrder.contactEmail, ...email })
  }

  return updatedOrder
}

export async function setFulfilment(orderId, { courierId, trackingNumber }) {
  const [order, courier] = await Promise.all([
    Order.findByPk(orderId),
    Courier.findByPk(courierId),
  ])

  if (!order) throw notFound('No such order')
  if (!courier) throw notFound('No such courier')

  // Built once and stored, so editing a courier's template later never rewrites the
  // tracking links on orders that already shipped.
  const trackingUrl = courier.trackingUrlTemplate
    ? courier.trackingUrlTemplate.replace('{tracking}', encodeURIComponent(trackingNumber))
    : null

  await order.update({ courierId: courier.id, trackingNumber, trackingUrl })
  return order
}

export async function verifyPayment(orderId, paymentId, { adminId, approve, reason }) {
  const result = await sequelize.transaction(async (transaction) => {
    const payment = await Payment.findOne({
      where: { id: paymentId, orderId },
      transaction,
      lock: transaction.LOCK.UPDATE,
    })
    if (!payment) throw notFound('No such payment')

    if (payment.status === 'succeeded') {
      throw conflict('ALREADY_VERIFIED', 'That payment has already been verified')
    }

    const order = await Order.findByPk(orderId, { transaction, lock: transaction.LOCK.UPDATE })

    if (!approve) {
      await payment.update(
        { status: 'failed', failureReason: reason ?? null, verifiedByAdminId: adminId },
        { transaction },
      )
      await order.update({ paymentStatus: 'failed' }, { transaction })
      return { order, payment }
    }

    await payment.update(
      { status: 'succeeded', verifiedAt: new Date(), verifiedByAdminId: adminId },
      { transaction },
    )
    await order.update({ paymentStatus: 'paid' }, { transaction })

    // Verifying the money is what moves the order forward, recorded as a system action
    // with the admin who approved it in the metadata.
    if (order.status === 'pending_payment') {
      await order.update({ status: 'confirmed', confirmedAt: new Date() }, { transaction })
      await OrderStatusEvent.create(
        {
          orderId: order.id,
          fromStatus: 'pending_payment',
          toStatus: 'confirmed',
          actorType: 'system',
          metadata: { verifiedBy: adminId },
        },
        { transaction },
      )
    }

    return { order, payment }
  })

  if (approve) {
    const email = paymentVerifiedEmail({ order: { number: result.order.number, totalAmount: result.order.totalAmount } })
    await sendMail({ to: result.order.contactEmail, ...email })
  }

  return result
}

export async function attachProof(orderId, mediaId) {
  const payment = await Payment.findOne({ where: { orderId } })
  if (!payment) throw notFound('No payment on that order')

  await payment.update({ proofMediaId: mediaId, status: 'awaiting_verification' })
  await Order.update({ paymentStatus: 'awaiting_verification' }, { where: { id: orderId } })

  return payment
}

// Guest receipt lookup. The token is compared by hash, and the order is only returned when
// it matches - so knowing an order number is not enough.
export async function findByAccessToken(token) {
  if (!token) throw notFound('No such order')

  const order = await Order.scope('withSecrets').findOne({
    where: { accessTokenHash: hashToken(token) },
    include: [
      { association: 'items', separate: true, order: [['position', 'ASC']] },
      { association: 'events', separate: true, order: [['createdAt', 'ASC']] },
      { association: 'courier' },
      { association: 'payments' },
    ],
  })

  if (!order) throw notFound('No such order')
  return order
}

export { hashToken }
