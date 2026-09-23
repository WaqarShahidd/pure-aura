import { Router } from 'express'
import { z } from 'zod'
import { validate } from '../../middleware/validate.js'
import { requireRole } from '../../middleware/auth.js'
import { auditFrom } from '../../services/auditService.js'
import * as service from '../../services/adminCatalogService.js'

const router = Router()
const asyncRoute = (handler) => (req, res, next) => handler(req, res, next).catch(next)

const collectionSchema = z.object({
  handle: z
    .string()
    .min(1, 'Required')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase words separated by hyphens'),
  title: z.string().min(1, 'Required'),
  description: z.string().nullish(),
  cardLabel: z.string().nullish(),
  position: z.number().int().default(0),
  isFeatured: z.boolean().default(false),
  featuredPosition: z.number().int().min(1).max(4).nullish(),
  isActive: z.boolean().default(true),
  mediaId: z.string().uuid().nullish(),
  productIds: z.array(z.string().uuid()).optional(),
})

router.get(
  '/collections',
  asyncRoute(async (req, res) => {
    res.json({ data: await service.listCollectionsAdmin() })
  }),
)

// The homepage's featured-cards panel reads this directly rather than filtering the full
// list client-side, so "which 4 are picked, in what order" is always the server's answer.
router.get(
  '/collections/featured',
  asyncRoute(async (req, res) => {
    res.json({ data: await service.listFeaturedCollections() })
  }),
)

router.get(
  '/collections/:id',
  asyncRoute(async (req, res) => {
    res.json({ data: await service.getCollection(req.params.id) })
  }),
)

router.post(
  '/collections',
  requireRole('manager'),
  validate(collectionSchema),
  asyncRoute(async (req, res) => {
    const collection = await service.createCollection(req.body)

    await auditFrom(req)({
      action: 'collection.create',
      entityType: 'collection',
      entityId: collection.id,
      after: collection,
    })

    res.status(201).json({ data: collection })
  }),
)

router.patch(
  '/collections/:id',
  requireRole('manager'),
  validate(collectionSchema.partial()),
  asyncRoute(async (req, res) => {
    const { before, after } = await service.updateCollection(req.params.id, req.body)

    await auditFrom(req)({
      action: 'collection.update',
      entityType: 'collection',
      entityId: req.params.id,
      before,
      after,
    })

    res.json({ data: after })
  }),
)

router.delete(
  '/collections/:id',
  requireRole('manager'),
  asyncRoute(async (req, res) => {
    const before = await service.getCollection(req.params.id)
    await service.deleteCollection(req.params.id)

    await auditFrom(req)({
      action: 'collection.delete',
      entityType: 'collection',
      entityId: req.params.id,
      before,
    })

    res.status(204).end()
  }),
)

export default router
