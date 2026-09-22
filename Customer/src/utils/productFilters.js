// Pure filtering and sorting over the product array. No React here, so it can be reasoned
// about (and tested) on its own.

import { PRICE_RANGES, SORT_OPTIONS, DEFAULT_SORT } from '../config/filters'

// Normalises a field to an array. This one trick is what lets a single engine handle both
// scalar facets (brand, size) and multi-value ones (tags, skinType) without branching.
function valuesOf(product, field) {
  const value = product[field]
  if (Array.isArray(value)) return value
  return value == null ? [] : [value]
}

function priceRangeIdsFor(price) {
  return PRICE_RANGES.filter((range) => price >= range.min && price < range.max).map((r) => r.id)
}

/**
 * Builds the option list for each filter, with a count per value.
 *
 * Counts are computed over the whole collection, not over the currently filtered set: a count
 * that changed to its own result count the moment you ticked it would read as a bug.
 *
 * @returns {Record<string, Array<{ value, label, count, swatch }>>} keyed by filter id
 */
export function buildFacets(products, defs) {
  const facets = {}

  for (const def of defs) {
    const counts = new Map()

    for (const product of products) {
      const values =
        def.type === 'range' ? priceRangeIdsFor(product.price) : valuesOf(product, def.field)

      for (const value of values) {
        const existing = counts.get(value)
        if (existing) {
          existing.count += 1
        } else {
          counts.set(value, {
            value,
            label:
              def.type === 'range'
                ? PRICE_RANGES.find((range) => range.id === value)?.label ?? value
                : value,
            count: 1,
            swatch: def.swatchField ? product[def.swatchField] : undefined,
          })
        }
      }
    }

    // Price buckets keep their configured order; everything else reads alphabetically.
    const options = [...counts.values()]
    facets[def.id] = def.type === 'range'
      ? PRICE_RANGES.map((range) => options.find((o) => o.value === range.id)).filter(Boolean)
      : options.sort((a, b) => a.label.localeCompare(b.label))
  }

  return facets
}

/**
 * Applies the active selections. AND across different filters, OR within one — so
 * "Size: 30ml or 50ml" AND "Brand: Saje".
 *
 * @param active {Record<string, string[]>} filter id -> selected values
 */
export function applyFilters(products, active, defs) {
  const engaged = defs.filter((def) => active[def.id]?.length > 0)
  if (engaged.length === 0) return products

  return products.filter((product) =>
    engaged.every((def) => {
      const selected = active[def.id]
      const values =
        def.type === 'range' ? priceRangeIdsFor(product.price) : valuesOf(product, def.field)
      return values.some((value) => selected.includes(value))
    }),
  )
}

export function sortProducts(products, sortId = DEFAULT_SORT) {
  const option = SORT_OPTIONS.find((candidate) => candidate.id === sortId)
  if (!option) return products
  return [...products].sort(option.compare)
}

export function countActive(active) {
  return Object.values(active).reduce((total, values) => total + (values?.length ?? 0), 0)
}

/** Toggles one value within one filter, returning a new active map. */
export function toggleFilterValue(active, filterId, value) {
  const current = active[filterId] ?? []
  const next = current.includes(value)
    ? current.filter((candidate) => candidate !== value)
    : [...current, value]

  const updated = { ...active, [filterId]: next }
  if (next.length === 0) delete updated[filterId]
  return updated
}
