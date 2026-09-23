import { Op } from 'sequelize'
import models from '../db/models/index.js'
import { notFound } from '../lib/errors.js'

const { SortOption, PriceRange } = models

// --- sort options --------------------------------------------------------------------

function serializeSortOption(row) {
  return {
    id: row.id,
    key: row.key,
    label: row.label,
    field: row.field,
    direction: row.direction,
    position: row.position,
    isDefault: row.isDefault,
    isActive: row.isActive,
  }
}

export async function listSortOptions() {
  const rows = await SortOption.findAll({ order: [['position', 'ASC']] })
  return rows.map(serializeSortOption)
}

// isDefault is a partial unique index (WHERE is_default) - only one row may hold it, so
// setting a new default has to clear the old one first or the insert/update just fails.
async function clearOtherDefaults(exceptId = null) {
  await SortOption.update(
    { isDefault: false },
    { where: exceptId ? { id: { [Op.ne]: exceptId } } : {} },
  )
}

export async function createSortOption(payload) {
  if (payload.isDefault) await clearOtherDefaults()
  const row = await SortOption.create(payload)
  return serializeSortOption(row)
}

export async function updateSortOption(id, payload) {
  const row = await SortOption.findByPk(id)
  if (!row) throw notFound('No such sort option')

  const before = serializeSortOption(row)
  if (payload.isDefault) await clearOtherDefaults(id)
  await row.update(payload)
  return { before, after: serializeSortOption(row) }
}

export async function deleteSortOption(id) {
  const row = await SortOption.findByPk(id)
  if (!row) throw notFound('No such sort option')
  await row.destroy()
}

// --- price ranges ----------------------------------------------------------------------

function serializePriceRange(row) {
  return {
    id: row.id,
    key: row.key,
    label: row.label,
    minAmount: row.minAmount,
    maxAmount: row.maxAmount,
    position: row.position,
    isActive: row.isActive,
  }
}

export async function listPriceRanges() {
  const rows = await PriceRange.findAll({ order: [['position', 'ASC']] })
  return rows.map(serializePriceRange)
}

export async function createPriceRange(payload) {
  const row = await PriceRange.create(payload)
  return serializePriceRange(row)
}

export async function updatePriceRange(id, payload) {
  const row = await PriceRange.findByPk(id)
  if (!row) throw notFound('No such price range')

  const before = serializePriceRange(row)
  await row.update(payload)
  return { before, after: serializePriceRange(row) }
}

export async function deletePriceRange(id) {
  const row = await PriceRange.findByPk(id)
  if (!row) throw notFound('No such price range')
  await row.destroy()
}
