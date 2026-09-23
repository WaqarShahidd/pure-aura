import { createHash, randomBytes } from 'node:crypto'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { Op } from 'sequelize'
import { env } from '../config/env.js'
import { sequelize } from '../db/index.js'
import models from '../db/models/index.js'
import { forbidden, unauthorized } from '../lib/errors.js'

const { AdminUser, Customer, RefreshToken, PasswordReset } = models

// Customers and admins get different secrets AND different audiences. Either alone would
// do, but together they mean a customer token presented to an admin route fails at the
// signature check rather than at a role check further in - two independent gates, and the
// outer one cannot be reached by a bug in the inner one.
const AUDIENCES = {
  customer: { secret: env.JWT_SECRET, audience: 'storefront', ttl: env.JWT_ACCESS_TTL },
  admin: { secret: env.JWT_ADMIN_SECRET, audience: 'admin', ttl: env.JWT_ADMIN_ACCESS_TTL },
}

// Refresh tokens are stored hashed, exactly like passwords. The raw value is a bearer
// credential, so a leaked database read should not hand someone a working session.
function hashToken(token) {
  return createHash('sha256').update(token).digest('hex')
}

export function signAccessToken(subjectType, subject) {
  const config = AUDIENCES[subjectType]

  return jwt.sign(
    {
      sub: subject.id,
      typ: subjectType,
      ...(subjectType === 'admin' ? { role: subject.role } : {}),
    },
    config.secret,
    { audience: config.audience, expiresIn: config.ttl },
  )
}

export function verifyAccessToken(subjectType, token) {
  const config = AUDIENCES[subjectType]

  try {
    return jwt.verify(token, config.secret, { audience: config.audience })
  } catch {
    throw unauthorized('Your session has expired')
  }
}

export async function issueRefreshToken(subjectType, subjectId, { userAgent, ip } = {}) {
  const raw = randomBytes(48).toString('base64url')
  const expiresAt = new Date(Date.now() + env.JWT_REFRESH_TTL_DAYS * 86_400_000)

  await RefreshToken.create({
    subjectType,
    subjectId,
    tokenHash: hashToken(raw),
    expiresAt,
    userAgent: userAgent ?? null,
    ip: ip ?? null,
  })

  return { token: raw, expiresAt }
}

// Raised internally when an already-exchanged token comes back. It is deliberately NOT an
// ApiError: it has to escape the transaction so the rollback happens, and only then can
// the revocation be written in a transaction of its own.
class RefreshTokenReused extends Error {
  constructor(subjectId) {
    super('refresh token reused')
    this.subjectId = subjectId
  }
}

// Rotation with reuse detection. Presenting a token that was already exchanged means
// either a replay or a stolen cookie, and in both cases the safe move is to burn the whole
// chain rather than to quietly issue another one.
export async function rotateRefreshToken(subjectType, rawToken, context = {}) {
  if (!rawToken) throw unauthorized('Sign in to continue')

  const tokenHash = hashToken(rawToken)

  try {
    return await sequelize.transaction(async (transaction) => {
      const existing = await RefreshToken.findOne({
        where: { tokenHash, subjectType },
        transaction,
        lock: transaction.LOCK.UPDATE,
      })

      if (!existing) throw unauthorized('Sign in to continue')

      // Revoking here would be undone: throwing rolls the transaction back, taking the
      // revocation with it and leaving the stolen family fully usable. Signal outwards
      // and write it separately instead.
      if (existing.revokedAt) throw new RefreshTokenReused(existing.subjectId)

      if (existing.expiresAt.getTime() < Date.now()) {
        throw unauthorized('Your session has expired')
      }

      const raw = randomBytes(48).toString('base64url')
      const expiresAt = new Date(Date.now() + env.JWT_REFRESH_TTL_DAYS * 86_400_000)

      const replacement = await RefreshToken.create(
        {
          subjectType,
          subjectId: existing.subjectId,
          tokenHash: hashToken(raw),
          expiresAt,
          userAgent: context.userAgent ?? null,
          ip: context.ip ?? null,
        },
        { transaction },
      )

      await existing.update(
        { revokedAt: new Date(), replacedById: replacement.id },
        { transaction },
      )

      return { token: raw, expiresAt, subjectId: existing.subjectId }
    })
  } catch (error) {
    if (!(error instanceof RefreshTokenReused)) throw error

    // The transaction above has rolled back by now, so this commits on its own and the
    // whole family really is dead - including the token the legitimate holder has.
    // That is the intended outcome: once a refresh token has leaked, there is no way to
    // tell the thief from the owner, so both are made to sign in again.
    await RefreshToken.update(
      { revokedAt: new Date() },
      {
        where: {
          subjectType,
          subjectId: error.subjectId,
          revokedAt: { [Op.is]: null },
        },
      },
    )

    throw unauthorized('Your session was ended for security reasons. Sign in again.')
  }
}

export async function revokeRefreshToken(subjectType, rawToken) {
  if (!rawToken) return
  await RefreshToken.update(
    { revokedAt: new Date() },
    { where: { subjectType, tokenHash: hashToken(rawToken), revokedAt: { [Op.is]: null } } },
  )
}

export async function authenticateAdmin(email, password) {
  const admin = await AdminUser.scope('withSecrets').findOne({ where: { email } })

  // bcrypt.compare against a dummy hash when the account does not exist, so a missing
  // email and a wrong password take the same time to answer. Without it the endpoint
  // becomes an account enumerator.
  const hash = admin?.passwordHash ?? '$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinv'
  const ok = await bcrypt.compare(password, hash)

  if (!admin || !ok) throw unauthorized('Those details did not match')
  if (!admin.isActive) throw forbidden('That account has been deactivated')

  await admin.update({ lastLoginAt: new Date() })
  return admin
}

export async function authenticateCustomer(email, password) {
  const customer = await Customer.scope('withSecrets').findOne({ where: { email } })
  const hash =
    customer?.passwordHash ?? '$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinv'
  const ok = await bcrypt.compare(password, hash)

  if (!customer || !customer.passwordHash || !ok) throw unauthorized('Those details did not match')
  if (customer.status === 'blocked') throw forbidden('That account has been suspended')

  await customer.update({ lastLoginAt: new Date() })
  return customer
}

export function hashPassword(password) {
  return bcrypt.hash(password, 10)
}

// Returns null when there is no such customer, on purpose: the route always answers the
// same way either way, so this cannot be used to find out which emails are registered.
export async function requestPasswordReset(email) {
  const customer = await Customer.findOne({ where: { email } })
  if (!customer) return null

  const raw = randomBytes(32).toString('base64url')
  const expiresAt = new Date(Date.now() + 60 * 60_000) // 1 hour

  await PasswordReset.create({
    subjectType: 'customer',
    subjectId: customer.id,
    tokenHash: hashToken(raw),
    expiresAt,
  })

  return { customer, token: raw }
}

export async function resetPassword(rawToken, newPassword) {
  const reset = await PasswordReset.findOne({
    where: { subjectType: 'customer', tokenHash: hashToken(rawToken), usedAt: { [Op.is]: null } },
  })

  if (!reset || reset.expiresAt.getTime() < Date.now()) {
    throw unauthorized('That reset link is invalid or has expired')
  }

  const customer = await Customer.findByPk(reset.subjectId)
  if (!customer) throw unauthorized('That reset link is invalid or has expired')

  await sequelize.transaction(async (transaction) => {
    await customer.update({ passwordHash: await hashPassword(newPassword) }, { transaction })
    await reset.update({ usedAt: new Date() }, { transaction })

    // A password reset is the moment to end every session that predates it - if the old
    // password leaked, a session opened with it might have too.
    await RefreshToken.update(
      { revokedAt: new Date() },
      {
        where: { subjectType: 'customer', subjectId: customer.id, revokedAt: { [Op.is]: null } },
        transaction,
      },
    )
  })

  return customer
}

// Path-scoped so the storefront's cookie is never sent to admin routes and vice versa,
// and named differently so both can coexist on localhost during development.
export function refreshCookieOptions(subjectType) {
  return {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: 'lax',
    domain: env.COOKIE_DOMAIN || undefined,
    path: subjectType === 'admin' ? '/api/admin/auth' : '/api/auth',
    maxAge: env.JWT_REFRESH_TTL_DAYS * 86_400_000,
  }
}

export const REFRESH_COOKIE = {
  admin: 'pa_admin_rt',
  customer: 'pa_rt',
}
