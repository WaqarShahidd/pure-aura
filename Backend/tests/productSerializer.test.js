import { afterAll, describe, expect, it } from 'vitest'
import { sequelize } from '../src/db/index.js'
import models from '../src/db/models/index.js'
import { PRODUCT_INCLUDE, serializeProduct } from '../src/serializers/product.js'
import { products as literalProducts } from '../seed/data/products.js'

// THE test. Everything else in this suite is secondary to it.
//
// It serializes the seeded catalogue and diffs the result against the object literals in
// Customer/src/data/products.js - the exact array the storefront reads today. While this
// passes, swapping the storefront's data source from those literals to this API cannot
// change what any component receives, which is what makes the P2 migration safe.
//
// Two fields are compared differently, both deliberately:
//
//   image / images - null in the literal because no product photography existed. After
//     seeding they are real URLs. Asserting equality would mean asserting the images are
//     still missing, so the test asserts the SHAPE instead: three entries, every one a
//     usable URL string.
//
//   variants - absent from the literal entirely. It is the one field variants added, and
//     no existing component reads it.

const COMPARED_SEPARATELY = new Set(['image', 'images', 'variants'])

async function loadSerialized() {
  const rows = await models.Product.findAll({
    include: PRODUCT_INCLUDE,
    order: [['position', 'ASC']],
  })
  return rows.map(serializeProduct)
}

describe('product serializer', () => {
  afterAll(async () => {
    await sequelize.close()
  })

  it('serializes every seeded product', async () => {
    const serialized = await loadSerialized()

    // A bare "expected 30" would pass against an empty database if the literal were ever
    // emptied too, so assert both sides independently.
    expect(literalProducts.length).toBe(30)
    expect(serialized.length).toBe(literalProducts.length)
  })

  it('matches Customer/src/data/products.js field for field', async () => {
    const serialized = await loadSerialized()
    const byHandle = new Map(serialized.map((product) => [product.handle, product]))

    const differences = []

    for (const literal of literalProducts) {
      const actual = byHandle.get(literal.handle)

      if (!actual) {
        differences.push(`${literal.handle}: missing from the API entirely`)
        continue
      }

      for (const [field, expected] of Object.entries(literal)) {
        if (COMPARED_SEPARATELY.has(field)) continue

        const received = actual[field]
        const same =
          Array.isArray(expected) && Array.isArray(received)
            ? JSON.stringify([...expected].sort()) === JSON.stringify([...received].sort())
            : JSON.stringify(expected) === JSON.stringify(received)

        if (!same) {
          differences.push(
            `${literal.handle}.${field}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(received)}`,
          )
        }
      }
    }

    expect(differences).toEqual([])
  })

  it('exposes no field the storefront does not already know about', async () => {
    const serialized = await loadSerialized()
    const literalFields = new Set(Object.keys(literalProducts[0]))

    // `variants` is the single sanctioned addition. Anything else appearing here means a
    // field leaked into the public payload without anyone deciding it should.
    const unexpected = Object.keys(serialized[0]).filter(
      (field) => !literalFields.has(field) && field !== 'variants',
    )

    expect(unexpected).toEqual([])
  })

  it('fills in real images where the literal had nulls', async () => {
    const serialized = await loadSerialized()

    for (const product of serialized) {
      expect(product.images, `${product.handle}.images`).toHaveLength(3)
      for (const url of product.images) {
        expect(url, `${product.handle} image url`).toMatch(/^https?:\/\/.+\.(webp|jpg|jpeg|png)$/)
      }
      expect(product.image, `${product.handle}.image`).toBeTruthy()
    }
  })

  it('derives availability from variant stock rather than storing it', async () => {
    const serialized = await loadSerialized()

    for (const product of serialized) {
      const anyStock = product.variants.some((variant) => variant.inStock)
      expect(product.inStock, `${product.handle}.inStock`).toBe(anyStock)
      expect(product.availability).toBe(anyStock ? 'In stock' : 'Out of stock')
    }
  })

  it('keeps product-level price and label on the default variant', async () => {
    const serialized = await loadSerialized()

    for (const product of serialized) {
      const fallback = product.variants.find((variant) => variant.isDefault)
      expect(fallback, `${product.handle} has a default variant`).toBeTruthy()
      expect(product.price).toBe(fallback.price)
      expect(product.variantSummary).toBe(fallback.label)
    }
  })
})
