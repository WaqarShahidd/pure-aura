import { Router } from 'express'
import { z } from 'zod'
import { validate } from '../../middleware/validate.js'
import { requireRole } from '../../middleware/auth.js'
import { auditFrom } from '../../services/auditService.js'
import * as service from '../../services/adminInventoryService.js'

const router = Router()
const asyncRoute = (handler) => (req, res, next) => handler(req, res, next).catch(next)

router.get(
  '/inventory',
  validate(
    z.object({
      page: z.coerce.number().int().min(1).default(1),
      perPage: z.coerce.number().int().min(1).max(100).default(25),
      q: z.string().optional(),
      lowStockOnly: z.coerce.boolean().optional(),
    }),
    'query',
  ),
  asyncRoute(async (req, res) => {
    const { data, meta } = await service.listVariants(req.query)
    res.json({ data, meta })
  }),
)

router.get(
  '/inventory/:variantId/moves',
  asyncRoute(async (req, res) => {
    res.json({ data: await service.listMoves(req.params.variantId) })
  }),
)

router.post(
  '/inventory/:variantId/adjust',
  requireRole('manager'),
  validate(
    z.object({
      delta: z.number().int(),
      reason: z.enum(['restock', 'adjustment']),
      note: z.string().nullish(),
    }),
  ),
  asyncRoute(async (req, res) => {
    const variant = await service.adjustStock(req.params.variantId, {
      ...req.body,
      adminUserId: req.admin.id,
    })

    await auditFrom(req)({
      action: 'inventory.adjust',
      entityType: 'product_variant',
      entityId: req.params.variantId,
      after: { delta: req.body.delta, reason: req.body.reason, stockQuantity: variant.stockQuantity },
    })

    res.json({ data: variant })
  }),
)

export default router
