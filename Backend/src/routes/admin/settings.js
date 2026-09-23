import { Router } from 'express'
import { z } from 'zod'
import { validate } from '../../middleware/validate.js'
import { requireRole } from '../../middleware/auth.js'
import { auditFrom } from '../../services/auditService.js'
import * as service from '../../services/adminSettingsService.js'

const router = Router()
const asyncRoute = (handler) => (req, res, next) => handler(req, res, next).catch(next)

// --- delivery methods ----------------------------------------------------------------
const deliveryMethodSchema = z.object({
  code: z.string().min(1, 'Required'),
  label: z.string().min(1, 'Required'),
  detail: z.string().nullish(),
  priceAmount: z.number().int().min(0, 'Cannot be negative'),
  freeOverAmount: z.number().int().min(0).nullish(),
  isPickup: z.boolean().default(false),
  etaMinDays: z.number().int().min(0).nullish(),
  etaMaxDays: z.number().int().min(0).nullish(),
  isEnabled: z.boolean().default(true),
  position: z.number().int().default(0),
})

router.get('/delivery-methods', asyncRoute(async (req, res) => {
  res.json({ data: await service.listDeliveryMethods() })
}))

router.post(
  '/delivery-methods', requireRole('manager'), validate(deliveryMethodSchema),
  asyncRoute(async (req, res) => {
    const row = await service.createDeliveryMethod(req.body)
    await auditFrom(req)({ action: 'delivery_method.create', entityType: 'delivery_method', entityId: row.id, after: row })
    res.status(201).json({ data: row })
  }),
)

router.patch(
  '/delivery-methods/:id', requireRole('manager'), validate(deliveryMethodSchema.partial()),
  asyncRoute(async (req, res) => {
    const { before, after } = await service.updateDeliveryMethod(req.params.id, req.body)
    await auditFrom(req)({ action: 'delivery_method.update', entityType: 'delivery_method', entityId: req.params.id, before, after })
    res.json({ data: after })
  }),
)

router.delete(
  '/delivery-methods/:id', requireRole('manager'),
  asyncRoute(async (req, res) => {
    await service.deleteDeliveryMethod(req.params.id)
    await auditFrom(req)({ action: 'delivery_method.delete', entityType: 'delivery_method', entityId: req.params.id })
    res.status(204).end()
  }),
)

// --- tax rates -------------------------------------------------------------------------
const taxRateSchema = z.object({
  country: z.string().min(1, 'Required'),
  rateBp: z.number().int().min(0).max(10000, 'Basis points, up to 10000 (100%)'),
  isInclusive: z.boolean().default(true),
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true),
})

router.get('/tax-rates', asyncRoute(async (req, res) => {
  res.json({ data: await service.listTaxRates() })
}))

router.post(
  '/tax-rates', requireRole('manager'), validate(taxRateSchema),
  asyncRoute(async (req, res) => {
    const row = await service.createTaxRate(req.body)
    await auditFrom(req)({ action: 'tax_rate.create', entityType: 'tax_rate', entityId: row.id, after: row })
    res.status(201).json({ data: row })
  }),
)

router.patch(
  '/tax-rates/:id', requireRole('manager'), validate(taxRateSchema.partial()),
  asyncRoute(async (req, res) => {
    const { before, after } = await service.updateTaxRate(req.params.id, req.body)
    await auditFrom(req)({ action: 'tax_rate.update', entityType: 'tax_rate', entityId: req.params.id, before, after })
    res.json({ data: after })
  }),
)

// --- payment methods (PATCH only - enable/disable and edit copy, never create/delete) --
router.get('/payment-methods', asyncRoute(async (req, res) => {
  res.json({ data: await service.listPaymentMethods() })
}))

router.patch(
  '/payment-methods/:id',
  requireRole('manager'),
  validate(
    z.object({
      isEnabled: z.boolean().optional(),
      instructions: z.string().nullish(),
      surchargeAmount: z.number().int().min(0).optional(),
      config: z.record(z.any()).optional(),
    }),
  ),
  asyncRoute(async (req, res) => {
    const { before, after } = await service.updatePaymentMethod(req.params.id, req.body)
    await auditFrom(req)({ action: 'payment_method.update', entityType: 'payment_method', entityId: req.params.id, before, after })
    res.json({ data: after })
  }),
)

// --- couriers ----------------------------------------------------------------------------
const courierSchema = z.object({
  name: z.string().min(1, 'Required'),
  code: z.string().min(1, 'Required'),
  trackingUrlTemplate: z.string().nullish(),
  phone: z.string().nullish(),
  isActive: z.boolean().default(true),
  position: z.number().int().default(0),
})

router.get('/couriers', asyncRoute(async (req, res) => {
  res.json({ data: await service.listCouriers() })
}))

router.post(
  '/couriers', requireRole('manager'), validate(courierSchema),
  asyncRoute(async (req, res) => {
    const row = await service.createCourier(req.body)
    await auditFrom(req)({ action: 'courier.create', entityType: 'courier', entityId: row.id, after: row })
    res.status(201).json({ data: row })
  }),
)

router.patch(
  '/couriers/:id', requireRole('manager'), validate(courierSchema.partial()),
  asyncRoute(async (req, res) => {
    const { before, after } = await service.updateCourier(req.params.id, req.body)
    await auditFrom(req)({ action: 'courier.update', entityType: 'courier', entityId: req.params.id, before, after })
    res.json({ data: after })
  }),
)

router.delete(
  '/couriers/:id', requireRole('manager'),
  asyncRoute(async (req, res) => {
    await service.deleteCourier(req.params.id)
    await auditFrom(req)({ action: 'courier.delete', entityType: 'courier', entityId: req.params.id })
    res.status(204).end()
  }),
)

// --- feature flags -------------------------------------------------------------------------
router.get('/feature-flags', asyncRoute(async (req, res) => {
  res.json({ data: await service.listFeatureFlags() })
}))

router.patch(
  '/feature-flags/:key',
  requireRole('owner'),
  validate(z.object({ isEnabled: z.boolean() })),
  asyncRoute(async (req, res) => {
    const { before, after } = await service.updateFeatureFlag(req.params.key, req.body.isEnabled, req.admin.id)
    await auditFrom(req)({ action: 'feature_flag.update', entityType: 'feature_flag', entityId: req.params.key, before: { isEnabled: before }, after: { isEnabled: after } })
    res.json({ data: { key: req.params.key, isEnabled: after } })
  }),
)

export default router
