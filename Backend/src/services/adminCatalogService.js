import { Op } from 'sequelize'
import { sequelize } from '../db/index.js'
import models from '../db/models/index.js'
import { mediaUrl } from '../serializers/media.js'
import { conflict, notFound, unprocessable } from '../lib/errors.js'

const { Category, Collection, Product } = models

// --- categories --------------------------------------------------------------------------

function serializeCategory(category) {
  return {
    id: category.id,
    handle: category.handle,
    title: category.title,
    description: category.description,
    position: category.position,
    mediaId: category.mediaId,
    image: mediaUrl(category.image),
    productCount: category.products?.length ?? undefined,
  }
}

export async function listCategoriesAdmin() {
  const rows = await Category.findAll({
    include: [{ association: 'image' }, { association: 'products', attributes: ['id'] }],
    order: [['position', 'ASC']],
  })
  return rows.map(serializeCategory)
}

export async function getCategory(id) {
  const category = await Category.findByPk(id, {
    include: [{ association: 'image' }, { association: 'products', attributes: ['id'] }],
  })
  if (!category) throw notFound('No such category')
  return serializeCategory(category)
}

export async function createCategory(payload) {
  const category = await Category.create(payload)
  return getCategory(category.id)
}

export async function updateCategory(id, payload) {
  const category = await Category.findByPk(id)
  if (!category) throw notFound('No such category')

  const before = await getCategory(id)
  await category.update(payload)
  const after = await getCategory(id)
  return { before, after }
}

export async function deleteCategory(id) {
  const category = await Category.findByPk(id)
  if (!category) throw notFound('No such category')

  // Named specifically, rather than letting the RESTRICT foreign key answer with the
  // generic "still in use" the error handler falls back to - an admin deciding whether to
  // reassign products first needs to know how many there are, not just that there are some.
  const productCount = await Product.count({ where: { categoryId: id } })
  if (productCount > 0) {
    throw conflict(
      'CATEGORY_IN_USE',
      `${productCount} product${productCount === 1 ? '' : 's'} still use this category`,
    )
  }

  await category.destroy()
}

// --- collections -------------------------------------------------------------------------

function serializeCollection(collection) {
  return {
    id: collection.id,
    handle: collection.handle,
    title: collection.title,
    description: collection.description,
    cardLabel: collection.cardLabel,
    position: collection.position,
    isFeatured: collection.isFeatured,
    featuredPosition: collection.featuredPosition,
    isActive: collection.isActive,
    mediaId: collection.mediaId,
    image: mediaUrl(collection.image),
    productCount: collection.products?.length ?? undefined,
    productIds: collection.products?.map((product) => product.id),
  }
}

export async function listCollectionsAdmin() {
  const rows = await Collection.findAll({
    include: [{ association: 'image' }, { association: 'products', attributes: ['id'] }],
    order: [['position', 'ASC']],
  })
  return rows.map(serializeCollection)
}

// `transaction` matters here specifically because create/update below call this from
// inside their own transaction, before it commits. Querying on the default connection at
// that point cannot see the row it is looking for yet - not a race, the write simply is
// not durable until the transaction that made it returns.
export async function getCollection(id, { transaction } = {}) {
  const collection = await Collection.findByPk(id, {
    include: [{ association: 'image' }, { association: 'products', attributes: ['id'] }],
    transaction,
  })
  if (!collection) throw notFound('No such collection')
  return serializeCollection(collection)
}

// The featured row is a fixed 4-card strip on the homepage (FavoritesShowcase's sibling on
// Home) - a duplicate position there is not a data-modelling nicety, it is two cards
// fighting for the same slot. Checked here, ahead of the database's own partial unique
// index, so the admin gets a field-level message instead of an ALREADY_EXISTS 409 that
// does not say which field.
async function assertFeaturedPositionFree(featuredPosition, excludeId, transaction) {
  if (featuredPosition == null) return
  const clash = await Collection.findOne({
    where: {
      isFeatured: true,
      featuredPosition,
      ...(excludeId ? { id: { [Op.ne]: excludeId } } : {}),
    },
    transaction,
  })
  if (clash) {
    throw unprocessable('FEATURED_POSITION_TAKEN', `Position ${featuredPosition} is already used by "${clash.title}"`, [
      { field: 'featuredPosition', message: 'Already taken' },
    ])
  }
}

export async function createCollection(payload) {
  const { productIds, ...fields } = payload
  return sequelize.transaction(async (transaction) => {
    if (fields.isFeatured) await assertFeaturedPositionFree(fields.featuredPosition, null, transaction)

    const collection = await Collection.create(fields, { transaction })
    if (productIds) await collection.setProducts(productIds, { transaction })

    return getCollection(collection.id, { transaction })
  })
}

export async function updateCollection(id, payload) {
  const { productIds, ...fields } = payload

  return sequelize.transaction(async (transaction) => {
    const collection = await Collection.findByPk(id, { transaction })
    if (!collection) throw notFound('No such collection')

    const before = await getCollection(id)

    const willBeFeatured = fields.isFeatured ?? collection.isFeatured
    const nextPosition = 'featuredPosition' in fields ? fields.featuredPosition : collection.featuredPosition
    if (willBeFeatured) await assertFeaturedPositionFree(nextPosition, id, transaction)

    await collection.update(fields, { transaction })
    if (productIds) await collection.setProducts(productIds, { transaction })

    const after = await getCollection(id, { transaction })
    return { before, after }
  })
}

export async function deleteCollection(id) {
  const collection = await Collection.findByPk(id)
  if (!collection) throw notFound('No such collection')

  const productCount = await collection.countProducts()
  if (productCount > 0) {
    throw conflict(
      'COLLECTION_IN_USE',
      `${productCount} product${productCount === 1 ? ' is' : 's are'} still in this collection`,
    )
  }

  await collection.destroy()
}

export async function listFeaturedCollections() {
  const rows = await Collection.findAll({
    where: { isFeatured: true },
    include: [{ association: 'image' }],
    order: [['featuredPosition', 'ASC']],
  })
  return rows.map(serializeCollection)
}
