import { Router } from 'express'
import { z } from 'zod'
import { validate } from '../../middleware/validate.js'
import { requireRole } from '../../middleware/auth.js'
import { auditFrom } from '../../services/auditService.js'
import * as service from '../../services/adminCatalogService.js'

const router = Router()
const asyncRoute = (handler) => (req, res, next) => handler(req, res, next).catch(next)

const categorySchema = z.object({
  handle: z
    .string()
    .min(1, 'Required')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase words separated by hyphens'),
  title: z.string().min(1, 'Required'),
  description: z.string().nullish(),
  position: z.number().int().default(0),
  mediaId: z.string().uuid().nullish(),
})

router.get(
  '/categories',
  asyncRoute(async (req, res) => {
    res.json({ data: await service.listCategoriesAdmin() })
  }),
)

router.get(
  '/categories/:id',
  asyncRoute(async (req, res) => {
    res.json({ data: await service.getCategory(req.params.id) })
  }),
)

router.post(
  '/categories',
  requireRole('manager'),
  validate(categorySchema),
  asyncRoute(async (req, res) => {
    const category = await service.createCategory(req.body)

    await auditFrom(req)({
      action: 'category.create',
      entityType: 'category',
      entityId: category.id,
      after: category,
    })

    res.status(201).json({ data: category })
  }),
)

router.patch(
  '/categories/:id',
  requireRole('manager'),
  validate(categorySchema.partial()),
  asyncRoute(async (req, res) => {
    const { before, after } = await service.updateCategory(req.params.id, req.body)

    await auditFrom(req)({
      action: 'category.update',
      entityType: 'category',
      entityId: req.params.id,
      before,
      after,
    })

    res.json({ data: after })
  }),
)

router.delete(
  '/categories/:id',
  requireRole('manager'),
  asyncRoute(async (req, res) => {
    const before = await service.getCategory(req.params.id)
    await service.deleteCategory(req.params.id)

    await auditFrom(req)({
      action: 'category.delete',
      entityType: 'category',
      entityId: req.params.id,
      before,
    })

    res.status(204).end()
  }),
)

export default router
