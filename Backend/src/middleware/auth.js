import models from '../db/models/index.js'
import { forbidden, unauthorized } from '../lib/errors.js'
import { verifyAccessToken } from '../services/authService.js'

const { AdminUser, Customer } = models

// Roles are cumulative: an owner can do anything a manager can, a manager anything staff
// can. Comparing ranks rather than listing roles per route means adding a role later is
// one line here instead of an audit of every endpoint.
const ROLE_RANK = { staff: 1, manager: 2, owner: 3 }

function bearerFrom(req) {
  const header = req.get('authorization')
  if (!header?.startsWith('Bearer ')) return null
  return header.slice(7).trim() || null
}

export function requireAdmin(req, res, next) {
  const token = bearerFrom(req)
  if (!token) return next(unauthorized('Sign in to continue'))

  Promise.resolve()
    .then(async () => {
      const claims = verifyAccessToken('admin', token)

      // The row is re-read rather than trusted from the token, so deactivating an account
      // or changing its role takes effect on the next request instead of whenever the
      // access token happens to expire.
      const admin = await AdminUser.findByPk(claims.sub)
      if (!admin || !admin.isActive) throw unauthorized('That account is no longer active')

      req.admin = admin
      next()
    })
    .catch(next)
}

export function requireRole(minimum) {
  return (req, res, next) => {
    const rank = ROLE_RANK[req.admin?.role] ?? 0
    if (rank < (ROLE_RANK[minimum] ?? Infinity)) {
      return next(forbidden(`This needs ${minimum} access`))
    }
    next()
  }
}

export function requireCustomer(req, res, next) {
  const token = bearerFrom(req)
  if (!token) return next(unauthorized('Sign in to continue'))

  Promise.resolve()
    .then(async () => {
      const claims = verifyAccessToken('customer', token)
      const customer = await Customer.findByPk(claims.sub)
      if (!customer || customer.status === 'blocked') {
        throw unauthorized('That account is no longer active')
      }

      req.customer = customer
      next()
    })
    .catch(next)
}

// For endpoints that behave differently when signed in but must still work for guests -
// order lookup, checkout. A bad token is ignored rather than rejected, because a guest
// with a stale cookie should still be able to buy something.
export function optionalCustomer(req, res, next) {
  const token = bearerFrom(req)
  if (!token) return next()

  Promise.resolve()
    .then(async () => {
      try {
        const claims = verifyAccessToken('customer', token)
        const customer = await Customer.findByPk(claims.sub)
        if (customer && customer.status !== 'blocked') req.customer = customer
      } catch {
        // Ignored on purpose - see above.
      }
      next()
    })
    .catch(next)
}
