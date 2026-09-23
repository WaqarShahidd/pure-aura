import { DataTypes } from 'sequelize'

// `key` is the storage key, never a URL. URLs are computed at serialize time from
// MEDIA_PUBLIC_BASE_URL, which is the whole reason switching to S3 touches no rows.
export function defineMedia(sequelize) {
  const MediaAsset = sequelize.define(
    'MediaAsset',
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      key: { type: DataTypes.TEXT, allowNull: false, unique: true },
      originalFilename: DataTypes.TEXT,
      mime: { type: DataTypes.TEXT, allowNull: false },
      bytes: { type: DataTypes.INTEGER, allowNull: false },
      width: DataTypes.INTEGER,
      height: DataTypes.INTEGER,
      altText: DataTypes.TEXT,
      checksumSha256: DataTypes.CHAR(64),
      folder: { type: DataTypes.TEXT, allowNull: false, defaultValue: 'general' },
      visibility: {
        type: DataTypes.ENUM('public', 'private'),
        allowNull: false,
        defaultValue: 'public',
      },
      createdBy: DataTypes.UUID,
    },
    { tableName: 'media_assets' },
  )

  const MediaVariant = sequelize.define(
    'MediaVariant',
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      mediaId: { type: DataTypes.UUID, allowNull: false },
      label: { type: DataTypes.ENUM('thumb', 'md', 'lg'), allowNull: false },
      key: { type: DataTypes.TEXT, allowNull: false, unique: true },
      width: { type: DataTypes.INTEGER, allowNull: false },
      height: { type: DataTypes.INTEGER, allowNull: false },
      bytes: { type: DataTypes.INTEGER, allowNull: false },
    },
    { tableName: 'media_variants' },
  )

  return { MediaAsset, MediaVariant }
}
