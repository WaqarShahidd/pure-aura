import { DataTypes } from 'sequelize'

// Models are grouped by domain rather than one file per table. With forty-odd tables the
// one-file-per-table layout turns into forty near-empty modules and an import list nobody
// reads; grouping keeps each association visible next to the columns it joins.

export function defineCatalog(sequelize) {
  const Category = sequelize.define(
    'Category',
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      handle: { type: DataTypes.CITEXT, allowNull: false, unique: true },
      title: { type: DataTypes.TEXT, allowNull: false },
      description: DataTypes.TEXT,
      position: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      mediaId: DataTypes.UUID,
    },
    { tableName: 'categories' },
  )

  const Collection = sequelize.define(
    'Collection',
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      handle: { type: DataTypes.CITEXT, allowNull: false, unique: true },
      title: { type: DataTypes.TEXT, allowNull: false },
      description: DataTypes.TEXT,
      cardLabel: DataTypes.TEXT,
      mediaId: DataTypes.UUID,
      position: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      isFeatured: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      featuredPosition: DataTypes.INTEGER,
      isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      deletedAt: DataTypes.DATE,
    },
    { tableName: 'collections', paranoid: true },
  )

  const Product = sequelize.define(
    'Product',
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      handle: { type: DataTypes.CITEXT, allowNull: false, unique: true },
      title: { type: DataTypes.TEXT, allowNull: false },
      subtitle: DataTypes.TEXT,
      description: DataTypes.TEXT,
      vendor: DataTypes.TEXT,
      badge: DataTypes.ENUM('BEST SELLER', 'SALE'),
      crueltyFree: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      rating: DataTypes.SMALLINT,
      reviewCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      ingredientNote: DataTypes.TEXT,
      stockLabel: DataTypes.TEXT,
      categoryId: DataTypes.UUID,
      primaryImageId: DataTypes.UUID,
      isFavorite: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      isUpsell: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      status: {
        type: DataTypes.ENUM('draft', 'active', 'archived'),
        allowNull: false,
        defaultValue: 'draft',
      },
      publishedAt: DataTypes.DATE,
      position: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      seoTitle: DataTypes.TEXT,
      seoDescription: DataTypes.TEXT,
      deletedAt: DataTypes.DATE,
    },
    { tableName: 'products', paranoid: true },
  )

  const ProductOption = sequelize.define(
    'ProductOption',
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      productId: { type: DataTypes.UUID, allowNull: false },
      name: { type: DataTypes.TEXT, allowNull: false },
      position: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    },
    { tableName: 'product_options' },
  )

  const ProductOptionValue = sequelize.define(
    'ProductOptionValue',
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      optionId: { type: DataTypes.UUID, allowNull: false },
      value: { type: DataTypes.TEXT, allowNull: false },
      position: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    },
    { tableName: 'product_option_values' },
  )

  // Price and stock live here, not on Product. The storefront's product-level `price`,
  // `compareAtPrice`, `inStock` and `variantSummary` all serialize from the default
  // variant, which is why a single-variant product needs no UI anywhere.
  const ProductVariant = sequelize.define(
    'ProductVariant',
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      productId: { type: DataTypes.UUID, allowNull: false },
      sku: DataTypes.CITEXT,
      label: { type: DataTypes.TEXT, allowNull: false },
      price: { type: DataTypes.INTEGER, allowNull: false },
      compareAtPrice: DataTypes.INTEGER,
      stockQuantity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      lowStockThreshold: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 5 },
      mediaId: DataTypes.UUID,
      position: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      isDefault: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    { tableName: 'product_variants' },
  )

  const ProductImage = sequelize.define(
    'ProductImage',
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      productId: { type: DataTypes.UUID, allowNull: false },
      mediaId: { type: DataTypes.UUID, allowNull: false },
      position: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      altText: DataTypes.TEXT,
    },
    { tableName: 'product_images' },
  )

  const ProductIngredient = sequelize.define(
    'ProductIngredient',
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      productId: { type: DataTypes.UUID, allowNull: false },
      name: { type: DataTypes.TEXT, allowNull: false },
      percent: { type: DataTypes.SMALLINT, allowNull: false },
      position: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    },
    { tableName: 'product_ingredients' },
  )

  const CollectionProduct = sequelize.define(
    'CollectionProduct',
    {
      collectionId: { type: DataTypes.UUID, primaryKey: true },
      productId: { type: DataTypes.UUID, primaryKey: true },
      position: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    },
    { tableName: 'collection_products', timestamps: false },
  )

  const ProductRoutineProduct = sequelize.define(
    'ProductRoutineProduct',
    {
      productId: { type: DataTypes.UUID, primaryKey: true },
      relatedProductId: { type: DataTypes.UUID, primaryKey: true },
      position: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    },
    { tableName: 'product_routine_products', timestamps: false },
  )

  const VariantOptionValue = sequelize.define(
    'VariantOptionValue',
    {
      variantId: { type: DataTypes.UUID, primaryKey: true },
      optionValueId: { type: DataTypes.UUID, primaryKey: true },
    },
    { tableName: 'variant_option_values', timestamps: false },
  )

  return {
    Category,
    Collection,
    Product,
    ProductOption,
    ProductOptionValue,
    ProductVariant,
    ProductImage,
    ProductIngredient,
    CollectionProduct,
    ProductRoutineProduct,
    VariantOptionValue,
  }
}
