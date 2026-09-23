import { Router } from 'express'
import { Op } from 'sequelize'
import { z } from 'zod'
import models from '../../db/models/index.js'
import { validate } from '../../middleware/validate.js'
import { requireCustomer } from '../../middleware/auth.js'
import { hashPassword } from '../../services/authService.js'
import { serializeCustomer } from './auth.js'
import { forbidden, notFound } from '../../lib/errors.js'

const { Customer, Address, Order } = models
const router = Router()
const asyncRoute = (handler) => (req, res, next) => handler(req, res, next).catch(next)

// Everything below belongs to the signed-in customer and nobody else. Each handler scopes
// its query by req.customer.id rather than trusting an id from the URL, so there is no
// route here that can be made to return someone else's data by changing a parameter.
router.use(requireCustomer)

router.get(
  '/me',
  asyncRoute(async (req, res) => {
    res.json({ data: serializeCustomer(req.customer) })
  }),
)

router.patch(
  '/me',
  validate(
    z.object({
      firstName: z.string().min(1, 'Required').optional(),
      lastName: z.string().min(1, 'Required').optional(),
      phone: z.string().nullish(),
      birthday: z.string().nullish(),
      marketingOptIn: z.boolean().optional(),
      smsOptIn: z.boolean().optional(),
      password: z.string().min(8, 'Use at least 8 characters').optional(),
    }),
  ),
  asyncRoute(async (req, res) => {
    const { password, ...rest } = req.body
    const patch = { ...rest }
    if (password) patch.passwordHash = await hashPassword(password)

    await req.customer.update(patch)
    res.json({ data: serializeCustomer(req.customer) })
  }),
)

// --- addresses -------------------------------------------------------------------------
const addressSchema = z.object({
  label: z.string().nullish(),
  name: z.string().min(1, 'Required'),
  line1: z.string().min(1, 'Required'),
  line2: z.string().nullish(),
  city: z.string().min(1, 'Required'),
  region: z.string().nullish(),
  postcode: z.string().nullish(),
  country: z.string().min(1, 'Required'),
  phone: z.string().nullish(),
  isDefault: z.boolean().default(false),
})

function serializeAddress(address) {
  return {
    id: address.id,
    label: address.label,
    isDefault: address.isDefault,
    name: address.name,
    line1: address.line1,
    line2: address.line2,
    city: address.city,
    region: address.region,
    postcode: address.postcode,
    country: address.country,
    phone: address.phone,
  }
}

// At most one default per customer is enforced by a partial unique index, so the previous
// default has to be cleared before the new one is written or the insert is rejected.
async function clearOtherDefaults(customerId, exceptId = null) {
  await Address.update(
    { isDefault: false },
    { where: { customerId, ...(exceptId ? { id: { [Op.ne]: exceptId } } : {}) } },
  )
}

router.get(
  '/me/addresses',
  asyncRoute(async (req, res) => {
    const rows = await Address.findAll({
      where: { customerId: req.customer.id },
      order: [
        ['isDefault', 'DESC'],
        ['createdAt', 'ASC'],
      ],
    })
    res.json({ data: rows.map(serializeAddress) })
  }),
)

router.post(
  '/me/addresses',
  validate(addressSchema),
  asyncRoute(async (req, res) => {
    const count = await Address.count({ where: { customerId: req.customer.id } })
    // The first address a customer saves is their default whether they asked or not -
    // otherwise checkout has nothing to preselect.
    const isDefault = req.body.isDefault || count === 0

    if (isDefault) await clearOtherDefaults(req.customer.id)

    const address = await Address.create({
      ...req.body,
      isDefault,
      customerId: req.customer.id,
    })

    res.status(201).json({ data: serializeAddress(address) })
  }),
)

router.patch(
  '/me/addresses/:id',
  validate(addressSchema.partial()),
  asyncRoute(async (req, res) => {
    const address = await Address.findOne({
      where: { id: req.params.id, customerId: req.customer.id },
    })
    if (!address) throw notFound('No such address')

    if (req.body.isDefault) await clearOtherDefaults(req.customer.id, address.id)
    await address.update(req.body)

    res.json({ data: serializeAddress(address) })
  }),
)

router.delete(
  '/me/addresses/:id',
  asyncRoute(async (req, res) => {
    const address = await Address.findOne({
      where: { id: req.params.id, customerId: req.customer.id },
    })
    if (!address) throw notFound('No such address')

    const wasDefault = address.isDefault
    await address.destroy()

    // Promote another address rather than leaving the customer with none marked, which
    // would make checkout preselect nothing.
    if (wasDefault) {
      const next = await Address.findOne({
        where: { customerId: req.customer.id },
        order: [['createdAt', 'ASC']],
      })
      if (next) await next.update({ isDefault: true })
    }

    res.status(204).end()
  }),
)

// --- orders ------------------------------------------------------------------------------
// Read-only here. Placing an order is the checkout flow, which is a later phase; this is
// the history the account pages have been rendering from mock data.
function serializeOrder(order) {
  return {
    id: order.number,
    placedOn: order.placedAt,
    status: order.status,
    paymentStatus: order.paymentStatus,
    deliveredOn: order.deliveredAt,
    trackingNumber: order.trackingNumber,
    trackingUrl: order.trackingUrl,
    courier: order.courier ? { name: order.courier.name } : null,
    paymentLabel: order.paymentMethodLabel,
    subtotal: order.subtotalAmount,
    discount: order.discountAmount,
    shipping: order.shippingAmount,
    tax: order.taxAmount,
    taxInclusive: order.taxInclusive,
    total: order.totalAmount,
    shippingAddress: {
      name: order.shipName,
      line1: order.shipLine1,
      line2: order.shipLine2,
      city: order.shipCity,
      region: order.shipRegion,
      postcode: order.shipPostcode,
      country: order.shipCountry,
      phone: order.shipPhone,
    },
    // Line items describe themselves - title, image and price were snapshotted at
    // purchase, so an archived product can never blank out order history.
    items: (order.items ?? []).map((item) => ({
      handle: item.handle,
      title: item.title,
      variantLabel: item.variantLabel,
      image: item.imageUrl,
      quantity: item.quantity,
      price: item.unitPrice,
      lineTotal: item.lineTotal,
    })),
    events: (order.events ?? [])
      .slice()
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
      .map((event) => ({
        status: event.toStatus,
        at: event.createdAt,
        note: event.note,
      })),
  }
}

const ORDER_INCLUDE = [
  { association: 'items', separate: true, order: [['position', 'ASC']] },
  { association: 'events', separate: true, order: [['createdAt', 'ASC']] },
  { association: 'courier' },
]

router.get(
  '/me/orders',
  asyncRoute(async (req, res) => {
    const orders = await Order.findAll({
      where: { customerId: req.customer.id },
      include: ORDER_INCLUDE,
      order: [['placedAt', 'DESC']],
    })
    res.json({ data: orders.map(serializeOrder) })
  }),
)

router.get(
  '/me/orders/:number',
  asyncRoute(async (req, res) => {
    const order = await Order.findOne({
      where: { number: req.params.number, customerId: req.customer.id },
      include: ORDER_INCLUDE,
    })
    if (!order) throw notFound('No such order')
    res.json({ data: serializeOrder(order) })
  }),
)

router.post(
  '/me/orders/:number/cancel',
  asyncRoute(async (req, res) => {
    const order = await Order.findOne({
      where: { number: req.params.number, customerId: req.customer.id },
    })
    if (!order) throw notFound('No such order')

    // A customer may only cancel before the order has been worked on. Everything past
    // that is a conversation with support, not a button.
    if (!['pending_payment', 'confirmed'].includes(order.status)) {
      throw forbidden('This order is already being prepared — contact us to change it')
    }

    await order.update({ status: 'cancelled', cancelledAt: new Date() })
    await models.OrderStatusEvent.create({
      orderId: order.id,
      fromStatus: order.previous('status') ?? null,
      toStatus: 'cancelled',
      actorType: 'customer',
      actorId: req.customer.id,
    })

    res.json({ data: { number: order.number, status: order.status } })
  }),
)

export default router
