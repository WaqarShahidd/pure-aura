import { Router } from 'express'
import { z } from 'zod'
import { validate } from '../../middleware/validate.js'
import { requireRole } from '../../middleware/auth.js'
import { auditFrom } from '../../services/auditService.js'
import * as service from '../../services/adminVocabService.js'

const router = Router()
const asyncRoute = (handler) => (req, res, next) => handler(req, res, next).catch(next)

const sortOptionSchema = z.object({
  key: z.string().min(1, 'Required'),
  label: z.string().min(1, 'Required'),
  // Comparator functions are not serializable - the storefront keeps a COMPARATORS
  // lookup keyed by field, so admin can add a new sort using an existing field but
  // cannot invent a field the storefront has no comparator for.
  field: z.enum(['title', 'price', 'review_count', 'rating', 'created_at']),
  direction: z.enum(['asc', 'desc']).default('asc'),
  position: z.number().int().default(0),
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true),
})

const priceRangeSchema = z.object({
  key: z.string().min(1, 'Required'),
  label: z.string().min(1, 'Required'),
  minAmount: z.number().int().min(0).default(0),
  maxAmount: z.number().int().min(0).nullish(),
  position: z.number().int().default(0),
  isActive: z.boolean().default(true),
})

router.get('/sort-options', asyncRoute(async (req, res) => {
  res.json({ data: await service.listSortOptions() })
}))

router.post(
  '/sort-options',
  requireRole('manager'),
  validate(sortOptionSchema),
  asyncRoute(async (req, res) => {
    const row = await service.createSortOption(req.body)
    await auditFrom(req)({ action: 'sort_option.create', entityType: 'sort_option', entityId: row.id, after: row })
    res.status(201).json({ data: row })
  }),
)

router.patch(
  '/sort-options/:id',
  requireRole('manager'),
  validate(sortOptionSchema.partial()),
  asyncRoute(async (req, res) => {
    const { before, after } = await service.updateSortOption(req.params.id, req.body)
    await auditFrom(req)({ action: 'sort_option.update', entityType: 'sort_option', entityId: req.params.id, before, after })
    res.json({ data: after })
  }),
)

router.delete(
  '/sort-options/:id',
  requireRole('manager'),
  asyncRoute(async (req, res) => {
    await service.deleteSortOption(req.params.id)
    await auditFrom(req)({ action: 'sort_option.delete', entityType: 'sort_option', entityId: req.params.id })
    res.status(204).end()
  }),
)

router.get('/price-ranges', asyncRoute(async (req, res) => {
  res.json({ data: await service.listPriceRanges() })
}))

router.post(
  '/price-ranges',
  requireRole('manager'),
  validate(priceRangeSchema),
  asyncRoute(async (req, res) => {
    const row = await service.createPriceRange(req.body)
    await auditFrom(req)({ action: 'price_range.create', entityType: 'price_range', entityId: row.id, after: row })
    res.status(201).json({ data: row })
  }),
)

router.patch(
  '/price-ranges/:id',
  requireRole('manager'),
  validate(priceRangeSchema.partial()),
  asyncRoute(async (req, res) => {
    const { before, after } = await service.updatePriceRange(req.params.id, req.body)
    await auditFrom(req)({ action: 'price_range.update', entityType: 'price_range', entityId: req.params.id, before, after })
    res.json({ data: after })
  }),
)

router.delete(
  '/price-ranges/:id',
  requireRole('manager'),
  asyncRoute(async (req, res) => {
    await service.deletePriceRange(req.params.id)
    await auditFrom(req)({ action: 'price_range.delete', entityType: 'price_range', entityId: req.params.id })
    res.status(204).end()
  }),
)

export default router
