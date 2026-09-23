import { Router } from 'express'
import { z } from 'zod'
import { validate } from '../../middleware/validate.js'
import * as catalog from '../../services/catalogService.js'
import { searchProducts } from '../../services/searchService.js'

const router = Router()

// Thin controllers by design: parse, call the service, send. Anything that looks like a
// decision belongs in the service, where the tests can reach it without HTTP.
const asyncRoute = (handler) => (req, res, next) => handler(req, res, next).catch(next)

const productQuery = z.object({
  collection: z.string().min(1).optional(),
  category: z.string().min(1).optional(),
  q: z.string().optional(),
  sort: z.string().optional(),
  favorites: z.coerce.boolean().optional(),
  upsell: z.coerce.boolean().optional(),
  exclude: z.string().optional(),
})

router.get(
  '/products',
  validate(productQuery, 'query'),
  asyncRoute(async (req, res) => {
    const { collection, category, q, sort, favorites, upsell, exclude } = req.query

    if (favorites) return res.json({ data: await catalog.getFavorites() })

    if (upsell) {
      const excluded = exclude ? exclude.split(',').filter(Boolean) : []
      return res.json({ data: await catalog.getUpsells(excluded) })
    }

    if (category) return res.json({ data: await catalog.getProductsByCategory(category) })

    const products = collection
      ? await catalog.getProductsByCollection(collection, { sort })
      : await catalog.getAllProducts({ sort })

    // Search runs over the serialized results, so it sees exactly the fields the
    // storefront's own scorer saw.
    if (q) return res.json({ data: searchProducts(products, q) })

    return res.json({ data: products })
  }),
)

router.get(
  '/products/:handle',
  asyncRoute(async (req, res) => {
    res.json({ data: await catalog.getProductByHandle(req.params.handle) })
  }),
)

router.get(
  '/products/:handle/routine',
  asyncRoute(async (req, res) => {
    res.json({ data: await catalog.getRoutineProducts(req.params.handle) })
  }),
)

router.get(
  '/collections',
  asyncRoute(async (req, res) => {
    res.json({ data: await catalog.getCollections() })
  }),
)

// Registered before /collections/:handle, or 'featured' would be read as a handle.
router.get(
  '/collections/featured',
  asyncRoute(async (req, res) => {
    res.json({ data: await catalog.getFeaturedCollections() })
  }),
)

router.get(
  '/collections/:handle',
  asyncRoute(async (req, res) => {
    res.json({ data: await catalog.getCollectionByHandle(req.params.handle) })
  }),
)

router.get(
  '/collections/:handle/products',
  validate(z.object({ sort: z.string().optional() }), 'query'),
  asyncRoute(async (req, res) => {
    res.json({
      data: await catalog.getProductsByCollection(req.params.handle, { sort: req.query.sort }),
    })
  }),
)

router.get(
  '/categories',
  asyncRoute(async (req, res) => {
    res.json({ data: await catalog.getCategories() })
  }),
)

router.get(
  '/filters',
  asyncRoute(async (req, res) => {
    res.json({ data: await catalog.getFilterDescriptors() })
  }),
)

export default router
