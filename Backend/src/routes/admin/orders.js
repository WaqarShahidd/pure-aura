import { Router } from 'express'
import { Op } from 'sequelize'
import { z } from 'zod'
import models from '../../db/models/index.js'
import { validate } from '../../middleware/validate.js'
import { requireRole } from '../../middleware/auth.js'
import { auditFrom } from '../../services/auditService.js'
import * as orders from '../../services/orderService.js'
import { serializeOrder } from '../../serializers/order.js'
import { allowedFor, ORDER_STATUSES, TRANSITIONS } from '../../lib/orderStatus.js'
import { notFound } from '../../lib/errors.js'

const { Order, Courier } = models
const router = Router()
const asyncRoute = (handler) => (req, res, next) => handler(req, res, next).catch(next)

const LIST_INCLUDE = [
  { association: 'items', separate: true, order: [['position', 'ASC']] },
  { association: 'courier' },
  { association: 'customer' },
]

router.get(
  '/orders',
  validate(
    z.object({
      page: z.coerce.number().int().min(1).default(1),
      perPage: z.coerce.number().int().min(1).max(100).default(25),
      status: z.string().optional(),
      paymentStatus: z.string().optional(),
      q: z.string().optional(),
    }),
    'query',
  ),
  asyncRoute(async (req, res) => {
    const { page, perPage, status, paymentStatus, q } = req.query
    const where = {}

    // Comma-separated so the saved views ("Ready to hand over", "In transit") are a
    // single query parameter rather than a bespoke endpoint each.
    if (status) where.status = { [Op.in]: status.split(',') }
    if (paymentStatus) where.paymentStatus = { [Op.in]: paymentStatus.split(',') }
    if (q) {
      where[Op.or] = [
        { number: { [Op.iLike]: `%${q}%` } },
        { contactEmail: { [Op.iLike]: `%${q}%` } },
        { shipName: { [Op.iLike]: `%${q}%` } },
      ]
    }

    const { rows, count } = await Order.findAndCountAll({
      where,
      include: LIST_INCLUDE,
      order: [['placedAt', 'DESC']],
      limit: perPage,
      offset: (page - 1) * perPage,
      distinct: true,
    })

    res.json({
      data: rows.map((order) => ({
        ...serializeOrder(order, { includeEvents: false }),
        customerName: order.shipName,
        itemCount: (order.items ?? []).reduce((sum, item) => sum + item.quantity, 0),
      })),
      meta: { page, perPage, total: count, totalPages: Math.max(1, Math.ceil(count / perPage)) },
    })
  }),
)

// The transition matrix is exported so the UI can grey out buttons the server would
// refuse anyway - one source of truth for "what can happen next".
router.get(
  '/orders/meta',
  asyncRoute(async (req, res) => {
    const couriers = await Courier.findAll({
      where: { isActive: true },
      order: [['position', 'ASC']],
    })
    res.json({
      data: {
        statuses: ORDER_STATUSES,
        transitions: TRANSITIONS,
        couriers: couriers.map((row) => ({ id: row.id, name: row.name, code: row.code })),
      },
    })
  }),
)

router.get(
  '/orders/:number',
  asyncRoute(async (req, res) => {
    const order = await Order.findOne({
      where: { number: req.params.number },
      include: [
        ...LIST_INCLUDE,
        { association: 'events', separate: true, order: [['createdAt', 'ASC']] },
        { association: 'payments', include: [{ association: 'method' }] },
      ],
    })
    if (!order) throw notFound('No such order')

    res.json({
      data: {
        ...serializeOrder(order),
        id: order.id,
        adminNote: order.adminNote,
        courierId: order.courierId,
        // What THIS admin is allowed to do next, not just what is theoretically legal.
        allowedTransitions: allowedFor(order.status, req.admin.role),
        payments: (order.payments ?? []).map((payment) => ({
          id: payment.id,
          kind: payment.kind,
          status: payment.status,
          amount: payment.amount,
          referenceCode: payment.referenceCode,
          proofMediaId: payment.proofMediaId,
          verifiedAt: payment.verifiedAt,
          failureReason: payment.failureReason,
        })),
      },
    })
  }),
)

router.post(
  '/orders/:number/transition',
  validate(z.object({ toStatus: z.string(), note: z.string().nullish() })),
  asyncRoute(async (req, res) => {
    const order = await Order.findOne({ where: { number: req.params.number } })
    if (!order) throw notFound('No such order')

    const before = order.status
    await orders.transitionOrder(order.id, req.body.toStatus, {
      actorType: 'admin',
      actorId: req.admin.id,
      role: req.admin.role,
      note: req.body.note ?? null,
    })

    await auditFrom(req)({
      action: 'order.transition',
      entityType: 'order',
      entityId: order.number,
      before: { status: before },
      after: { status: req.body.toStatus },
    })

    res.json({ data: { number: order.number, status: req.body.toStatus } })
  }),
)

router.patch(
  '/orders/:number/fulfilment',
  validate(
    z.object({
      courierId: z.string().uuid('Pick a courier'),
      trackingNumber: z.string().min(1, 'Required'),
    }),
  ),
  asyncRoute(async (req, res) => {
    const order = await Order.findOne({ where: { number: req.params.number } })
    if (!order) throw notFound('No such order')

    const updated = await orders.setFulfilment(order.id, req.body)

    await auditFrom(req)({
      action: 'order.fulfilment',
      entityType: 'order',
      entityId: order.number,
      after: { trackingNumber: updated.trackingNumber },
    })

    res.json({
      data: {
        number: updated.number,
        trackingNumber: updated.trackingNumber,
        trackingUrl: updated.trackingUrl,
      },
    })
  }),
)

router.post(
  '/orders/:number/payments/:paymentId/verify',
  requireRole('manager'),
  validate(z.object({ approve: z.boolean(), reason: z.string().nullish() })),
  asyncRoute(async (req, res) => {
    const order = await Order.findOne({ where: { number: req.params.number } })
    if (!order) throw notFound('No such order')

    const result = await orders.verifyPayment(order.id, req.params.paymentId, {
      adminId: req.admin.id,
      approve: req.body.approve,
      reason: req.body.reason,
    })

    await auditFrom(req)({
      action: req.body.approve ? 'payment.verify' : 'payment.reject',
      entityType: 'order',
      entityId: order.number,
      after: { paymentStatus: result.order.paymentStatus },
    })

    res.json({
      data: { number: order.number, paymentStatus: result.order.paymentStatus, status: result.order.status },
    })
  }),
)

export default router
