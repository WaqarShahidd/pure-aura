import { Router } from 'express'
import { z } from 'zod'
import { validate } from '../../middleware/validate.js'
import { requireRole } from '../../middleware/auth.js'
import { auditFrom } from '../../services/auditService.js'
import * as service from '../../services/adminDiscountService.js'

const router = Router()
const asyncRoute = (handler) => (req, res, next) => handler(req, res, next).catch(next)

const discountSchema = z.object({
  code: z.string().min(1, 'Required').transform((value) => value.toUpperCase()),
  kind: z.enum(['percent', 'fixed', 'free_shipping']),
  value: z.number().int().min(0).default(0),
  minSubtotal: z.number().int().min(0).default(0),
  maxUses: z.number().int().min(1).nullish(),
  perCustomerLimit: z.number().int().min(1).nullish(),
  appliesTo: z.enum(['all', 'collection', 'product']).default('all'),
  targetId: z.string().uuid().nullish(),
  startsAt: z.coerce.date().nullish(),
  endsAt: z.coerce.date().nullish(),
  isActive: z.boolean().default(true),
})

router.get(
  '/discounts',
  asyncRoute(async (req, res) => {
    res.json({ data: await service.listDiscounts() })
  }),
)

router.get(
  '/discounts/:id',
  asyncRoute(async (req, res) => {
    res.json({ data: await service.getDiscount(req.params.id) })
  }),
)

router.post(
  '/discounts',
  requireRole('manager'),
  validate(discountSchema),
  asyncRoute(async (req, res) => {
    const discount = await service.createDiscount(req.body)
    await auditFrom(req)({
      action: 'discount.create',
      entityType: 'discount_code',
      entityId: discount.id,
      after: discount,
    })
    res.status(201).json({ data: discount })
  }),
)

router.patch(
  '/discounts/:id',
  requireRole('manager'),
  validate(discountSchema.partial()),
  asyncRoute(async (req, res) => {
    const { before, after } = await service.updateDiscount(req.params.id, req.body)
    await auditFrom(req)({
      action: 'discount.update',
      entityType: 'discount_code',
      entityId: req.params.id,
      before,
      after,
    })
    res.json({ data: after })
  }),
)

router.delete(
  '/discounts/:id',
  requireRole('manager'),
  asyncRoute(async (req, res) => {
    const before = await service.getDiscount(req.params.id)
    await service.deleteDiscount(req.params.id)
    await auditFrom(req)({
      action: 'discount.delete',
      entityType: 'discount_code',
      entityId: req.params.id,
      before,
    })
    res.status(204).end()
  }),
)

export default router
