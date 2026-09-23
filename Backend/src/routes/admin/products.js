import { Router } from 'express'
import { z } from 'zod'
import { validate } from '../../middleware/validate.js'
import { requireRole } from '../../middleware/auth.js'
import { auditFrom } from '../../services/auditService.js'
import * as service from '../../services/adminProductService.js'

const router = Router()
const asyncRoute = (handler) => (req, res, next) => handler(req, res, next).catch(next)

const variantSchema = z.object({
  id: z.string().uuid().optional(),
  sku: z.string().max(64).nullish(),
  label: z.string().min(1, 'Required'),
  // Integer rupees, enforced here as well as by the column, so a decimal price is a 400
  // with a field message rather than a database error the admin cannot read.
  price: z.number().int('Use whole rupees').min(0, 'Cannot be negative'),
  compareAtPrice: z.number().int('Use whole rupees').min(0).nullish(),
  stockQuantity: z.number().int().min(0, 'Cannot be negative').default(0),
  lowStockThreshold: z.number().int().min(0).default(5),
  mediaId: z.string().uuid().nullish(),
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true),
  optionValues: z.record(z.string()).default({}),
})

const productSchema = z.object({
  handle: z
    .string()
    .min(1, 'Required')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase words separated by hyphens'),
  title: z.string().min(1, 'Required'),
  subtitle: z.string().nullish(),
  description: z.string().nullish(),
  vendor: z.string().nullish(),
  badge: z.enum(['BEST SELLER', 'SALE']).nullish(),
  crueltyFree: z.boolean().default(true),
  rating: z.number().int().min(0, 'Between 0 and 5').max(5, 'Between 0 and 5').nullish(),
  reviewCount: z.number().int().min(0).default(0),
  ingredientNote: z.string().nullish(),
  stockLabel: z.string().nullish(),
  categoryId: z.string().uuid().nullish(),
  isFavorite: z.boolean().default(false),
  isUpsell: z.boolean().default(false),
  status: z.enum(['draft', 'active', 'archived']).default('draft'),
  position: z.number().int().default(0),
  seoTitle: z.string().nullish(),
  seoDescription: z.string().nullish(),

  images: z
    .array(z.object({ mediaId: z.string().uuid(), altText: z.string().nullish() }))
    .optional(),
  ingredients: z
    .array(z.object({ name: z.string().min(1), percent: z.number().int().min(0).max(100) }))
    .optional(),
  options: z
    .array(z.object({ name: z.string().min(1), values: z.array(z.string().min(1)).min(1) }))
    .optional(),
  variants: z.array(variantSchema).min(1, 'A product needs at least one variant').optional(),
  facetValueIds: z.array(z.string().uuid()).optional(),
  collectionIds: z.array(z.string().uuid()).optional(),
})

const listQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(25),
  q: z.string().optional(),
  status: z.enum(['draft', 'active', 'archived']).optional(),
  categoryId: z.string().uuid().optional(),
})

// Staff can look but not touch; changing the catalogue is a manager job.
router.get(
  '/',
  validate(listQuery, 'query'),
  asyncRoute(async (req, res) => {
    res.json(await service.listProducts(req.query))
  }),
)

router.get(
  '/pickers',
  asyncRoute(async (req, res) => {
    const [categories, collections, facets] = await Promise.all([
      service.listCategories(),
      service.listCollectionsForPicker(),
      service.listFacetsForPicker(),
    ])
    res.json({ data: { categories, collections, facets } })
  }),
)

router.get(
  '/:id',
  asyncRoute(async (req, res) => {
    res.json({ data: await service.getProduct(req.params.id) })
  }),
)

router.get(
  '/:id/preview',
  asyncRoute(async (req, res) => {
    res.json({ data: await service.publicPreviewOf(req.params.id) })
  }),
)

router.post(
  '/',
  requireRole('manager'),
  validate(productSchema),
  asyncRoute(async (req, res) => {
    const id = await service.createProduct(req.body)
    const product = await service.getProduct(id)

    await auditFrom(req)({
      action: 'product.create',
      entityType: 'product',
      entityId: id,
      after: product,
    })

    res.status(201).json({ data: product })
  }),
)

router.patch(
  '/:id',
  requireRole('manager'),
  validate(productSchema.partial()),
  asyncRoute(async (req, res) => {
    const { before, after } = await service.updateProduct(req.params.id, req.body)

    await auditFrom(req)({
      action: 'product.update',
      entityType: 'product',
      entityId: req.params.id,
      before,
      after,
    })

    res.json({ data: after })
  }),
)

router.delete(
  '/:id',
  requireRole('manager'),
  asyncRoute(async (req, res) => {
    const before = await service.getProduct(req.params.id)
    const result = await service.deleteProduct(req.params.id)

    await auditFrom(req)({
      action: result.archived ? 'product.archive' : 'product.delete',
      entityType: 'product',
      entityId: req.params.id,
      before,
    })

    res.json({ data: result })
  }),
)

export default router
