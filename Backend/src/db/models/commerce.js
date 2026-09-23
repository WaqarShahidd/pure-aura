import { DataTypes } from 'sequelize'

// Couriers, delivery, tax, payment methods and feature flags - everything an order
// points at that is configured rather than transacted.
export function defineCommerce(sequelize) {
  const Courier = sequelize.define(
    'Courier',
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      name: { type: DataTypes.TEXT, allowNull: false },
      code: { type: DataTypes.CITEXT, allowNull: false, unique: true },
      // '{tracking}' is substituted once, when the order is handed over, and the result
      // stored on the order - so editing a template later never rewrites old orders.
      trackingUrlTemplate: DataTypes.TEXT,
      phone: DataTypes.TEXT,
      isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      position: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    },
    { tableName: 'couriers' },
  )

  const DeliveryMethod = sequelize.define(
    'DeliveryMethod',
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      code: { type: DataTypes.CITEXT, allowNull: false, unique: true },
      label: { type: DataTypes.TEXT, allowNull: false },
      detail: DataTypes.TEXT,
      priceAmount: { type: DataTypes.INTEGER, allowNull: false },
      freeOverAmount: DataTypes.INTEGER,
      isPickup: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      etaMinDays: DataTypes.SMALLINT,
      etaMaxDays: DataTypes.SMALLINT,
      isEnabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      position: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    },
    { tableName: 'delivery_methods' },
  )

  const TaxRate = sequelize.define(
    'TaxRate',
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      country: { type: DataTypes.TEXT, allowNull: false, unique: true },
      // Basis points: 1800 is 18%. An integer rate against an integer subtotal means no
      // float ever touches a total.
      rateBp: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      isInclusive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      isDefault: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    { tableName: 'tax_rates' },
  )

  const PaymentMethod = sequelize.define(
    'PaymentMethod',
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      code: { type: DataTypes.CITEXT, allowNull: false, unique: true },
      label: { type: DataTypes.TEXT, allowNull: false },
      kind: {
        type: DataTypes.ENUM('offline', 'manual_transfer', 'gateway'),
        allowNull: false,
      },
      isEnabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      requiresProof: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      instructions: DataTypes.TEXT,
      iconKey: DataTypes.TEXT,
      surchargeAmount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      // The second key of the two-key gate. A gateway is offered only when isEnabled is
      // true AND this flag is on, so nobody can turn on Card in the admin and strand a
      // customer on a form with no processor behind it.
      featureFlagKey: DataTypes.TEXT,
      config: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
      position: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      isDeletable: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    },
    { tableName: 'payment_methods' },
  )

  const FeatureFlag = sequelize.define(
    'FeatureFlag',
    {
      key: { type: DataTypes.TEXT, primaryKey: true },
      label: { type: DataTypes.TEXT, allowNull: false },
      description: DataTypes.TEXT,
      isEnabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      updatedBy: DataTypes.UUID,
    },
    { tableName: 'feature_flags' },
  )

  return { Courier, DeliveryMethod, TaxRate, PaymentMethod, FeatureFlag }
}
