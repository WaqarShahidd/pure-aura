import { DataTypes } from 'sequelize'

export function defineInventory(sequelize) {
  // Available stock is stockQuantity minus the sum of live holds. The storefront's
  // ten-minute countdown holds nothing today; these rows are what make expiry mean
  // something and stop two people buying the same last unit.
  const InventoryHold = sequelize.define(
    'InventoryHold',
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      cartToken: { type: DataTypes.TEXT, allowNull: false },
      variantId: { type: DataTypes.UUID, allowNull: false },
      quantity: { type: DataTypes.INTEGER, allowNull: false },
      expiresAt: { type: DataTypes.DATE, allowNull: false },
      releasedAt: DataTypes.DATE,
      orderId: DataTypes.UUID,
    },
    { tableName: 'inventory_holds' },
  )

  // An append-only ledger. stockQuantity is the running total, but this is the audit
  // trail that answers "where did those three units go".
  const InventoryMove = sequelize.define(
    'InventoryMove',
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      variantId: { type: DataTypes.UUID, allowNull: false },
      delta: { type: DataTypes.INTEGER, allowNull: false },
      reason: {
        type: DataTypes.ENUM('order', 'cancel', 'restock', 'adjustment', 'hold_expiry'),
        allowNull: false,
      },
      orderId: DataTypes.UUID,
      adminUserId: DataTypes.UUID,
      note: DataTypes.TEXT,
    },
    { tableName: 'inventory_moves', updatedAt: false },
  )

  const DiscountCode = sequelize.define(
    'DiscountCode',
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      code: { type: DataTypes.CITEXT, allowNull: false, unique: true },
      kind: {
        type: DataTypes.ENUM('percent', 'fixed', 'free_shipping'),
        allowNull: false,
      },
      // For 'percent' this is 0-100; for 'fixed' it is whole rupees; for 'free_shipping'
      // it is unused and the shipping line is zeroed instead.
      value: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      minSubtotal: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      maxUses: DataTypes.INTEGER,
      usedCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      perCustomerLimit: DataTypes.INTEGER,
      appliesTo: {
        type: DataTypes.ENUM('all', 'collection', 'product'),
        allowNull: false,
        defaultValue: 'all',
      },
      targetId: DataTypes.UUID,
      startsAt: DataTypes.DATE,
      endsAt: DataTypes.DATE,
      isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    { tableName: 'discount_codes' },
  )

  const DiscountRedemption = sequelize.define(
    'DiscountRedemption',
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      discountId: { type: DataTypes.UUID, allowNull: false },
      orderId: { type: DataTypes.UUID, allowNull: false },
      customerId: DataTypes.UUID,
      amount: { type: DataTypes.INTEGER, allowNull: false },
    },
    { tableName: 'discount_redemptions', updatedAt: false },
  )

  return { InventoryHold, InventoryMove, DiscountCode, DiscountRedemption }
}
