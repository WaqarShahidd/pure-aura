import { DataTypes } from 'sequelize'

// The facet vocabularies that both the collection filters and the quiz read from.
// fieldKey is what the serialized product calls this facet - 'collectionFilter' for the
// facet keyed 'collection', 'ingredientFilter' for 'ingredient'. Those two mismatches
// exist in config/filters.js today as a naming coincidence; here they are a column.
export function defineFacets(sequelize) {
  const Facet = sequelize.define(
    'Facet',
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      key: { type: DataTypes.CITEXT, allowNull: false, unique: true },
      label: { type: DataTypes.TEXT, allowNull: false },
      fieldKey: { type: DataTypes.TEXT, allowNull: false },
      type: {
        type: DataTypes.ENUM('list', 'swatch', 'range'),
        allowNull: false,
        defaultValue: 'list',
      },
      swatchField: DataTypes.TEXT,
      cardinality: {
        type: DataTypes.ENUM('single', 'multi'),
        allowNull: false,
        defaultValue: 'single',
      },
      position: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      isSystem: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    },
    { tableName: 'facets' },
  )

  const FacetValue = sequelize.define(
    'FacetValue',
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      facetId: { type: DataTypes.UUID, allowNull: false },
      value: { type: DataTypes.TEXT, allowNull: false },
      label: { type: DataTypes.TEXT, allowNull: false },
      swatchHex: DataTypes.CHAR(7),
      position: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    { tableName: 'facet_values' },
  )

  const ProductFacetValue = sequelize.define(
    'ProductFacetValue',
    {
      productId: { type: DataTypes.UUID, primaryKey: true },
      facetValueId: { type: DataTypes.UUID, primaryKey: true },
      facetId: { type: DataTypes.UUID, allowNull: false },
    },
    { tableName: 'product_facet_values', timestamps: false },
  )

  const PriceRange = sequelize.define(
    'PriceRange',
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      key: { type: DataTypes.CITEXT, allowNull: false, unique: true },
      label: { type: DataTypes.TEXT, allowNull: false },
      minAmount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      // null means unbounded - the honest spelling of the storefront's Infinity, which
      // JSON.stringify would silently turn into null anyway.
      maxAmount: DataTypes.INTEGER,
      position: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    { tableName: 'price_ranges' },
  )

  const SortOption = sequelize.define(
    'SortOption',
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      key: { type: DataTypes.CITEXT, allowNull: false, unique: true },
      label: { type: DataTypes.TEXT, allowNull: false },
      field: { type: DataTypes.TEXT, allowNull: false },
      direction: {
        type: DataTypes.ENUM('asc', 'desc'),
        allowNull: false,
        defaultValue: 'asc',
      },
      position: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      isDefault: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    { tableName: 'sort_options' },
  )

  const QuizQuestion = sequelize.define(
    'QuizQuestion',
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      key: { type: DataTypes.CITEXT, allowNull: false, unique: true },
      prompt: { type: DataTypes.TEXT, allowNull: false },
      facetId: { type: DataTypes.UUID, allowNull: false },
      position: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    { tableName: 'quiz_questions' },
  )

  const QuizAnswer = sequelize.define(
    'QuizAnswer',
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      questionId: { type: DataTypes.UUID, allowNull: false },
      label: { type: DataTypes.TEXT, allowNull: false },
      position: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    },
    { tableName: 'quiz_answers' },
  )

  const QuizAnswerValue = sequelize.define(
    'QuizAnswerValue',
    {
      answerId: { type: DataTypes.UUID, primaryKey: true },
      facetValueId: { type: DataTypes.UUID, primaryKey: true },
    },
    { tableName: 'quiz_answer_values', timestamps: false },
  )

  return {
    Facet,
    FacetValue,
    ProductFacetValue,
    PriceRange,
    SortOption,
    QuizQuestion,
    QuizAnswer,
    QuizAnswerValue,
  }
}
