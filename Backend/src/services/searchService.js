// A direct port of Customer/src/utils/searchProducts.js, scoring in JS over the serialized
// catalogue rather than in SQL.
//
// Postgres full-text search was the obvious alternative and is deliberately not used:
// it stems, it ranks by tf-idf, and it matches on token boundaries. All three would change
// which products come back and in what order, for no benefit a shopper would notice at
// this catalogue size. Ranking that quietly differs from what the storefront did last week
// is a worse outcome than a linear scan over a few hundred rows.
//
// Revisit somewhere north of a thousand products; until then, identical results win.

const FIELDS = [
  { key: 'title', weight: 6 },
  { key: 'subtitle', weight: 3 },
  { key: 'category', weight: 3 },
  { key: 'brand', weight: 2 },
  { key: 'texture', weight: 2 },
  { key: 'tags', weight: 2 },
  { key: 'skinType', weight: 2 },
  { key: 'ingredientFilter', weight: 2 },
  { key: 'description', weight: 1 },
]

export function searchProducts(products, query) {
  const terms = String(query ?? '')
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)

  if (terms.length === 0) return []

  return products
    .map((product) => {
      let score = 0

      for (const term of terms) {
        let matchedTerm = false

        for (const { key, weight } of FIELDS) {
          const raw = product[key]
          const text = (Array.isArray(raw) ? raw.join(' ') : (raw ?? '')).toString().toLowerCase()
          if (text.includes(term)) {
            score += weight
            matchedTerm = true
          }
        }

        // Every term must appear somewhere, so "vitamin lipstick" does not match a serum.
        if (!matchedTerm) return { product, score: 0 }
      }

      return { product, score }
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.product.title.localeCompare(b.product.title))
    .map((entry) => entry.product)
}
