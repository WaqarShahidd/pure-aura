import { DataTypes } from 'sequelize'

export function defineCms(sequelize) {
  // Exactly four rows, fixed order, seeded and never created or destroyed through the
  // API. `content` is validated against a per-key zod schema in schemas/homepage.js, so
  // the blob cannot drift into a shape the storefront components cannot render.
  const HomepageSection = sequelize.define(
    'HomepageSection',
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      key: { type: DataTypes.CITEXT, allowNull: false, unique: true },
      label: { type: DataTypes.TEXT, allowNull: false },
      isEnabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      position: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      content: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
      updatedBy: DataTypes.UUID,
    },
    { tableName: 'homepage_sections' },
  )

  const StaticPage = sequelize.define(
    'StaticPage',
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      slug: { type: DataTypes.CITEXT, allowNull: false, unique: true },
      title: { type: DataTypes.TEXT, allowNull: false },
      // Must be a substring of title. AccentText renders it in Playfair italic and falls
      // back to the plain title when it does not match, so a typo is invisible rather
      // than broken markup.
      accent: DataTypes.TEXT,
      kind: {
        type: DataTypes.ENUM('policy', 'page'),
        allowNull: false,
        defaultValue: 'page',
      },
      // Non-null means this slug renders an interactive component instead of prose.
      // Page.jsx resolves it against a hardcoded whitelist, so the database can never
      // name a component that does not exist.
      customComponent: DataTypes.TEXT,
      updatedLabel: DataTypes.TEXT,
      intro: DataTypes.TEXT,
      isPublished: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      seoTitle: DataTypes.TEXT,
      seoDescription: DataTypes.TEXT,
      position: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    },
    { tableName: 'static_pages' },
  )

  const PageSection = sequelize.define(
    'PageSection',
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      pageId: { type: DataTypes.UUID, allowNull: false },
      heading: DataTypes.TEXT,
      body: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
      position: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    },
    { tableName: 'page_sections' },
  )

  const Faq = sequelize.define(
    'Faq',
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      key: { type: DataTypes.CITEXT, allowNull: false, unique: true },
      question: { type: DataTypes.TEXT, allowNull: false },
      answer: { type: DataTypes.TEXT, allowNull: false },
      position: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      isPublished: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    { tableName: 'faqs' },
  )

  // A self-referencing tree bounded by `kind`: root > group > column > link. The bound
  // is what keeps an admin from nesting the menu into a shape MegaPanel cannot draw.
  const NavItem = sequelize.define(
    'NavItem',
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      parentId: DataTypes.UUID,
      kind: {
        type: DataTypes.ENUM('root', 'group', 'column', 'link'),
        allowNull: false,
      },
      label: { type: DataTypes.TEXT, allowNull: false },
      layout: DataTypes.ENUM('mega', 'flyout', 'list', 'link'),
      targetType: {
        type: DataTypes.ENUM('collection', 'product', 'page', 'policy', 'custom', 'none'),
        allowNull: false,
        defaultValue: 'none',
      },
      targetId: DataTypes.UUID,
      customHref: DataTypes.TEXT,
      mediaId: DataTypes.UUID,
      seed: DataTypes.TEXT,
      highlight: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      allLabel: DataTypes.TEXT,
      allHref: DataTypes.TEXT,
      position: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    { tableName: 'nav_items' },
  )

  const FooterLinkGroup = sequelize.define(
    'FooterLinkGroup',
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      title: { type: DataTypes.TEXT, allowNull: false },
      position: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    { tableName: 'footer_link_groups' },
  )

  const FooterLink = sequelize.define(
    'FooterLink',
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      groupId: { type: DataTypes.UUID, allowNull: false },
      label: { type: DataTypes.TEXT, allowNull: false },
      targetType: {
        type: DataTypes.ENUM('collection', 'product', 'page', 'policy', 'custom', 'none'),
        allowNull: false,
        defaultValue: 'custom',
      },
      targetId: DataTypes.UUID,
      customHref: DataTypes.TEXT,
      position: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    },
    { tableName: 'footer_links' },
  )

  const Announcement = sequelize.define(
    'Announcement',
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      message: { type: DataTypes.TEXT, allowNull: false },
      ctaLabel: DataTypes.TEXT,
      ctaTargetType: {
        type: DataTypes.ENUM('collection', 'product', 'page', 'policy', 'custom', 'none'),
        allowNull: false,
        defaultValue: 'none',
      },
      ctaTargetId: DataTypes.UUID,
      ctaCustomHref: DataTypes.TEXT,
      position: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      startsAt: DataTypes.DATE,
      endsAt: DataTypes.DATE,
    },
    { tableName: 'announcements' },
  )

  // iconKey must name a key of the storefront's SOCIAL_ICONS map. An unknown value there
  // renders undefined as a component and white-screens the header, so the API filters
  // unknown keys out on read and the admin picker only offers valid ones.
  const SocialLink = sequelize.define(
    'SocialLink',
    {
      id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      label: { type: DataTypes.TEXT, allowNull: false },
      iconKey: { type: DataTypes.TEXT, allowNull: false },
      href: { type: DataTypes.TEXT, allowNull: false },
      position: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    { tableName: 'social_links' },
  )

  const Setting = sequelize.define(
    'Setting',
    {
      key: { type: DataTypes.TEXT, primaryKey: true },
      value: { type: DataTypes.JSONB, allowNull: false },
      group: { type: DataTypes.TEXT, allowNull: false, defaultValue: 'general', field: 'group' },
      updatedBy: DataTypes.UUID,
    },
    { tableName: 'settings' },
  )

  // The ledger unseed walks backwards. Reversed insertion order is automatically
  // foreign-key-safe, which is why no is_seed column is needed on domain tables.
  const SeedRecord = sequelize.define(
    'SeedRecord',
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      batchId: { type: DataTypes.UUID, allowNull: false },
      tableName: { type: DataTypes.TEXT, allowNull: false },
      recordId: { type: DataTypes.TEXT, allowNull: false },
      mediaKey: DataTypes.TEXT,
      insertedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    },
    { tableName: 'seed_records', timestamps: false },
  )

  return {
    HomepageSection,
    StaticPage,
    PageSection,
    Faq,
    NavItem,
    FooterLinkGroup,
    FooterLink,
    Announcement,
    SocialLink,
    Setting,
    SeedRecord,
  }
}
