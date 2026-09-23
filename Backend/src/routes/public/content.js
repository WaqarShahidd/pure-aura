import { Router } from 'express'
import * as content from '../../services/contentService.js'

const router = Router()
const asyncRoute = (handler) => (req, res, next) => handler(req, res, next).catch(next)

// Header, footer, announcements, nav and settings in one call. Fetched once by Layout and
// cached for the session - it is on every page, so four separate requests would delay the
// first paint of every route.
router.get(
  '/bootstrap',
  asyncRoute(async (req, res) => {
    res.json({ data: await content.getBootstrap() })
  }),
)

router.get(
  '/homepage',
  asyncRoute(async (req, res) => {
    res.json({ data: await content.getHomepage() })
  }),
)

router.get(
  '/pages',
  asyncRoute(async (req, res) => {
    res.json({ data: await content.getPages() })
  }),
)

router.get(
  '/pages/:slug',
  asyncRoute(async (req, res) => {
    res.json({ data: await content.getPage(req.params.slug) })
  }),
)

router.get(
  '/faqs',
  asyncRoute(async (req, res) => {
    res.json({ data: await content.getFaqs() })
  }),
)

export default router
