import { Op, literal } from 'sequelize'
import models from '../db/models/index.js'
import { PRODUCT_INCLUDE, serializeProduct } from '../serializers/product.js'
import { mediaUrl } from '../serializers/media.js'
import { notFound } from '../lib/errors.js'

const { Product, Collection, Category, Facet, PriceRange, SortOption } = models

// Mirrors the nine accessors in Customer/src/data/catalog.js, one for one. Keeping the
// names and the semantics identical is what lets that file become a fetcher module
// without any consumer having to think about what changed underneath it.

// Only published products are ever public. Draft and archived rows exist for the admin.
const PUBLIC_SCOPE = { status: 'active', publishedAt: { [Op.ne]: null } }

// Sort is applied in SQL, from the {field, direction} descriptors that replaced the
// compare() functions in config/filters.js. Whitelisted rather than interpolated: `field`
// reaches here from a query string, and passing it to ORDER BY unchecked is an injection.
const SORTABLE = {
  title: 'title',
  price: 'price',
  review_count: 'review_count',
  rating: 'rating',
  created_at: 'created_at',
}

async function orderClauseFor(sortKey) {
  const option = sortKey
    ? await SortOption.findOne({ where: { key: sortKey, isActive: true } })
    : await SortOption.findOne({ where: { isDefault: true } })

  if (!option || !SORTABLE[option.field]) return [['position', 'ASC']]

  const direction = option.direction === 'desc' ? 'DESC' : 'ASC'

  // price lives on the variant, so ordering by it means ordering by the default variant's
  // price. A correlated subquery keeps that expressible without joining and de-duplicating.
  if (option.field === 'price') {
    return [
      [
        literal(
          '(SELECT price FROM product_variants pv WHERE pv.product_id = "Product".id AND pv.is_default LIMIT 1)',
        ),
        direction,
      ],
    ]
  }

  return [[SORTABLE[option.field], direction]]
}

export async function getAllProducts({ sort = null } = {}) {
  const rows = await Product.findAll({
    where: PUBLIC_SCOPE,
    include: PRODUCT_INCLUDE,
    order: await orderClauseFor(sort),
  })
  return rows.map(serializeProduct)
}

export async function getProductByHandle(handle) {
  const row = await Product.findOne({
    where: { handle, ...PUBLIC_SCOPE },
    include: PRODUCT_INCLUDE,
  })
  if (!row) throw notFound(`No product with handle "${handle}"`)
  return serializeProduct(row)
}

export async function getProductsByCollection(handle = 'all', { sort = null } = {}) {
  // 'all' is not a real membership - it is every product, exactly as the storefront's
  // getProductsByCollection treats it.
  if (handle === 'all') return getAllProducts({ sort })

  const collection = await Collection.findOne({ where: { handle, isActive: true } })
  if (!collection) throw notFound(`No collection with handle "${handle}"`)

  const rows = await Product.findAll({
    where: PUBLIC_SCOPE,
    include: [
      ...PRODUCT_INCLUDE,
      {
        association: 'collections',
        where: { id: collection.id },
        attributes: [],
        through: { attributes: [] },
        required: true,
      },
    ],
    order: await orderClauseFor(sort),
  })

  return rows.map(serializeProduct)
}

export async function getProductsByCategory(title) {
  const rows = await Product.findAll({
    where: PUBLIC_SCOPE,
    include: [
      ...PRODUCT_INCLUDE.filter((include) => include.association !== 'category'),
      { association: 'category', where: { title }, required: true },
    ],
    order: [['position', 'ASC']],
  })
  return rows.map(serializeProduct)
}

export async function getFavorites() {
  const rows = await Product.findAll({
    where: { ...PUBLIC_SCOPE, isFavorite: true },
    include: PRODUCT_INCLUDE,
    order: [['position', 'ASC']],
  })
  return rows.map(serializeProduct)
}

export async function getUpsells(excludeHandles = []) {
  const rows = await Product.findAll({
    where: {
      ...PUBLIC_SCOPE,
      isUpsell: true,
      ...(excludeHandles.length ? { handle: { [Op.notIn]: excludeHandles } } : {}),
    },
    include: PRODUCT_INCLUDE,
    order: [['position', 'ASC']],
  })
  return rows.map(serializeProduct)
}

// RoutineRow needs titles and images for the handles in product.routineWith. This is a
// separate call rather than an embedded field so the product payload keeps exactly the
// shape products.js had, which is what the serializer snapshot test pins down.
export async function getRoutineProducts(handle) {
  const product = await Product.findOne({
    where: { handle, ...PUBLIC_SCOPE },
    include: [{ association: 'routineProducts', through: { attributes: ['position'] } }],
  })
  if (!product) throw notFound(`No product with handle "${handle}"`)

  const handles = (product.routineProducts ?? []).map((related) => related.handle)
  if (handles.length === 0) return []

  const rows = await Product.findAll({
    where: { handle: { [Op.in]: handles }, ...PUBLIC_SCOPE },
    include: PRODUCT_INCLUDE,
  })

  // Preserve the curated order from routineWith rather than whatever the database returns.
  const byHandle = new Map(rows.map((row) => [row.handle, serializeProduct(row)]))
  return handles.map((related) => byHandle.get(related)).filter(Boolean)
}

export async function getCollections() {
  const rows = await Collection.findAll({
    where: { isActive: true },
    include: [{ association: 'image', include: [{ association: 'variants' }] }],
    order: [['position', 'ASC']],
  })
  return rows.map(serializeCollection)
}

export async function getCollectionByHandle(handle = 'all') {
  const row = await Collection.findOne({
    where: { handle, isActive: true },
    include: [{ association: 'image', include: [{ association: 'variants' }] }],
  })
  if (!row) throw notFound(`No collection with handle "${handle}"`)
  return serializeCollection(row)
}

export async function getFeaturedCollections() {
  const rows = await Collection.findAll({
    where: { isActive: true, isFeatured: true },
    include: [{ association: 'image', include: [{ association: 'variants' }] }],
    order: [['featuredPosition', 'ASC']],
  })
  return rows.map(serializeCollection)
}

export async function getCategories() {
  const rows = await Category.findAll({
    include: [{ association: 'image', include: [{ association: 'variants' }] }],
    order: [['position', 'ASC']],
  })
  return rows.map((row) => ({
    handle: row.handle,
    title: row.title,
    description: row.description ?? null,
    image: mediaUrl(row.image),
  }))
}

// The descriptors that replace config/filters.js. Note the storefront still does the
// filtering itself over the full collection - this endpoint only supplies the vocabulary,
// which keeps facet counts computed over the whole collection exactly as they are today.
export async function getFilterDescriptors() {
  const [facets, priceRanges, sortOptions] = await Promise.all([
    Facet.findAll({
      where: { isActive: true },
      include: [{ association: 'values', separate: true, order: [['position', 'ASC']] }],
      order: [['position', 'ASC']],
    }),
    PriceRange.findAll({ where: { isActive: true }, order: [['position', 'ASC']] }),
    SortOption.findAll({ where: { isActive: true }, order: [['position', 'ASC']] }),
  ])

  return {
    filters: facets.map((facet) => ({
      id: facet.key,
      label: facet.label,
      field: facet.fieldKey,
      type: facet.type,
      ...(facet.swatchField ? { swatchField: facet.swatchField } : {}),
    })),
    priceRanges: priceRanges.map((range) => ({
      id: range.key,
      label: range.label,
      min: range.minAmount,
      // null, not Infinity - JSON cannot carry Infinity and turns it into null anyway.
      max: range.maxAmount,
    })),
    sortOptions: sortOptions.map((option) => ({
      id: option.key,
      label: option.label,
      field: option.field,
      direction: option.direction,
    })),
    defaultSort: sortOptions.find((option) => option.isDefault)?.key ?? null,
  }
}

function serializeCollection(row) {
  return {
    handle: row.handle,
    title: row.title,
    description: row.description ?? null,
    image: mediaUrl(row.image),
    cardLabel: row.cardLabel ?? null,
  }
}
