import { Router } from 'express'
import { z } from 'zod'
import { validate } from '../../middleware/validate.js'
import { requireRole } from '../../middleware/auth.js'
import { auditFrom } from '../../services/auditService.js'
import * as service from '../../services/adminUserService.js'

const router = Router()
const asyncRoute = (handler) => (req, res, next) => handler(req, res, next).catch(next)

const createSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  name: z.string().min(1, 'Required'),
  password: z.string().min(8, 'Use at least 8 characters'),
  role: z.enum(['owner', 'manager', 'staff']).default('staff'),
  isActive: z.boolean().default(true),
})

const updateSchema = z.object({
  email: z.string().email('Enter a valid email address').optional(),
  name: z.string().min(1, 'Required').optional(),
  password: z.string().min(8, 'Use at least 8 characters').optional(),
  role: z.enum(['owner', 'manager', 'staff']).optional(),
  isActive: z.boolean().optional(),
})

// Who has access to the admin at all is an owner decision - a manager can run the shop
// day to day but should not be able to grant themselves or anyone else more power.
router.get('/admin-users', requireRole('owner'), asyncRoute(async (req, res) => {
  res.json({ data: await service.listAdminUsers() })
}))

router.post(
  '/admin-users', requireRole('owner'), validate(createSchema),
  asyncRoute(async (req, res) => {
    const user = await service.createAdminUser(req.body)
    await auditFrom(req)({ action: 'admin_user.create', entityType: 'admin_user', entityId: user.id, after: user })
    res.status(201).json({ data: user })
  }),
)

router.patch(
  '/admin-users/:id', requireRole('owner'), validate(updateSchema),
  asyncRoute(async (req, res) => {
    const { before, after } = await service.updateAdminUser(req.params.id, req.body)
    await auditFrom(req)({ action: 'admin_user.update', entityType: 'admin_user', entityId: req.params.id, before, after })
    res.json({ data: after })
  }),
)

router.delete(
  '/admin-users/:id', requireRole('owner'),
  asyncRoute(async (req, res) => {
    await service.deleteAdminUser(req.params.id, { actingAdminId: req.admin.id })
    await auditFrom(req)({ action: 'admin_user.delete', entityType: 'admin_user', entityId: req.params.id })
    res.status(204).end()
  }),
)

router.get(
  '/audit-log',
  requireRole('owner'),
  validate(
    z.object({
      page: z.coerce.number().int().min(1).default(1),
      perPage: z.coerce.number().int().min(1).max(100).default(50),
      entityType: z.string().optional(),
    }),
    'query',
  ),
  asyncRoute(async (req, res) => {
    const { data, meta } = await service.listAuditLog(req.query)
    res.json({ data, meta })
  }),
)

export default router
