import { Op } from 'sequelize'
import models from '../db/models/index.js'
import { conflict, notFound } from '../lib/errors.js'

const { DeliveryMethod, TaxRate, PaymentMethod, Courier, FeatureFlag, Order } = models

// --- delivery methods --------------------------------------------------------------------

function serializeDeliveryMethod(row) {
  return {
    id: row.id, code: row.code, label: row.label, detail: row.detail,
    priceAmount: row.priceAmount, freeOverAmount: row.freeOverAmount, isPickup: row.isPickup,
    etaMinDays: row.etaMinDays, etaMaxDays: row.etaMaxDays, isEnabled: row.isEnabled, position: row.position,
  }
}

export async function listDeliveryMethods() {
  const rows = await DeliveryMethod.findAll({ order: [['position', 'ASC']] })
  return rows.map(serializeDeliveryMethod)
}

export async function createDeliveryMethod(payload) {
  const row = await DeliveryMethod.create(payload)
  return serializeDeliveryMethod(row)
}

export async function updateDeliveryMethod(id, payload) {
  const row = await DeliveryMethod.findByPk(id)
  if (!row) throw notFound('No such delivery method')
  const before = serializeDeliveryMethod(row)
  await row.update(payload)
  return { before, after: serializeDeliveryMethod(row) }
}

export async function deleteDeliveryMethod(id) {
  const row = await DeliveryMethod.findByPk(id)
  if (!row) throw notFound('No such delivery method')
  const orderCount = await Order.count({ where: { deliveryMethodId: id } })
  if (orderCount > 0) {
    throw conflict('DELIVERY_METHOD_IN_USE', `${orderCount} order${orderCount === 1 ? '' : 's'} used this method - disable it instead`)
  }
  await row.destroy()
}

// --- tax rates ---------------------------------------------------------------------------

function serializeTaxRate(row) {
  return {
    id: row.id, country: row.country, rateBp: row.rateBp,
    isInclusive: row.isInclusive, isDefault: row.isDefault, isActive: row.isActive,
  }
}

export async function listTaxRates() {
  const rows = await TaxRate.findAll({ order: [['country', 'ASC']] })
  return rows.map(serializeTaxRate)
}

async function clearOtherDefaultTaxRates(exceptId = null) {
  await TaxRate.update({ isDefault: false }, { where: exceptId ? { id: { [Op.ne]: exceptId } } : {} })
}

export async function createTaxRate(payload) {
  if (payload.isDefault) await clearOtherDefaultTaxRates()
  const row = await TaxRate.create(payload)
  return serializeTaxRate(row)
}

export async function updateTaxRate(id, payload) {
  const row = await TaxRate.findByPk(id)
  if (!row) throw notFound('No such tax rate')
  const before = serializeTaxRate(row)
  if (payload.isDefault) await clearOtherDefaultTaxRates(id)
  await row.update(payload)
  return { before, after: serializeTaxRate(row) }
}

// --- payment methods (PATCH only - the five are seeded and fixed) ------------------------

function serializePaymentMethod(row) {
  return {
    id: row.id, code: row.code, label: row.label, kind: row.kind, isEnabled: row.isEnabled,
    requiresProof: row.requiresProof, instructions: row.instructions, iconKey: row.iconKey,
    surchargeAmount: row.surchargeAmount, featureFlagKey: row.featureFlagKey, config: row.config,
    position: row.position, isDeletable: row.isDeletable,
  }
}

export async function listPaymentMethods() {
  const rows = await PaymentMethod.findAll({ order: [['position', 'ASC']] })
  return rows.map(serializePaymentMethod)
}

// isEnabled is the merchant switch here; whether it is actually reachable also needs the
// engineering feature flag on, which is a separate resource by design - two independent
// gates, so nobody can turn on Card in Admin alone and strand a customer.
export async function updatePaymentMethod(id, payload) {
  const row = await PaymentMethod.findByPk(id)
  if (!row) throw notFound('No such payment method')
  const before = serializePaymentMethod(row)
  await row.update(payload)
  return { before, after: serializePaymentMethod(row) }
}

// --- couriers ------------------------------------------------------------------------------

function serializeCourier(row) {
  return {
    id: row.id, name: row.name, code: row.code, trackingUrlTemplate: row.trackingUrlTemplate,
    phone: row.phone, isActive: row.isActive, position: row.position,
  }
}

export async function listCouriers() {
  const rows = await Courier.findAll({ order: [['position', 'ASC']] })
  return rows.map(serializeCourier)
}

export async function createCourier(payload) {
  const row = await Courier.create(payload)
  return serializeCourier(row)
}

export async function updateCourier(id, payload) {
  const row = await Courier.findByPk(id)
  if (!row) throw notFound('No such courier')
  const before = serializeCourier(row)
  await row.update(payload)
  return { before, after: serializeCourier(row) }
}

export async function deleteCourier(id) {
  const row = await Courier.findByPk(id)
  if (!row) throw notFound('No such courier')
  const orderCount = await Order.count({ where: { courierId: id } })
  if (orderCount > 0) {
    throw conflict('COURIER_IN_USE', `${orderCount} order${orderCount === 1 ? '' : 's'} shipped with this courier - disable it instead`)
  }
  await row.destroy()
}

// --- feature flags -------------------------------------------------------------------------

export async function listFeatureFlags() {
  const rows = await FeatureFlag.findAll({ order: [['key', 'ASC']] })
  return rows.map((row) => ({ key: row.key, label: row.label, description: row.description, isEnabled: row.isEnabled }))
}

export async function updateFeatureFlag(key, isEnabled, adminUserId) {
  const row = await FeatureFlag.findByPk(key)
  if (!row) throw notFound('No such feature flag')
  const before = row.isEnabled
  await row.update({ isEnabled, updatedBy: adminUserId })
  return { before, after: row.isEnabled }
}
