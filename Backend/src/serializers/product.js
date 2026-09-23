import { mediaUrl } from './media.js'

// THIS IS THE CONTRACT FILE.
//
// The public product payload is shape-compatible with the object literals in
// Customer/src/data/products.js: the same 34 keys, the same types, the same value
// vocabulary. `availability` is still the string 'In stock'. `category` is still the
// title 'Serums'. `collections` is still an array of handles.
//
// That is what turns "rewrite the storefront" into "make nine accessors async". The
// snapshot test in tests/productSerializer.test.js diffs this function's output against
// that literal array; while it passes, swapping the data source cannot break the UI.
//
// Variants EXTEND the shape rather than changing it. Product-level price, compareAtPrice,
// inStock and variantSummary all read from the default variant, so ProductCard and every
// grid keep working untouched, and only the PDP looks at `variants`.

const MULTI_VALUE_FIELDS = new Set(['tags', 'skinType', 'ingredientFilter'])

// Facet values arrive as a flat list of joined rows; this groups them by the field name
// the storefront knows them as. facets.fieldKey is why the two mismatched ids in
// config/filters.js (collection -> collectionFilter, ingredient -> ingredientFilter)
// are expressed as data rather than as a naming coincidence someone can break.
function groupFacetValues(product) {
  const grouped = {}
  const swatches = {}

  for (const value of product.facetValues ?? []) {
    const field = value.facet?.fieldKey
    if (!field) continue

    if (MULTI_VALUE_FIELDS.has(field)) {
      grouped[field] = grouped[field] ?? []
      grouped[field].push(value.value)
    } else {
      grouped[field] = value.value
    }

    if (value.swatchHex && value.facet?.swatchField) {
      swatches[value.facet.swatchField] = value.swatchHex
    }
  }

  // Array order has to be stable or the snapshot diff turns into noise on every run.
  for (const field of MULTI_VALUE_FIELDS) {
    grouped[field]?.sort()
  }

  return { grouped, swatches }
}

// Variant labels are '<Scent> / <Size>' throughout the catalogue.
function sizeOf(variant) {
  if (!variant?.label) return null
  const [, size] = variant.label.split('/').map((part) => part.trim())
  return size ?? null
}

function defaultVariantOf(product) {
  const variants = product.variants ?? []
  return variants.find((variant) => variant.isDefault) ?? variants[0] ?? null
}

function serializeVariant(variant) {
  return {
    id: variant.id,
    sku: variant.sku ?? null,
    label: variant.label,
    price: variant.price,
    compareAtPrice: variant.compareAtPrice ?? null,
    inStock: variant.stockQuantity > 0,
    stockQuantity: variant.stockQuantity,
    image: mediaUrl(variant.image),
    isDefault: variant.isDefault,
    options: (variant.optionValues ?? []).map((value) => ({
      name: value.option?.name ?? null,
      value: value.value,
    })),
  }
}

export function serializeProduct(product) {
  const { grouped, swatches } = groupFacetValues(product)
  const variants = (product.variants ?? []).filter((variant) => variant.isActive)
  const fallback = defaultVariantOf(product)

  // A product is in stock if ANY sellable variant is. Deriving it means a variant selling
  // out can never leave the product filtering as available while the page says otherwise.
  const inStock = variants.some((variant) => variant.stockQuantity > 0)

  const images = (product.images ?? [])
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((image) => mediaUrl(image.media))

  return {
    id: product.handle,
    handle: product.handle,
    title: product.title,
    subtitle: product.subtitle ?? null,
    description: product.description ?? null,
    vendor: product.vendor ?? null,
    badge: product.badge ?? null,
    crueltyFree: product.crueltyFree,
    rating: product.rating ?? null,
    reviewCount: product.reviewCount,

    price: fallback?.price ?? 0,
    compareAtPrice: fallback?.compareAtPrice ?? null,

    image: mediaUrl(product.primaryImage) ?? images[0] ?? null,
    images,

    inStock,
    stockLabel: product.stockLabel ?? null,
    variantSummary: fallback?.label ?? null,

    ingredients: (product.ingredients ?? [])
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((ingredient) => ({ name: ingredient.name, percent: ingredient.percent })),
    ingredientNote: product.ingredientNote ?? null,

    // Derived, never stored - see the comment on the products table.
    availability: inStock ? 'In stock' : 'Out of stock',

    tags: grouped.tags ?? [],
    color: grouped.color ?? null,
    colorHex: swatches.colorHex ?? null,
    brand: grouped.brand ?? null,
    skinType: grouped.skinType ?? [],
    // `size` reads from the default variant, NOT from the facet join. Once sizes became a
    // variant axis a product can offer several, and the size facet is stored multi-valued
    // so filtering finds all of them - but the flat product field has to stay the single
    // string products.js carries, which is the default variant's size.
    size: sizeOf(fallback),
    texture: grouped.texture ?? null,
    collectionFilter: grouped.collectionFilter ?? null,
    ingredientFilter: grouped.ingredientFilter ?? [],

    collections: (product.collections ?? []).map((collection) => collection.handle).sort(),
    category: product.category?.title ?? null,
    isFavorite: product.isFavorite,
    isUpsell: product.isUpsell,
    routineWith: (product.routineProducts ?? []).map((related) => related.handle),

    // The one addition. Absent from products.js, ignored by every existing component,
    // read only by the PDP's variant selector.
    variants: variants
      .slice()
      .sort((a, b) => a.position - b.position)
      .map(serializeVariant),
  }
}

// The card payload ProductCard actually consumes. Listing endpoints send this instead of
// the full record so a 200-product grid does not ship ingredients and routine graphs.
export function serializeProductCard(product) {
  const full = serializeProduct(product)

  return {
    id: full.id,
    handle: full.handle,
    title: full.title,
    image: full.image,
    badge: full.badge,
    crueltyFree: full.crueltyFree,
    rating: full.rating,
    reviewCount: full.reviewCount,
    price: full.price,
    compareAtPrice: full.compareAtPrice,
    inStock: full.inStock,
    availability: full.availability,
  }
}

// Every include the full serializer needs. Exported so services cannot accidentally fetch
// a partial graph and silently serialize nulls into fields that should have values.
//
// `separate: true` on the to-many includes is load-bearing, not a tuning knob. Sequelize
// resolves includes as a single LEFT JOIN by default, and the row count multiplies across
// every branch: 3 images x 3 media variants x 4 ingredients x 2 variants x 2 option values
// x 4 collections x 5 routine products x ~7 facet values is tens of thousands of rows PER
// PRODUCT, all to reconstruct a few dozen objects. Without this the query does not merely
// run slowly - it stops returning, and the first version of this file hung a test suite
// for fourteen minutes before anyone looked at pg_stat_activity.
//
// `separate` issues one additional query per association instead, which is a handful of
// fast indexed lookups. It only applies to hasMany; the belongsToMany branches below stay
// joins, which is fine because each is small and none of them nest.
export const PRODUCT_INCLUDE = [
  { association: 'category' },
  { association: 'primaryImage', include: [{ association: 'variants', separate: true }] },
  {
    association: 'images',
    separate: true,
    include: [{ association: 'media', include: [{ association: 'variants' }] }],
  },
  { association: 'ingredients', separate: true },
  { association: 'collections' },
  { association: 'routineProducts' },
  { association: 'facetValues', include: [{ association: 'facet' }] },
  {
    association: 'variants',
    separate: true,
    include: [
      { association: 'image', include: [{ association: 'variants' }] },
      { association: 'optionValues', include: [{ association: 'option' }] },
    ],
  },
]
