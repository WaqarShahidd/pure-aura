// Filter and sort definitions for the collection page.
//
// One entry per pill in the filter bar. `field` names the product field, and `type` only picks
// how a row is drawn inside the dropdown — the matching logic is the same for all of them, so
// adding a facet is a one-line change here rather than a new component.
//
//   'list'   checkbox + label + count
//   'swatch' colour circle + label + count   (needs swatchField)
//   'range'  checkbox + a PRICE_RANGES label
export const FILTER_DEFS = [
  { id: 'availability', label: 'Availability', field: 'availability', type: 'list' },
  { id: 'price', label: 'Price', field: 'price', type: 'range' },
  { id: 'tags', label: 'Tags', field: 'tags', type: 'list' },
  { id: 'color', label: 'Color', field: 'color', type: 'swatch', swatchField: 'colorHex' },
  { id: 'brand', label: 'Brand', field: 'brand', type: 'list' },
  { id: 'skinType', label: 'Skin type', field: 'skinType', type: 'list' },
  { id: 'size', label: 'Size', field: 'size', type: 'list' },
  { id: 'texture', label: 'Texture', field: 'texture', type: 'list' },
  { id: 'collection', label: 'Collection Filter', field: 'collectionFilter', type: 'list' },
  { id: 'ingredient', label: 'Ingredient', field: 'ingredientFilter', type: 'list' },
]

// `price` is the one facet whose values are continuous, so it matches against buckets rather
// than against distinct field values.
export const PRICE_RANGES = [
  { id: 'under-7k', label: 'Under Rs 7,000', min: 0, max: 7000 },
  { id: '7k-14k', label: 'Rs 7,000 - Rs 14,000', min: 7000, max: 14000 },
  { id: '14k-28k', label: 'Rs 14,000 - Rs 28,000', min: 14000, max: 28000 },
  { id: 'over-28k', label: 'Over Rs 28,000', min: 28000, max: Infinity },
]

export const SORT_OPTIONS = [
  { id: 'alpha-asc', label: 'Alphabetically, A-Z', compare: (a, b) => a.title.localeCompare(b.title) },
  { id: 'alpha-desc', label: 'Alphabetically, Z-A', compare: (a, b) => b.title.localeCompare(a.title) },
  { id: 'price-asc', label: 'Price, low to high', compare: (a, b) => a.price - b.price },
  { id: 'price-desc', label: 'Price, high to low', compare: (a, b) => b.price - a.price },
  { id: 'best-selling', label: 'Best selling', compare: (a, b) => b.reviewCount - a.reviewCount },
  { id: 'rating', label: 'Highest rated', compare: (a, b) => b.rating - a.rating },
]

export const DEFAULT_SORT = 'alpha-asc'
