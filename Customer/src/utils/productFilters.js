// Pure filtering and sorting over the product array. No React here, so it can be reasoned
// about (and tested) on its own.
//
// The filter definitions, price ranges and sort options now arrive from the API instead of
// being imported from config/filters.js, so every function here takes them as arguments.
// That is what lets an admin add a skin type or a sort order without a code change.

// Sort used to be a compare() function attached to each option, which cannot be stored in
// a database or sent over the wire. The API sends { field, direction } instead, and this is
// the lookup that turns a field name back into a comparator.
//
// Deliberately a closed map: an admin can add "Newest first" by pointing a new sort option
// at created_at, but cannot invent a field that no product carries - which is correct,
// since a genuinely new field needs a column behind it anyway.
const COMPARATORS = {
  title: (a, b) => a.title.localeCompare(b.title),
  price: (a, b) => a.price - b.price,
  review_count: (a, b) => a.reviewCount - b.reviewCount,
  rating: (a, b) => a.rating - b.rating,
  created_at: (a, b) => String(a.createdAt ?? '').localeCompare(String(b.createdAt ?? '')),
}

// Normalises a field to an array. This one trick is what lets a single engine handle both
// scalar facets (brand, size) and multi-value ones (tags, skinType) without branching.
function valuesOf(product, field) {
  const value = product[field]
  if (Array.isArray(value)) return value
  return value == null ? [] : [value]
}

// An open-ended top bucket carries max: null, not Infinity. JSON.stringify turns Infinity
// into null, so a range that came from an API would silently stop matching anything if
// this compared against it directly.
function priceRangeIdsFor(price, priceRanges) {
  return priceRanges
    .filter((range) => price >= range.min && (range.max == null || price < range.max))
    .map((range) => range.id)
}

/**
 * Builds the option list for each filter, with a count per value.
 *
 * Counts are computed over the whole collection, not over the currently filtered set: a count
 * that changed to its own result count the moment you ticked it would read as a bug.
 *
 * @returns {Record<string, Array<{ value, label, count, swatch }>>} keyed by filter id
 */
export function buildFacets(products, defs, priceRanges = []) {
  const facets = {}

  for (const def of defs) {
    const counts = new Map()

    for (const product of products) {
      const values =
        def.type === 'range'
          ? priceRangeIdsFor(product.price, priceRanges)
          : valuesOf(product, def.field)

      for (const value of values) {
        const existing = counts.get(value)
        if (existing) {
          existing.count += 1
        } else {
          counts.set(value, {
            value,
            label:
              def.type === 'range'
                ? (priceRanges.find((range) => range.id === value)?.label ?? value)
                : value,
            count: 1,
            swatch: def.swatchField ? product[def.swatchField] : undefined,
          })
        }
      }
    }

    // Price buckets keep their configured order; everything else reads alphabetically.
    const options = [...counts.values()]
    facets[def.id] =
      def.type === 'range'
        ? priceRanges.map((range) => options.find((o) => o.value === range.id)).filter(Boolean)
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
export function applyFilters(products, active, defs, priceRanges = []) {
  const engaged = defs.filter((def) => active[def.id]?.length > 0)
  if (engaged.length === 0) return products

  return products.filter((product) =>
    engaged.every((def) => {
      const selected = active[def.id]
      const values =
        def.type === 'range'
          ? priceRangeIdsFor(product.price, priceRanges)
          : valuesOf(product, def.field)
      return values.some((value) => selected.includes(value))
    }),
  )
}

export function sortProducts(products, sortId, sortOptions = []) {
  const option = sortOptions.find((candidate) => candidate.id === sortId)
  const compare = option && COMPARATORS[option.field]
  if (!compare) return products

  const sorted = [...products].sort(compare)
  return option.direction === 'desc' ? sorted.reverse() : sorted
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

// --- URL encoding --------------------------------------------------------------------
// Filter state lives in the query string so a filtered view can be shared, bookmarked and
// reached with the back button. The encoding mirrors toggleFilterValue's shape: one
// parameter per filter, comma-separated values, and a filter with nothing selected is
// absent rather than empty.

export function activeFromParams(params, defs) {
  const active = {}

  for (const def of defs) {
    const raw = params.get(def.id)
    if (!raw) continue
    const values = raw.split(',').filter(Boolean)
    if (values.length > 0) active[def.id] = values
  }

  return active
}

export function paramsFromActive(active, { sort, page, view } = {}) {
  const params = new URLSearchParams()

  for (const [filterId, values] of Object.entries(active)) {
    if (values?.length) params.set(filterId, values.join(','))
  }

  if (sort) params.set('sort', sort)
  if (page && page > 1) params.set('page', String(page))
  if (view && view !== 'grid') params.set('view', view)

  return params
}
