import { Router } from 'express'
import { Op, fn, col } from 'sequelize'
import { z } from 'zod'
import models from '../../db/models/index.js'
import { validate } from '../../middleware/validate.js'
import { requireRole } from '../../middleware/auth.js'
import { auditFrom } from '../../services/auditService.js'
import { notFound } from '../../lib/errors.js'

const { Customer, Address, Order } = models
const router = Router()
const asyncRoute = (handler) => (req, res, next) => handler(req, res, next).catch(next)

// The default scope excludes passwordHash, so there is no route here that can leak it
// even by accident - reaching it needs an explicit .scope('withSecrets').
router.get(
  '/customers',
  validate(
    z.object({
      page: z.coerce.number().int().min(1).default(1),
      perPage: z.coerce.number().int().min(1).max(100).default(25),
      q: z.string().optional(),
      status: z.enum(['active', 'blocked']).optional(),
    }),
    'query',
  ),
  asyncRoute(async (req, res) => {
    const { page, perPage, q, status } = req.query
    const where = {}
    if (status) where.status = status
    if (q) {
      where[Op.or] = [
        { email: { [Op.iLike]: `%${q}%` } },
        { firstName: { [Op.iLike]: `%${q}%` } },
        { lastName: { [Op.iLike]: `%${q}%` } },
      ]
    }

    const { rows, count } = await Customer.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: perPage,
      offset: (page - 1) * perPage,
    })

    // Order counts and lifetime value in one grouped query rather than one per row.
    const totals = await Order.findAll({
      attributes: [
        'customerId',
        [fn('count', col('id')), 'orderCount'],
        [fn('sum', col('total_amount')), 'lifetimeValue'],
      ],
      where: { customerId: { [Op.in]: rows.map((row) => row.id) } },
      group: ['customerId'],
      raw: true,
    })
    const byCustomer = Object.fromEntries(totals.map((row) => [row.customerId, row]))

    res.json({
      data: rows.map((row) => ({
        id: row.id,
        email: row.email,
        firstName: row.firstName,
        lastName: row.lastName,
        phone: row.phone,
        status: row.status,
        marketingOptIn: row.marketingOptIn,
        rewardPoints: row.rewardPoints,
        createdAt: row.createdAt,
        lastLoginAt: row.lastLoginAt,
        // A guest who ordered but never registered has no password on file.
        isRegistered: Boolean(row.lastLoginAt),
        orderCount: Number(byCustomer[row.id]?.orderCount ?? 0),
        lifetimeValue: Number(byCustomer[row.id]?.lifetimeValue ?? 0),
      })),
      meta: { page, perPage, total: count, totalPages: Math.max(1, Math.ceil(count / perPage)) },
    })
  }),
)

router.get(
  '/customers/:id',
  asyncRoute(async (req, res) => {
    const customer = await Customer.findByPk(req.params.id, {
      include: [{ association: 'addresses' }],
    })
    if (!customer) throw notFound('No such customer')

    const orders = await Order.findAll({
      where: { customerId: customer.id },
      order: [['placedAt', 'DESC']],
      include: [{ association: 'items', separate: true }],
    })

    res.json({
      data: {
        id: customer.id,
        email: customer.email,
        firstName: customer.firstName,
        lastName: customer.lastName,
        phone: customer.phone,
        status: customer.status,
        marketingOptIn: customer.marketingOptIn,
        smsOptIn: customer.smsOptIn,
        rewardPoints: customer.rewardPoints,
        createdAt: customer.createdAt,
        lastLoginAt: customer.lastLoginAt,
        addresses: customer.addresses ?? [],
        orders: orders.map((order) => ({
          number: order.number,
          placedAt: order.placedAt,
          status: order.status,
          paymentStatus: order.paymentStatus,
          total: order.totalAmount,
          itemCount: (order.items ?? []).reduce((sum, item) => sum + item.quantity, 0),
        })),
      },
    })
  }),
)

router.post(
  '/customers/:id/block',
  requireRole('manager'),
  validate(z.object({ blocked: z.boolean() })),
  asyncRoute(async (req, res) => {
    const customer = await Customer.findByPk(req.params.id)
    if (!customer) throw notFound('No such customer')

    const status = req.body.blocked ? 'blocked' : 'active'
    await customer.update({ status })

    // Blocking has to end the session too, or an already-signed-in customer keeps working
    // until their refresh token expires - up to thirty days later.
    if (req.body.blocked) {
      await models.RefreshToken.update(
        { revokedAt: new Date() },
        { where: { subjectType: 'customer', subjectId: customer.id, revokedAt: { [Op.is]: null } } },
      )
    }

    await auditFrom(req)({
      action: req.body.blocked ? 'customer.block' : 'customer.unblock',
      entityType: 'customer',
      entityId: customer.id,
      after: { status },
    })

    res.json({ data: { id: customer.id, status } })
  }),
)

export default router
