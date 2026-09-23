// Turns each flat product literal into a real variant set.
//
// Every product carries a variantSummary of the form '<Scent> / <Size>' - 17 distinct
// values across the catalogue - which is display-only today: there is no selector, no
// per-size price and no per-size stock. That string is exactly two option axes, so it
// parses cleanly into the option/variant model.
//
// The DEFAULT variant always reproduces the literal exactly: same label, same price, same
// compareAtPrice. That is what keeps the serialized product byte-compatible with
// products.js while the extra sizes sit alongside it.

const SIZE_LADDER = ['15ml', '30ml', '50ml', '100ml']

// Deterministic, so re-seeding produces identical data. Same hash shape as the
// storefront's ImagePlaceholder.tintFor, for the same reason: stable output per handle.
function hashOf(seed) {
  let hash = 0
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) % 997
  }
  return hash
}

export function parseVariantSummary(summary) {
  const [scent, size] = summary.split('/').map((part) => part.trim())
  return { scent, size }
}

// Larger sizes cost more per unit but less per millilitre, which is how skincare is
// actually priced. Rounded to the nearest 100 rupees so the numbers look retail.
function priceForSize(basePrice, baseSize, targetSize) {
  const baseMl = Number.parseInt(baseSize, 10)
  const targetMl = Number.parseInt(targetSize, 10)
  if (!baseMl || !targetMl || baseMl === targetMl) return basePrice

  const scaled = basePrice * (targetMl / baseMl) ** 0.72
  return Math.max(100, Math.round(scaled / 100) * 100)
}

// Which sizes this product is offered in: always its own, plus one or two neighbours on
// the ladder. Chosen by hash so it is stable but varied across the catalogue.
function sizesFor(product, baseSize) {
  const hash = hashOf(product.handle)
  const baseIndex = SIZE_LADDER.indexOf(baseSize)
  if (baseIndex === -1) return [baseSize]

  // A third of products stay single-variant, which is the common case in a real shop and
  // keeps the PDP selector hidden for them.
  if (hash % 3 === 0) return [baseSize]

  const neighbours = [baseIndex - 1, baseIndex + 1].filter(
    (index) => index >= 0 && index < SIZE_LADDER.length,
  )
  const chosen = hash % 2 === 0 ? neighbours.slice(0, 1) : neighbours

  return [...new Set([baseSize, ...chosen.map((index) => SIZE_LADDER[index])])].sort(
    (a, b) => Number.parseInt(a, 10) - Number.parseInt(b, 10),
  )
}

function stockFor(product, size, index) {
  // The three out-of-stock products must have zero across every variant, or the derived
  // product-level inStock would disagree with the literal it is seeded from.
  if (!product.inStock) return 0

  const hash = hashOf(`${product.handle}:${size}`)
  // A handful of variants land low on purpose so the admin low-stock view has something
  // to show and the reservation logic has something to contend over.
  if (hash % 11 === 0) return 2
  if (hash % 7 === 0) return 5
  return 12 + (hash % 40) + index
}

export function deriveVariantsFor(product) {
  const { scent, size: baseSize } = parseVariantSummary(product.variantSummary)
  const sizes = sizesFor(product, baseSize)
  const scentAxis = scent === 'Unscented' || scent === 'Mixed' ? 'Scent' : 'Shade'

  const options =
    sizes.length > 1
      ? [
          { name: scentAxis, values: [scent] },
          { name: 'Size', values: sizes },
        ]
      : []

  const variants = sizes.map((size, index) => {
    const isDefault = size === baseSize
    const price = isDefault ? product.price : priceForSize(product.price, baseSize, size)

    return {
      label: `${scent} / ${size}`,
      sku: `${product.handle.toUpperCase().replace(/-/g, '').slice(0, 10)}-${size.toUpperCase()}`,
      price,
      // Only the default carries the literal's compare-at. Inventing a fake "was" price
      // for the other sizes would be dishonest merchandising, not realistic seed data.
      compareAtPrice: isDefault ? (product.compareAtPrice ?? null) : null,
      stockQuantity: stockFor(product, size, index),
      isDefault,
      position: index,
      optionValues: sizes.length > 1 ? { [scentAxis]: scent, Size: size } : {},
    }
  })

  return { options, variants }
}
