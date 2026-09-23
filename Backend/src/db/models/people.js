import { DataTypes } from 'sequelize'

// Customers and admins are separate tables with separate token audiences. A customer
// row and an admin row have different lifecycles and different password policies;
// merging them behind a role column is how privilege-escalation bugs happen.
export function definePeople(sequelize) {
  const Customer = sequelize.define(
    'Customer',
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      email: { type: DataTypes.CITEXT, allowNull: false, unique: true },
      // Null for a guest who has ordered but never registered, so a later signup with
      // the same address can adopt the existing row and its order history.
      passwordHash: DataTypes.TEXT,
      firstName: DataTypes.TEXT,
      lastName: DataTypes.TEXT,
      phone: DataTypes.TEXT,
      birthday: DataTypes.DATEONLY,
      marketingOptIn: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      smsOptIn: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      rewardPoints: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      emailVerifiedAt: DataTypes.DATE,
      lastLoginAt: DataTypes.DATE,
      status: {
        type: DataTypes.ENUM('active', 'blocked'),
        allowNull: false,
        defaultValue: 'active',
      },
    },
    {
      tableName: 'customers',
      defaultScope: { attributes: { exclude: ['passwordHash'] } },
      scopes: { withSecrets: { attributes: { include: ['passwordHash'] } } },
    },
  )

  const Address = sequelize.define(
    'Address',
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      customerId: { type: DataTypes.UUID, allowNull: false },
      label: DataTypes.TEXT,
      isDefault: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      name: { type: DataTypes.TEXT, allowNull: false },
      line1: { type: DataTypes.TEXT, allowNull: false },
      line2: DataTypes.TEXT,
      city: { type: DataTypes.TEXT, allowNull: false },
      region: DataTypes.TEXT,
      postcode: DataTypes.TEXT,
      country: { type: DataTypes.TEXT, allowNull: false },
      phone: DataTypes.TEXT,
    },
    { tableName: 'addresses' },
  )

  const AdminUser = sequelize.define(
    'AdminUser',
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      email: { type: DataTypes.CITEXT, allowNull: false, unique: true },
      passwordHash: { type: DataTypes.TEXT, allowNull: false },
      name: { type: DataTypes.TEXT, allowNull: false },
      role: {
        type: DataTypes.ENUM('owner', 'manager', 'staff'),
        allowNull: false,
        defaultValue: 'staff',
      },
      isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      lastLoginAt: DataTypes.DATE,
    },
    {
      tableName: 'admin_users',
      defaultScope: { attributes: { exclude: ['passwordHash'] } },
      scopes: { withSecrets: { attributes: { include: ['passwordHash'] } } },
    },
  )

  const RefreshToken = sequelize.define(
    'RefreshToken',
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      subjectType: { type: DataTypes.ENUM('customer', 'admin'), allowNull: false },
      subjectId: { type: DataTypes.UUID, allowNull: false },
      tokenHash: { type: DataTypes.TEXT, allowNull: false, unique: true },
      expiresAt: { type: DataTypes.DATE, allowNull: false },
      revokedAt: DataTypes.DATE,
      replacedById: DataTypes.UUID,
      userAgent: DataTypes.TEXT,
      ip: DataTypes.INET,
    },
    { tableName: 'refresh_tokens' },
  )

  const PasswordReset = sequelize.define(
    'PasswordReset',
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      subjectType: { type: DataTypes.ENUM('customer', 'admin'), allowNull: false },
      subjectId: { type: DataTypes.UUID, allowNull: false },
      tokenHash: { type: DataTypes.TEXT, allowNull: false, unique: true },
      expiresAt: { type: DataTypes.DATE, allowNull: false },
      usedAt: DataTypes.DATE,
    },
    { tableName: 'password_resets' },
  )

  const AuditLog = sequelize.define(
    'AuditLog',
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      adminUserId: DataTypes.UUID,
      action: { type: DataTypes.TEXT, allowNull: false },
      entityType: { type: DataTypes.TEXT, allowNull: false },
      entityId: DataTypes.TEXT,
      before: DataTypes.JSONB,
      after: DataTypes.JSONB,
      ip: DataTypes.INET,
    },
    { tableName: 'audit_log', updatedAt: false },
  )

  return { Customer, Address, AdminUser, RefreshToken, PasswordReset, AuditLog }
}
