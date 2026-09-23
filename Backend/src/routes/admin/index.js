import { Router } from 'express'
import { requireAdmin } from '../../middleware/auth.js'
import authRoutes from './auth.js'
import productRoutes from './products.js'
import mediaRoutes from './media.js'
import cmsRoutes from './cms.js'
import customerRoutes from './customers.js'
import orderRoutes from './orders.js'
import categoryRoutes from './categories.js'
import collectionRoutes from './collections.js'
import facetRoutes from './facets.js'
import quizRoutes from './quiz.js'
import sortAndFiltersRoutes from './sortAndFilters.js'
import inventoryRoutes from './inventory.js'
import discountRoutes from './discounts.js'
import settingsRoutes from './settings.js'
import userRoutes from './users.js'

const router = Router()

// Auth mounts first and unguarded: /login and /refresh are how you GET a session, so
// requiring one to reach them would be a locked door with the key inside.
router.use('/auth', authRoutes)

// Everything below needs a valid admin access token.
router.use(requireAdmin)

router.get('/me', (req, res) => {
  res.json({
    data: {
      id: req.admin.id,
      email: req.admin.email,
      name: req.admin.name,
      role: req.admin.role,
    },
  })
})

router.use('/products', productRoutes)
router.use('/media', mediaRoutes)
router.use(cmsRoutes)
router.use(customerRoutes)
router.use(orderRoutes)
router.use(categoryRoutes)
router.use(collectionRoutes)
router.use(facetRoutes)
router.use(quizRoutes)
router.use(sortAndFiltersRoutes)
router.use(inventoryRoutes)
router.use(discountRoutes)
router.use(settingsRoutes)
router.use(userRoutes)

export default router
