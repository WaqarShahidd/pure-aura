import { Router } from 'express'
import multer from 'multer'
import { z } from 'zod'
import { validate } from '../../middleware/validate.js'
import { optionalCustomer } from '../../middleware/auth.js'
import * as orders from '../../services/orderService.js'
import * as inventory from '../../services/inventoryService.js'
import * as discounts from '../../services/discountService.js'
import { uploadMedia } from '../../services/mediaService.js'
import { serializeOrder } from '../../serializers/order.js'
import models from '../../db/models/index.js'
import { forbidden } from '../../lib/errors.js'

const router = Router()
const asyncRoute = (handler) => (req, res, next) => handler(req, res, next).catch(next)

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } })

router.get(
  '/payment-methods',
  asyncRoute(async (req, res) => {
    res.json({ data: await orders.listPaymentMethods() })
  }),
)

router.get(
  '/delivery-methods',
  asyncRoute(async (req, res) => {
    res.json({ data: await orders.listDeliveryMethods() })
  }),
)

// Adding to cart calls this. A 422 here is what "two browsers, one unit" resolves to -
// the loser finds out before checkout, not at it.
router.post(
  '/carts/hold',
  validate(
    z.object({
      cartToken: z.string().min(1, 'Required'),
      variantId: z.string().uuid(),
      quantity: z.number().int().min(1),
    }),
  ),
  asyncRoute(async (req, res) => {
    const hold = await inventory.placeHold(req.body)
    res.status(201).json({ data: { id: hold.id, expiresAt: hold.expiresAt } })
  }),
)

// The cart drawer's live check as someone types a code. Not authoritative - createOrder
// re-validates from scratch, the same way it already does for payment and delivery.
router.post(
  '/carts/discount',
  validate(
    z.object({
      code: z.string().min(1, 'Required'),
      subtotal: z.number().int().min(0),
    }),
  ),
  asyncRoute(async (req, res) => {
    res.json({ data: await discounts.previewDiscount(req.body) })
  }),
)

router.post(
  '/carts/validate',
  validate(
    z.object({
      lines: z.array(
        z.object({
          key: z.string(),
          handle: z.string(),
          variantId: z.string().uuid().nullish(),
          quantity: z.number().int().min(1),
          price: z.number().int().nullish(),
        }),
      ),
    }),
  ),
  asyncRoute(async (req, res) => {
    res.json({ data: await orders.validateCart(req.body.lines) })
  }),
)

// Error copy matches the storefront's existing inline validation strings exactly.
const orderSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  phone: z.string().nullish(),
  marketingOptIn: z.boolean().default(false),
  firstName: z.string().min(1, 'Required'),
  lastName: z.string().min(1, 'Required'),
  line1: z.string().min(1, 'Required'),
  line2: z.string().nullish(),
  city: z.string().min(1, 'Required'),
  region: z.string().nullish(),
  postcode: z.string().nullish(),
  country: z.string().min(1, 'Required'),
  delivery: z.string().min(1, 'Required'),
  paymentMethod: z.string().min(1, 'Required'),
  billingSame: z.boolean().default(true),
  note: z.string().nullish(),
  cartToken: z.string().nullish(),
  discountCode: z.string().nullish(),
  lines: z
    .array(
      z.object({
        handle: z.string(),
        variantId: z.string().uuid(),
        quantity: z.number().int().min(1),
        giftWrap: z.boolean().default(false),
        giftCard: z.boolean().default(false),
        giftMessage: z.string().nullish(),
      }),
    )
    .min(1, 'Your cart is empty'),
})

// optionalCustomer, not requireCustomer: guests check out too, and a signed-in customer
// simply gets the order attached to their account.
router.post(
  '/orders',
  optionalCustomer,
  validate(orderSchema),
  asyncRoute(async (req, res) => {
    const { order, accessToken, referenceCode } = await orders.createOrder(req.body, {
      customer: req.customer ?? null,
    })

    const full = await models.Order.findByPk(order.id, {
      include: [
        { association: 'items', separate: true, order: [['position', 'ASC']] },
        { association: 'events', separate: true },
        { association: 'payments' },
        { association: 'courier' },
      ],
    })

    // The token is returned ONCE. It goes in the confirmation URL so a refresh still
    // resolves the order - the old flow kept it in router state and lost it on reload.
    res.status(201).json({
      data: { ...serializeOrder(full), accessToken, referenceCode },
    })
  }),
)

router.get(
  '/orders/lookup',
  asyncRoute(async (req, res) => {
    const order = await orders.findByAccessToken(req.query.token)
    res.json({ data: serializeOrder(order) })
  }),
)

// Proof upload is the one place a non-admin writes to storage. It lands under the private
// prefix, which is never served statically under either driver.
router.post(
  '/orders/:number/proof',
  optionalCustomer,
  upload.single('file'),
  asyncRoute(async (req, res) => {
    const order = await models.Order.scope('withSecrets').findOne({
      where: { number: req.params.number },
    })
    if (!order) throw forbidden('No such order')

    const token = req.query.token ?? req.body?.token
    const ownsByToken = token && order.accessTokenHash === orders.hashToken(token)
    const ownsByAccount = req.customer && order.customerId === req.customer.id
    if (!ownsByToken && !ownsByAccount) throw forbidden('No such order')

    const { asset } = await uploadMedia({
      buffer: req.file?.buffer,
      filename: req.file?.originalname,
      folder: 'payment-proofs',
      visibility: 'private',
      allowDocuments: true,
    })

    await orders.attachProof(order.id, asset.id)
    res.status(201).json({ data: { received: true } })
  }),
)

export default router
