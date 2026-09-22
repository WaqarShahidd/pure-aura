// Naive substring search across the fields people actually type. Ranked so a title match
// outranks a match buried in the description.
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
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean)
  if (terms.length === 0) return []

  return products
    .map((product) => {
      let score = 0

      for (const term of terms) {
        let matchedTerm = false
        for (const { key, weight } of FIELDS) {
          const raw = product[key]
          const text = (Array.isArray(raw) ? raw.join(' ') : raw ?? '').toString().toLowerCase()
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
