import { Op } from 'sequelize'
import { sequelize } from '../db/index.js'
import models from '../db/models/index.js'
import { PRODUCT_INCLUDE, serializeProduct } from '../serializers/product.js'
import { mediaUrl } from '../serializers/media.js'
import { conflict, notFound, unprocessable } from '../lib/errors.js'

const {
  Product, ProductVariant, ProductOption, ProductOptionValue, VariantOptionValue,
  ProductImage, ProductIngredient, Category, Collection, Facet, FacetValue,
  ProductFacetValue,
} = models

// The admin view of a product is deliberately NOT the public serialization. The storefront
// payload is flattened for display - price from the default variant, facets projected onto
// flat fields - while the editor needs the underlying structure it is editing.
export function serializeAdminProduct(product) {
  return {
    id: product.id,
    handle: product.handle,
    title: product.title,
    subtitle: product.subtitle,
    description: product.description,
    vendor: product.vendor,
    badge: product.badge,
    crueltyFree: product.crueltyFree,
    rating: product.rating,
    reviewCount: product.reviewCount,
    ingredientNote: product.ingredientNote,
    stockLabel: product.stockLabel,
    status: product.status,
    publishedAt: product.publishedAt,
    position: product.position,
    seoTitle: product.seoTitle,
    seoDescription: product.seoDescription,
    isFavorite: product.isFavorite,
    isUpsell: product.isUpsell,

    categoryId: product.categoryId,
    category: product.category ? { id: product.category.id, title: product.category.title } : null,

    images: (product.images ?? [])
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((image) => ({
        id: image.id,
        mediaId: image.mediaId,
        position: image.position,
        altText: image.altText,
        url: mediaUrl(image.media),
      })),

    ingredients: (product.ingredients ?? [])
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((row) => ({ id: row.id, name: row.name, percent: row.percent })),

    options: (product.options ?? [])
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((option) => ({
        id: option.id,
        name: option.name,
        values: (option.values ?? [])
          .slice()
          .sort((a, b) => a.position - b.position)
          .map((value) => ({ id: value.id, value: value.value })),
      })),

    variants: (product.variants ?? [])
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((variant) => ({
        id: variant.id,
        sku: variant.sku,
        label: variant.label,
        price: variant.price,
        compareAtPrice: variant.compareAtPrice,
        stockQuantity: variant.stockQuantity,
        lowStockThreshold: variant.lowStockThreshold,
        isDefault: variant.isDefault,
        isActive: variant.isActive,
        position: variant.position,
        mediaId: variant.mediaId,
        optionValues: (variant.optionValues ?? []).map((value) => ({
          optionValueId: value.id,
          option: value.option?.name ?? null,
          value: value.value,
        })),
      })),

    collectionIds: (product.collections ?? []).map((collection) => collection.id),
    facetValueIds: (product.facetValues ?? []).map((value) => value.id),
    routineHandles: (product.routineProducts ?? []).map((related) => related.handle),

    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  }
}

const ADMIN_INCLUDE = [
  ...PRODUCT_INCLUDE,
  {
    association: 'options',
    separate: true,
    include: [{ association: 'values' }],
  },
]

export async function listProducts({ page = 1, perPage = 25, q, status, categoryId } = {}) {
  const where = {}
  if (status) where.status = status
  if (categoryId) where.categoryId = categoryId
  if (q) {
    where[Op.or] = [
      { title: { [Op.iLike]: `%${q}%` } },
      { handle: { [Op.iLike]: `%${q}%` } },
    ]
  }

  // findAndCountAll with `separate` includes counts rows correctly; with joined to-many
  // includes it would count the join product instead and report inflated totals.
  const { rows, count } = await Product.findAndCountAll({
    where,
    include: ADMIN_INCLUDE,
    order: [['position', 'ASC']],
    limit: perPage,
    offset: (page - 1) * perPage,
    distinct: true,
  })

  return {
    data: rows.map(serializeAdminProduct),
    meta: { page, perPage, total: count, totalPages: Math.max(1, Math.ceil(count / perPage)) },
  }
}

export async function getProduct(id) {
  const product = await Product.findByPk(id, { include: ADMIN_INCLUDE })
  if (!product) throw notFound('No such product')
  return serializeAdminProduct(product)
}

async function assertHandleFree(handle, excludeId = null) {
  const existing = await Product.findOne({
    where: { handle, ...(excludeId ? { id: { [Op.ne]: excludeId } } : {}) },
    paranoid: false,
  })
  if (existing) {
    throw conflict('HANDLE_TAKEN', 'That handle is already used', [
      { field: 'handle', message: 'Already taken' },
    ])
  }
}

// Variants are replaced wholesale rather than diffed field by field. The editor sends the
// complete matrix it is showing, and reconciling a partial update against option changes
// (a size removed, a shade added) is far more error-prone than rebuilding from the payload.
//
// Rows that survive are UPDATED rather than recreated, though, because deleting a variant
// would orphan the order_items that point at it.
async function syncVariants(product, payload, transaction) {
  if (!payload.variants) return

  const optionRows = new Map()

  // Options first: variants reference their values.
  if (payload.options) {
    await ProductOption.destroy({ where: { productId: product.id }, transaction })

    for (const [index, option] of payload.options.entries()) {
      const optionRow = await ProductOption.create(
        { productId: product.id, name: option.name, position: index },
        { transaction },
      )

      for (const [valueIndex, value] of (option.values ?? []).entries()) {
        const valueRow = await ProductOptionValue.create(
          { optionId: optionRow.id, value, position: valueIndex },
          { transaction },
        )
        optionRows.set(`${option.name}:${value}`, valueRow.id)
      }
    }
  }

  const defaults = payload.variants.filter((variant) => variant.isDefault)
  if (defaults.length !== 1) {
    throw unprocessable(
      'ONE_DEFAULT_VARIANT_REQUIRED',
      'Exactly one variant must be the default',
      [{ field: 'variants', message: 'Pick exactly one default' }],
    )
  }

  const keptIds = payload.variants.map((variant) => variant.id).filter(Boolean)

  const removable = await ProductVariant.findAll({
    where: { productId: product.id, ...(keptIds.length ? { id: { [Op.notIn]: keptIds } } : {}) },
    transaction,
  })

  for (const variant of removable) {
    // Deactivate rather than delete when history points at it. The row has to survive for
    // the order line to keep resolving, but it must stop being purchasable.
    const referenced = await models.OrderItem.count({
      where: { variantId: variant.id },
      transaction,
    })
    if (referenced > 0) {
      await variant.update({ isActive: false, isDefault: false }, { transaction })
    } else {
      await variant.destroy({ transaction })
    }
  }

  // Clear the default before writing the new one, or the partial unique index rejects the
  // moment two rows claim it mid-update.
  await ProductVariant.update(
    { isDefault: false },
    { where: { productId: product.id }, transaction },
  )

  for (const [index, variant] of payload.variants.entries()) {
    const attributes = {
      productId: product.id,
      sku: variant.sku || null,
      label: variant.label,
      price: variant.price,
      compareAtPrice: variant.compareAtPrice ?? null,
      stockQuantity: variant.stockQuantity ?? 0,
      lowStockThreshold: variant.lowStockThreshold ?? 5,
      mediaId: variant.mediaId ?? null,
      isDefault: Boolean(variant.isDefault),
      isActive: variant.isActive ?? true,
      position: index,
    }

    let row
    if (variant.id) {
      row = await ProductVariant.findByPk(variant.id, { transaction })
      if (!row) throw notFound('No such variant')
      await row.update(attributes, { transaction })
    } else {
      row = await ProductVariant.create(attributes, { transaction })
    }

    await VariantOptionValue.destroy({ where: { variantId: row.id }, transaction })

    for (const [optionName, value] of Object.entries(variant.optionValues ?? {})) {
      const optionValueId = optionRows.get(`${optionName}:${value}`)
      if (optionValueId) {
        await VariantOptionValue.create(
          { variantId: row.id, optionValueId },
          { transaction },
        )
      }
    }
  }
}

async function syncImages(product, payload, transaction) {
  if (!payload.images) return

  await ProductImage.destroy({ where: { productId: product.id }, transaction })

  for (const [index, image] of payload.images.entries()) {
    await ProductImage.create(
      {
        productId: product.id,
        mediaId: image.mediaId,
        position: index,
        altText: image.altText ?? product.title,
      },
      { transaction },
    )
  }

  await product.update(
    { primaryImageId: payload.images[0]?.mediaId ?? null },
    { transaction },
  )
}

async function syncIngredients(product, payload, transaction) {
  if (!payload.ingredients) return

  await ProductIngredient.destroy({ where: { productId: product.id }, transaction })

  for (const [index, ingredient] of payload.ingredients.entries()) {
    await ProductIngredient.create(
      { productId: product.id, name: ingredient.name, percent: ingredient.percent, position: index },
      { transaction },
    )
  }
}

async function syncFacetValues(product, payload, transaction) {
  if (!payload.facetValueIds) return

  const values = await FacetValue.findAll({
    where: { id: { [Op.in]: payload.facetValueIds } },
    include: [{ association: 'facet' }],
    transaction,
  })

  // Cardinality is enforced here rather than in the schema: expressing "at most one row
  // per product per facet" in Postgres needs a generated column, which is a lot of
  // machinery for a rule the service can state in three lines.
  const perFacet = new Map()
  for (const value of values) {
    const list = perFacet.get(value.facetId) ?? []
    list.push(value)
    perFacet.set(value.facetId, list)
  }

  for (const [, list] of perFacet) {
    if (list[0].facet?.cardinality === 'single' && list.length > 1) {
      throw unprocessable(
        'TOO_MANY_FACET_VALUES',
        `${list[0].facet.label} allows only one value`,
        [{ field: 'facetValueIds', message: `Pick one ${list[0].facet.label.toLowerCase()}` }],
      )
    }
  }

  await ProductFacetValue.destroy({ where: { productId: product.id }, transaction })

  for (const value of values) {
    await ProductFacetValue.create(
      { productId: product.id, facetValueId: value.id, facetId: value.facetId },
      { transaction },
    )
  }
}

async function syncCollections(product, payload, transaction) {
  if (!payload.collectionIds) return
  await product.setCollections(payload.collectionIds, { transaction })
}

const WRITABLE = [
  'handle', 'title', 'subtitle', 'description', 'vendor', 'badge', 'crueltyFree',
  'rating', 'reviewCount', 'ingredientNote', 'stockLabel', 'categoryId',
  'isFavorite', 'isUpsell', 'status', 'position', 'seoTitle', 'seoDescription',
]

function writableFrom(payload) {
  const attributes = {}
  for (const key of WRITABLE) {
    if (payload[key] !== undefined) attributes[key] = payload[key]
  }
  return attributes
}

export async function createProduct(payload) {
  await assertHandleFree(payload.handle)

  return sequelize.transaction(async (transaction) => {
    const product = await Product.create(
      {
        ...writableFrom(payload),
        // Publishing is an explicit act. A new product starts as a draft so it cannot
        // appear on the storefront half-filled.
        status: payload.status ?? 'draft',
        publishedAt: payload.status === 'active' ? new Date() : null,
      },
      { transaction },
    )

    await syncImages(product, payload, transaction)
    await syncIngredients(product, payload, transaction)
    await syncVariants(product, payload, transaction)
    await syncFacetValues(product, payload, transaction)
    await syncCollections(product, payload, transaction)

    return product.id
  })
}

export async function updateProduct(id, payload) {
  const product = await Product.findByPk(id)
  if (!product) throw notFound('No such product')
  if (payload.handle) await assertHandleFree(payload.handle, id)

  const before = serializeAdminProduct(
    await Product.findByPk(id, { include: ADMIN_INCLUDE }),
  )

  await sequelize.transaction(async (transaction) => {
    const attributes = writableFrom(payload)

    // publishedAt is stamped the first time a product goes active and left alone after,
    // so re-publishing does not rewrite its original publication date.
    if (payload.status === 'active' && !product.publishedAt) attributes.publishedAt = new Date()

    await product.update(attributes, { transaction })
    await syncImages(product, payload, transaction)
    await syncIngredients(product, payload, transaction)
    await syncVariants(product, payload, transaction)
    await syncFacetValues(product, payload, transaction)
    await syncCollections(product, payload, transaction)
  })

  return { before, after: await getProduct(id) }
}

export async function deleteProduct(id) {
  const product = await Product.findByPk(id)
  if (!product) throw notFound('No such product')

  const orderedCount = await models.OrderItem.count({ where: { productId: id } })
  if (orderedCount > 0) {
    // Soft delete keeps order history intact. A hard delete would null the order line's
    // product_id and lose the link entirely.
    await product.update({ status: 'archived' })
    await product.destroy()
    return { archived: true }
  }

  await product.destroy({ force: true })
  return { archived: false }
}

export async function publicPreviewOf(id) {
  const product = await Product.findByPk(id, { include: PRODUCT_INCLUDE })
  if (!product) throw notFound('No such product')
  return serializeProduct(product)
}

export async function listCategories() {
  const rows = await Category.findAll({ order: [['position', 'ASC']] })
  return rows.map((row) => ({
    id: row.id,
    handle: row.handle,
    title: row.title,
    description: row.description,
    position: row.position,
  }))
}

export async function listCollectionsForPicker() {
  const rows = await Collection.findAll({ order: [['position', 'ASC']] })
  return rows.map((row) => ({ id: row.id, handle: row.handle, title: row.title }))
}

export async function listFacetsForPicker() {
  const rows = await Facet.findAll({
    where: { isActive: true, isSystem: false },
    include: [{ association: 'values', separate: true, order: [['position', 'ASC']] }],
    order: [['position', 'ASC']],
  })

  return rows.map((facet) => ({
    id: facet.id,
    key: facet.key,
    label: facet.label,
    cardinality: facet.cardinality,
    values: (facet.values ?? []).map((value) => ({
      id: value.id,
      value: value.value,
      label: value.label,
    })),
  }))
}
