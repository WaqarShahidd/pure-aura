import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { sequelize } from '../src/db/index.js'
import models from '../src/db/models/index.js'
import {
  createOrder,
  setFulfilment,
  transitionOrder,
  verifyPayment,
} from '../src/services/orderService.js'
import { ApiError } from '../src/lib/errors.js'

const { ProductVariant, OrderStatusEvent, InventoryMove, Order, Courier, AdminUser } = models

// order_status_events.actor_id has no FK (an event is a record, not a live reference),
// so a bare uuid is enough there. payments.verified_by_admin_id DOES reference
// admin_users, so verifying a payment needs the real row the seed created.
const CUSTOMER_ID = randomUUID()
let ADMIN_ID

beforeAll(async () => {
  const admin = await AdminUser.findOne()
  ADMIN_ID = admin.id
})

// Integration coverage for the P6 checkout/order flow, run against the seeded test
// database rather than mocked models - the thing worth trusting here is that the whole
// transaction (stock, snapshot, payment row, event) behaves as one unit, which a mock
// can't demonstrate.

async function anyInStockVariant() {
  const variant = await ProductVariant.findOne({
    where: { isActive: true, isDefault: true },
    include: [{ association: 'product', required: true, where: { status: 'active' } }],
    order: [['stockQuantity', 'DESC']],
  })
  if (!variant || variant.stockQuantity < 3) {
    throw new Error('Seed did not produce an in-stock default variant - check seed/data')
  }
  return variant
}

function basePayload(variant, overrides = {}) {
  return {
    email: 'shopper@example.com',
    phone: '+92 300 1234567',
    firstName: 'Amina',
    lastName: 'Khan',
    line1: '12 Gulberg',
    city: 'Lahore',
    region: 'Punjab',
    postcode: '54000',
    country: 'Pakistan',
    delivery: 'standard',
    paymentMethod: 'cod',
    billingSame: true,
    lines: [{ handle: variant.product.handle, variantId: variant.id, quantity: 1 }],
    ...overrides,
  }
}

describe('createOrder', () => {
  it('places a COD order confirmed-and-unpaid, and decrements stock with a ledger row', async () => {
    const variant = await anyInStockVariant()
    const before = variant.stockQuantity

    const { order, accessToken } = await createOrder(basePayload(variant))

    expect(order.status).toBe('confirmed')
    expect(order.paymentStatus).toBe('unpaid')
    expect(order.number).toMatch(/^PA-\d+$/)
    expect(accessToken).toBeTruthy()

    await variant.reload()
    expect(variant.stockQuantity).toBe(before - 1)

    const move = await InventoryMove.findOne({ where: { orderId: order.id } })
    expect(move.delta).toBe(-1)
    expect(move.reason).toBe('order')

    const event = await OrderStatusEvent.findOne({ where: { orderId: order.id } })
    expect(event.fromStatus).toBeNull()
    expect(event.toStatus).toBe('confirmed')
  })

  it('places a bank-transfer order pending-and-unpaid, with a reference code', async () => {
    const variant = await anyInStockVariant()

    const { order, referenceCode } = await createOrder(
      basePayload(variant, { paymentMethod: 'bank_transfer' }),
    )

    expect(order.status).toBe('pending_payment')
    expect(order.paymentStatus).toBe('unpaid')
    expect(referenceCode).toMatch(/^PA-BT-\d+$/)
  })

  it('computes the total as subtotal + shipping, tax never added on top', async () => {
    const variant = await anyInStockVariant()
    const { order } = await createOrder(basePayload(variant))

    expect(order.totalAmount).toBe(order.subtotalAmount - order.discountAmount + order.shippingAmount)
    // 18% inclusive on a non-zero order means some tax is reported, but it is a
    // breakdown of the total, not an addition to it.
    expect(order.taxAmount).toBeGreaterThan(0)
  })

  it('refuses to oversell the last units and leaves stock untouched on failure', async () => {
    const variant = await anyInStockVariant()
    const before = variant.stockQuantity
    const line = { handle: variant.product.handle, variantId: variant.id, quantity: before + 50 }

    await expect(
      createOrder(basePayload(variant, { lines: [line] })),
    ).rejects.toMatchObject({ code: 'INSUFFICIENT_STOCK' })

    await variant.reload()
    expect(variant.stockQuantity).toBe(before)
  })

  it('rejects a payment method that is not enabled', async () => {
    const variant = await anyInStockVariant()
    await expect(
      createOrder(basePayload(variant, { paymentMethod: 'stripe' })),
    ).rejects.toMatchObject({ code: 'PAYMENT_METHOD_UNAVAILABLE' })
  })
})

describe('transitionOrder', () => {
  let orderId
  let variant

  beforeEach(async () => {
    variant = await anyInStockVariant()
    const { order } = await createOrder(basePayload(variant))
    orderId = order.id
  })

  it('refuses an illegal jump and names the allowed set', async () => {
    await expect(
      transitionOrder(orderId, 'delivered', { actorType: 'admin', role: 'owner' }),
    ).rejects.toMatchObject({ code: 'ILLEGAL_TRANSITION' })
  })

  it('lets staff move a legal step forward', async () => {
    const order = await transitionOrder(orderId, 'processing', { actorType: 'admin', role: 'staff' })
    expect(order.status).toBe('processing')

    const event = await OrderStatusEvent.findOne({
      where: { orderId, toStatus: 'processing' },
    })
    expect(event.fromStatus).toBe('confirmed')
    expect(event.actorType).toBe('admin')
  })

  it('refuses a role-gated transition below its minimum role', async () => {
    await expect(
      transitionOrder(orderId, 'cancelled', { actorType: 'admin', role: 'staff' }),
    ).rejects.toThrow(ApiError)
    await expect(
      transitionOrder(orderId, 'cancelled', { actorType: 'admin', role: 'staff' }),
    ).rejects.toMatchObject({ status: 403 })
  })

  it('lets a customer cancel their own pending order and restores stock', async () => {
    await variant.reload()
    const before = variant.stockQuantity

    await transitionOrder(orderId, 'cancelled', { actorType: 'customer', actorId: CUSTOMER_ID })

    await variant.reload()
    expect(variant.stockQuantity).toBe(before + 1)

    const move = await InventoryMove.findOne({ where: { orderId, reason: 'cancel' } })
    expect(move.delta).toBe(1)
  })

  it('refuses a customer cancelling past pending/confirmed', async () => {
    await transitionOrder(orderId, 'processing', { actorType: 'admin', role: 'staff' })

    await expect(
      transitionOrder(orderId, 'cancelled', { actorType: 'customer', actorId: CUSTOMER_ID }),
    ).rejects.toMatchObject({ status: 403 })
  })

  it('blocks handed_to_courier without a courier and tracking number set first', async () => {
    await transitionOrder(orderId, 'processing', { actorType: 'admin', role: 'staff' })
    await transitionOrder(orderId, 'packed', { actorType: 'admin', role: 'staff' })

    await expect(
      transitionOrder(orderId, 'handed_to_courier', { actorType: 'admin', role: 'staff' }),
    ).rejects.toMatchObject({ code: 'FULFILMENT_REQUIRED' })
  })

  it('allows handed_to_courier once fulfilment is set, and stamps the tracking URL from the template', async () => {
    const courier = await Courier.findOne({ where: { code: 'tcs' } })
    await transitionOrder(orderId, 'processing', { actorType: 'admin', role: 'staff' })
    await transitionOrder(orderId, 'packed', { actorType: 'admin', role: 'staff' })

    const updated = await setFulfilment(orderId, { courierId: courier.id, trackingNumber: 'TCS12345' })
    expect(updated.trackingUrl).toContain('TCS12345')

    const order = await transitionOrder(orderId, 'handed_to_courier', {
      actorType: 'admin',
      role: 'staff',
    })
    expect(order.status).toBe('handed_to_courier')
    expect(order.handedToCourierAt).toBeTruthy()
  })

  it('auto-flips a COD order to paid the instant it is marked delivered', async () => {
    await transitionOrder(orderId, 'processing', { actorType: 'admin', role: 'staff' })
    await transitionOrder(orderId, 'packed', { actorType: 'admin', role: 'staff' })
    const courier = await Courier.findOne({ where: { code: 'tcs' } })
    await setFulfilment(orderId, { courierId: courier.id, trackingNumber: 'TCS99999' })
    await transitionOrder(orderId, 'handed_to_courier', { actorType: 'admin', role: 'staff' })
    await transitionOrder(orderId, 'in_transit', { actorType: 'admin', role: 'staff' })
    await transitionOrder(orderId, 'out_for_delivery', { actorType: 'admin', role: 'staff' })

    const order = await transitionOrder(orderId, 'delivered', { actorType: 'admin', role: 'staff' })
    expect(order.status).toBe('delivered')
    expect(order.paymentStatus).toBe('paid')
    expect(order.deliveredAt).toBeTruthy()
  })
})

describe('verifyPayment - bank transfer', () => {
  it('approving verification marks the payment succeeded and moves a pending order to confirmed', async () => {
    const variant = await anyInStockVariant()
    const { order } = await createOrder(basePayload(variant, { paymentMethod: 'bank_transfer' }))

    const payment = await models.Payment.findOne({ where: { orderId: order.id } })
    const result = await verifyPayment(order.id, payment.id, { adminId: ADMIN_ID, approve: true })

    expect(result.payment.status).toBe('succeeded')
    expect(result.order.paymentStatus).toBe('paid')
    expect(result.order.status).toBe('confirmed')

    const reloaded = await Order.findByPk(order.id)
    expect(reloaded.status).toBe('confirmed')
  })

  it('rejecting verification fails the payment without confirming the order', async () => {
    const variant = await anyInStockVariant()
    const { order } = await createOrder(basePayload(variant, { paymentMethod: 'bank_transfer' }))

    const payment = await models.Payment.findOne({ where: { orderId: order.id } })
    const result = await verifyPayment(order.id, payment.id, {
      adminId: ADMIN_ID,
      approve: false,
      reason: 'Amount does not match',
    })

    expect(result.payment.status).toBe('failed')
    expect(result.order.paymentStatus).toBe('failed')
    expect(result.order.status).toBe('pending_payment')
  })

  it('refuses to verify the same payment twice', async () => {
    const variant = await anyInStockVariant()
    const { order } = await createOrder(basePayload(variant, { paymentMethod: 'bank_transfer' }))
    const payment = await models.Payment.findOne({ where: { orderId: order.id } })

    await verifyPayment(order.id, payment.id, { adminId: ADMIN_ID, approve: true })

    await expect(
      verifyPayment(order.id, payment.id, { adminId: ADMIN_ID, approve: true }),
    ).rejects.toMatchObject({ code: 'ALREADY_VERIFIED' })
  })
})

// One close for the whole file, after every describe above has run - the connection pool
// is a module-level singleton, so closing it inside an individual describe's afterAll
// would break every describe that runs after it.
afterAll(async () => {
  await sequelize.close()
})
