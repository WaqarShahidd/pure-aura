import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { z } from 'zod'
import { isTest } from '../../config/env.js'
import models from '../../db/models/index.js'
import { validate } from '../../middleware/validate.js'
import { requireAdmin } from '../../middleware/auth.js'
import {
  REFRESH_COOKIE,
  authenticateAdmin,
  issueRefreshToken,
  refreshCookieOptions,
  revokeRefreshToken,
  rotateRefreshToken,
  signAccessToken,
} from '../../services/authService.js'
import { unauthorized } from '../../lib/errors.js'

const { AdminUser } = models
const router = Router()
const asyncRoute = (handler) => (req, res, next) => handler(req, res, next).catch(next)

// Keyed on IP plus email so one attacker cannot lock out a legitimate user by hammering
// their address from elsewhere - and so trying many passwords against one account is
// limited even from a rotating IP.
const loginLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 5,
  skip: () => isTest,
  keyGenerator: (req) => `${req.ip}:${req.body?.email ?? ''}`,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many attempts. Try again shortly.' } },
})

const credentials = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Required'),
})

function serializeAdmin(admin) {
  return {
    id: admin.id,
    email: admin.email,
    name: admin.name,
    role: admin.role,
    lastLoginAt: admin.lastLoginAt,
  }
}

async function establishSession(res, admin, req) {
  const { token } = await issueRefreshToken('admin', admin.id, {
    userAgent: req.get('user-agent'),
    ip: req.ip,
  })

  res.cookie(REFRESH_COOKIE.admin, token, refreshCookieOptions('admin'))

  // The access token is returned in the body, never set as a cookie: the admin app holds
  // it in memory only, so it is not readable by script from storage and does not ride
  // along on every request the way a cookie would.
  return { accessToken: signAccessToken('admin', admin), admin: serializeAdmin(admin) }
}

router.post(
  '/login',
  loginLimiter,
  validate(credentials),
  asyncRoute(async (req, res) => {
    const admin = await authenticateAdmin(req.body.email, req.body.password)
    res.json({ data: await establishSession(res, admin, req) })
  }),
)

router.post(
  '/refresh',
  asyncRoute(async (req, res) => {
    const raw = req.cookies?.[REFRESH_COOKIE.admin]
    const rotated = await rotateRefreshToken('admin', raw, {
      userAgent: req.get('user-agent'),
      ip: req.ip,
    })

    const admin = await AdminUser.findByPk(rotated.subjectId)
    if (!admin || !admin.isActive) throw unauthorized('That account is no longer active')

    res.cookie(REFRESH_COOKIE.admin, rotated.token, refreshCookieOptions('admin'))
    res.json({
      data: { accessToken: signAccessToken('admin', admin), admin: serializeAdmin(admin) },
    })
  }),
)

router.post(
  '/logout',
  asyncRoute(async (req, res) => {
    await revokeRefreshToken('admin', req.cookies?.[REFRESH_COOKIE.admin])
    res.clearCookie(REFRESH_COOKIE.admin, refreshCookieOptions('admin'))
    res.status(204).end()
  }),
)

router.get(
  '/me',
  requireAdmin,
  asyncRoute(async (req, res) => {
    res.json({ data: serializeAdmin(req.admin) })
  }),
)

export default router
