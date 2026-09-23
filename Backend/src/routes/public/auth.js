import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { z } from 'zod'
import { isTest } from '../../config/env.js'
import models from '../../db/models/index.js'
import { validate } from '../../middleware/validate.js'
import {
  REFRESH_COOKIE,
  authenticateCustomer,
  hashPassword,
  issueRefreshToken,
  refreshCookieOptions,
  revokeRefreshToken,
  rotateRefreshToken,
  signAccessToken,
} from '../../services/authService.js'
import { conflict, unauthorized } from '../../lib/errors.js'

const { Customer } = models
const router = Router()
const asyncRoute = (handler) => (req, res, next) => handler(req, res, next).catch(next)

const limiter = (limit, windowMinutes) =>
  rateLimit({
    windowMs: windowMinutes * 60_000,
    limit,
    skip: () => isTest,
    keyGenerator: (req) => `${req.ip}:${req.body?.email ?? ''}`,
    message: { error: { code: 'RATE_LIMITED', message: 'Too many attempts. Try again shortly.' } },
  })

// Error copy matches the storefront's existing inline validation strings exactly, so a
// server response can be dropped into a form's errors object with no translation.
const EMAIL = z.string().email('Enter a valid email address')

const registerSchema = z.object({
  email: EMAIL,
  password: z.string().min(8, 'Use at least 8 characters'),
  firstName: z.string().min(1, 'Required'),
  lastName: z.string().min(1, 'Required'),
  phone: z.string().optional(),
  marketingOptIn: z.boolean().default(false),
})

function serializeCustomer(customer) {
  return {
    id: customer.id,
    email: customer.email,
    firstName: customer.firstName,
    lastName: customer.lastName,
    phone: customer.phone,
    birthday: customer.birthday,
    marketingOptIn: customer.marketingOptIn,
    smsOptIn: customer.smsOptIn,
    rewardPoints: customer.rewardPoints,
    // The storefront shows "Member since March 2024"; the row only has a timestamp.
    memberSince: customer.createdAt,
  }
}

async function establishSession(res, customer, req) {
  const { token } = await issueRefreshToken('customer', customer.id, {
    userAgent: req.get('user-agent'),
    ip: req.ip,
  })
  res.cookie(REFRESH_COOKIE.customer, token, refreshCookieOptions('customer'))
  return { accessToken: signAccessToken('customer', customer), customer: serializeCustomer(customer) }
}

router.post(
  '/auth/register',
  limiter(3, 60),
  validate(registerSchema),
  asyncRoute(async (req, res) => {
    const { email, password, ...rest } = req.body

    // A guest who has ordered already has a row with no password. Registering with that
    // same address adopts the existing customer rather than colliding on the unique index,
    // so their order history is there the moment they sign in for the first time.
    const existing = await Customer.scope('withSecrets').findOne({ where: { email } })

    if (existing?.passwordHash) {
      throw conflict('EMAIL_TAKEN', 'That email is already registered', [
        { field: 'email', message: 'Already registered' },
      ])
    }

    const customer = existing ?? Customer.build({ email })
    customer.set({ ...rest, passwordHash: await hashPassword(password) })
    await customer.save()

    res.status(201).json({ data: await establishSession(res, customer, req) })
  }),
)

router.post(
  '/auth/login',
  limiter(5, 15),
  validate(z.object({ email: EMAIL, password: z.string().min(1, 'Required') })),
  asyncRoute(async (req, res) => {
    const customer = await authenticateCustomer(req.body.email, req.body.password)
    res.json({ data: await establishSession(res, customer, req) })
  }),
)

router.post(
  '/auth/refresh',
  asyncRoute(async (req, res) => {
    const rotated = await rotateRefreshToken('customer', req.cookies?.[REFRESH_COOKIE.customer], {
      userAgent: req.get('user-agent'),
      ip: req.ip,
    })

    const customer = await Customer.findByPk(rotated.subjectId)
    if (!customer || customer.status === 'blocked') {
      throw unauthorized('That account is no longer active')
    }

    res.cookie(REFRESH_COOKIE.customer, rotated.token, refreshCookieOptions('customer'))
    res.json({
      data: {
        accessToken: signAccessToken('customer', customer),
        customer: serializeCustomer(customer),
      },
    })
  }),
)

router.post(
  '/auth/logout',
  asyncRoute(async (req, res) => {
    await revokeRefreshToken('customer', req.cookies?.[REFRESH_COOKIE.customer])
    res.clearCookie(REFRESH_COOKIE.customer, refreshCookieOptions('customer'))
    res.status(204).end()
  }),
)

export { serializeCustomer }
export default router
