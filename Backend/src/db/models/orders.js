import { DataTypes } from 'sequelize'

export function defineOrders(sequelize) {
  const Order = sequelize.define(
    'Order',
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      number: { type: DataTypes.TEXT, allowNull: false, unique: true },
      customerId: DataTypes.UUID,
      guestEmail: DataTypes.CITEXT,
      // Hashed, like a password. It is the bearer credential a guest uses to see their
      // own order, so storing it in the clear would make a database read a session leak.
      accessTokenHash: DataTypes.TEXT,
      status: {
        type: DataTypes.ENUM(
          'pending_payment', 'confirmed', 'processing', 'packed', 'handed_to_courier',
          'in_transit', 'out_for_delivery', 'delivered', 'failed_delivery',
          'returned_to_sender', 'cancelled', 'refunded',
        ),
        allowNull: false,
        defaultValue: 'pending_payment',
      },
      paymentStatus: {
        type: DataTypes.ENUM(
          'unpaid', 'awaiting_verification', 'paid', 'partially_refunded', 'refunded', 'failed',
        ),
        allowNull: false,
        defaultValue: 'unpaid',
      },
      currency: { type: DataTypes.CHAR(3), allowNull: false, defaultValue: 'PKR' },

      subtotalAmount: { type: DataTypes.INTEGER, allowNull: false },
      discountAmount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      shippingAmount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      taxRateBp: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      // Informational only: prices include tax, so this is the portion contained within
      // the total, never something added to it.
      taxAmount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      taxInclusive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      totalAmount: { type: DataTypes.INTEGER, allowNull: false },

      deliveryMethodId: DataTypes.UUID,
      deliveryMethodLabel: DataTypes.TEXT,
      paymentMethodId: DataTypes.UUID,
      paymentMethodLabel: DataTypes.TEXT,
      discountId: DataTypes.UUID,
      discountCode: DataTypes.TEXT,

      contactEmail: { type: DataTypes.CITEXT, allowNull: false },
      contactPhone: DataTypes.TEXT,
      marketingOptIn: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },

      // Addresses are snapshots, not foreign keys. An order must not re-render
      // differently because the customer edited their address book afterwards.
      shipName: { type: DataTypes.TEXT, allowNull: false },
      shipLine1: { type: DataTypes.TEXT, allowNull: false },
      shipLine2: DataTypes.TEXT,
      shipCity: { type: DataTypes.TEXT, allowNull: false },
      shipRegion: DataTypes.TEXT,
      shipPostcode: DataTypes.TEXT,
      shipCountry: { type: DataTypes.TEXT, allowNull: false },
      shipPhone: DataTypes.TEXT,

      billingSame: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      billName: DataTypes.TEXT,
      billLine1: DataTypes.TEXT,
      billLine2: DataTypes.TEXT,
      billCity: DataTypes.TEXT,
      billRegion: DataTypes.TEXT,
      billPostcode: DataTypes.TEXT,
      billCountry: DataTypes.TEXT,
      billPhone: DataTypes.TEXT,

      courierId: DataTypes.UUID,
      trackingNumber: DataTypes.TEXT,
      trackingUrl: DataTypes.TEXT,

      customerNote: DataTypes.TEXT,
      adminNote: DataTypes.TEXT,

      placedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      confirmedAt: DataTypes.DATE,
      handedToCourierAt: DataTypes.DATE,
      deliveredAt: DataTypes.DATE,
      cancelledAt: DataTypes.DATE,
      cancelReason: DataTypes.TEXT,
    },
    {
      tableName: 'orders',
      defaultScope: { attributes: { exclude: ['accessTokenHash'] } },
      scopes: { withSecrets: { attributes: { include: ['accessTokenHash'] } } },
    },
  )

  // Every descriptive column here is a snapshot taken at purchase time, which is what
  // lets OrderDetail.jsx drop its getProductByHandle() lookup: the line describes itself.
  const OrderItem = sequelize.define(
    'OrderItem',
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      orderId: { type: DataTypes.UUID, allowNull: false },
      productId: DataTypes.UUID,
      variantId: DataTypes.UUID,
      handle: { type: DataTypes.TEXT, allowNull: false },
      title: { type: DataTypes.TEXT, allowNull: false },
      variantLabel: DataTypes.TEXT,
      sku: DataTypes.TEXT,
      imageUrl: DataTypes.TEXT,
      unitPrice: { type: DataTypes.INTEGER, allowNull: false },
      compareAtPrice: DataTypes.INTEGER,
      quantity: { type: DataTypes.INTEGER, allowNull: false },
      lineTotal: { type: DataTypes.INTEGER, allowNull: false },
      giftWrap: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      giftCard: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      giftMessage: DataTypes.TEXT,
      position: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    },
    { tableName: 'order_items' },
  )

  // Append-only, enforced by a database trigger. Sequelize will happily generate an
  // UPDATE if someone calls .save() on an instance; the trigger is what makes that a
  // loud error rather than a silent rewrite of history.
  const OrderStatusEvent = sequelize.define(
    'OrderStatusEvent',
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      orderId: { type: DataTypes.UUID, allowNull: false },
      fromStatus: DataTypes.STRING,
      toStatus: { type: DataTypes.STRING, allowNull: false },
      actorType: {
        type: DataTypes.ENUM('admin', 'customer', 'system'),
        allowNull: false,
      },
      actorId: DataTypes.UUID,
      note: DataTypes.TEXT,
      metadata: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
    },
    { tableName: 'order_status_events', updatedAt: false },
  )

  const Payment = sequelize.define(
    'Payment',
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      orderId: { type: DataTypes.UUID, allowNull: false },
      paymentMethodId: { type: DataTypes.UUID, allowNull: false },
      kind: {
        type: DataTypes.ENUM('offline', 'manual_transfer', 'gateway'),
        allowNull: false,
      },
      amount: { type: DataTypes.INTEGER, allowNull: false },
      status: {
        type: DataTypes.ENUM(
          'pending', 'awaiting_verification', 'succeeded', 'failed', 'refunded',
        ),
        allowNull: false,
        defaultValue: 'pending',
      },
      referenceCode: DataTypes.TEXT,
      proofMediaId: DataTypes.UUID,
      // What we told the customer to pay into, frozen at order time. Changing the shop's
      // bank details later must not retroactively rewrite where an old payment went.
      bankAccountSnapshot: DataTypes.JSONB,
      gatewayRef: DataTypes.TEXT,
      verifiedByAdminId: DataTypes.UUID,
      verifiedAt: DataTypes.DATE,
      failureReason: DataTypes.TEXT,
    },
    { tableName: 'payments' },
  )

  return { Order, OrderItem, OrderStatusEvent, Payment }
}
