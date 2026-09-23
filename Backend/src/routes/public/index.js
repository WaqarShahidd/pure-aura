import { Router } from 'express'
import catalogRoutes from './catalog.js'
import contentRoutes from './content.js'
import authRoutes from './auth.js'
import accountRoutes from './account.js'
import orderRoutes from './orders.js'

const router = Router()

router.get('/', (req, res) => {
  res.json({
    data: {
      name: 'Pure Aura API',
      endpoints: [
        '/api/health',
        '/api/products',
        '/api/products/:handle',
        '/api/collections',
        '/api/collections/featured',
        '/api/collections/:handle',
        '/api/collections/:handle/products',
        '/api/categories',
        '/api/filters',
        '/api/bootstrap',
        '/api/homepage',
        '/api/pages/:slug',
        '/api/faqs',
        '/api/auth/login',
        '/api/me',
        '/api/me/addresses',
        '/api/me/orders',
      ],
    },
  })
})

router.use(catalogRoutes)
router.use(contentRoutes)
router.use(authRoutes)
router.use(orderRoutes)
router.use(accountRoutes)

export default router
