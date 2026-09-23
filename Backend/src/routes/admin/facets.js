import { Router } from 'express'
import { z } from 'zod'
import { validate } from '../../middleware/validate.js'
import { requireRole } from '../../middleware/auth.js'
import { auditFrom } from '../../services/auditService.js'
import * as service from '../../services/adminFacetService.js'

const router = Router()
const asyncRoute = (handler) => (req, res, next) => handler(req, res, next).catch(next)

const facetSchema = z.object({
  key: z.string().min(1, 'Required'),
  label: z.string().min(1, 'Required'),
  fieldKey: z.string().min(1, 'Required'),
  type: z.enum(['list', 'swatch', 'range']).default('list'),
  swatchField: z.string().nullish(),
  cardinality: z.enum(['single', 'multi']).default('single'),
  position: z.number().int().default(0),
  isActive: z.boolean().default(true),
})

const facetValueSchema = z.object({
  value: z.string().min(1, 'Required'),
  label: z.string().min(1, 'Required'),
  swatchHex: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Use a hex color like #a1b2c3').nullish(),
  position: z.number().int().default(0),
  isActive: z.boolean().default(true),
})

router.get(
  '/facets',
  asyncRoute(async (req, res) => {
    res.json({ data: await service.listFacets() })
  }),
)

router.get(
  '/facets/:id',
  asyncRoute(async (req, res) => {
    res.json({ data: await service.getFacet(req.params.id) })
  }),
)

router.post(
  '/facets',
  requireRole('manager'),
  validate(facetSchema),
  asyncRoute(async (req, res) => {
    const facet = await service.createFacet(req.body)
    await auditFrom(req)({ action: 'facet.create', entityType: 'facet', entityId: facet.id, after: facet })
    res.status(201).json({ data: facet })
  }),
)

router.patch(
  '/facets/:id',
  requireRole('manager'),
  validate(facetSchema.partial()),
  asyncRoute(async (req, res) => {
    const { before, after } = await service.updateFacet(req.params.id, req.body)
    await auditFrom(req)({ action: 'facet.update', entityType: 'facet', entityId: req.params.id, before, after })
    res.json({ data: after })
  }),
)

router.delete(
  '/facets/:id',
  requireRole('manager'),
  asyncRoute(async (req, res) => {
    const before = await service.getFacet(req.params.id)
    await service.deleteFacet(req.params.id)
    await auditFrom(req)({ action: 'facet.delete', entityType: 'facet', entityId: req.params.id, before })
    res.status(204).end()
  }),
)

router.post(
  '/facets/:id/values',
  requireRole('manager'),
  validate(facetValueSchema),
  asyncRoute(async (req, res) => {
    const value = await service.createFacetValue(req.params.id, req.body)
    await auditFrom(req)({
      action: 'facet_value.create',
      entityType: 'facet_value',
      entityId: value.id,
      after: value,
    })
    res.status(201).json({ data: value })
  }),
)

router.patch(
  '/facet-values/:id',
  requireRole('manager'),
  validate(facetValueSchema.partial()),
  asyncRoute(async (req, res) => {
    const value = await service.updateFacetValue(req.params.id, req.body)
    await auditFrom(req)({
      action: 'facet_value.update',
      entityType: 'facet_value',
      entityId: req.params.id,
      after: value,
    })
    res.json({ data: value })
  }),
)

router.delete(
  '/facet-values/:id',
  requireRole('manager'),
  asyncRoute(async (req, res) => {
    await service.deleteFacetValue(req.params.id)
    await auditFrom(req)({
      action: 'facet_value.delete',
      entityType: 'facet_value',
      entityId: req.params.id,
    })
    res.status(204).end()
  }),
)

export default router
