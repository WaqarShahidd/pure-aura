// Everything the admin panel edits that is not catalogue or orders.

export async function up({ context }) {
  const { sequelize } = context

  await sequelize.query(`
    -- Exactly four rows, at fixed positions, seeded and never created or destroyed
    -- through the API: hero, favorites, marquee_quiz, routine_steps. The decision was
    -- "fixed sections, editable fields", so POST and DELETE are refused on this resource
    -- and only content, is_enabled and the within-section ordering are editable.
    --
    -- content is jsonb validated server-side against a per-key zod schema
    -- (src/schemas/homepage.js), so the shape cannot drift into something the storefront
    -- components cannot render.
    CREATE TABLE homepage_sections (
      id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      key        citext NOT NULL UNIQUE,
      label      text NOT NULL,
      is_enabled boolean NOT NULL DEFAULT true,
      position   integer NOT NULL DEFAULT 0,
      content    jsonb NOT NULL DEFAULT '{}'::jsonb,
      updated_by uuid REFERENCES admin_users (id) ON DELETE SET NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );

    -- custom_component collapses the second registry. Page.jsx currently holds a
    -- CUSTOM_PAGES map of four slugs to interactive components, with their titles and
    -- intros hardcoded there - so those four pages are not editable at all today. One
    -- table now lists all thirteen routes; Page.jsx looks up a component only when this
    -- column is non-null, against a hardcoded whitelist, so the database can never name
    -- a component that does not exist.
    CREATE TABLE static_pages (
      id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      slug             citext NOT NULL UNIQUE,
      title            text NOT NULL,
      accent           text,
      kind             page_kind NOT NULL DEFAULT 'page',
      custom_component text,
      updated_label    text,
      intro            text,
      is_published     boolean NOT NULL DEFAULT true,
      seo_title        text,
      seo_description  text,
      position         integer NOT NULL DEFAULT 0,
      created_at       timestamptz NOT NULL DEFAULT now(),
      updated_at       timestamptz NOT NULL DEFAULT now()
    );

    -- body is a jsonb array of paragraph strings rather than a paragraphs table.
    -- Paragraphs have no identity and no foreign keys pointing at them; the admin edits
    -- one textarea split on blank lines. A table would be four endpoints for nothing.
    CREATE TABLE page_sections (
      id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      page_id    uuid NOT NULL REFERENCES static_pages (id) ON DELETE CASCADE,
      heading    text,
      body       jsonb NOT NULL DEFAULT '[]'::jsonb,
      position   integer NOT NULL DEFAULT 0,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (page_id, position)
    );

    CREATE TABLE faqs (
      id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      key          citext NOT NULL UNIQUE,
      question     text NOT NULL,
      answer       text NOT NULL,
      position     integer NOT NULL DEFAULT 0,
      is_published boolean NOT NULL DEFAULT true,
      created_at   timestamptz NOT NULL DEFAULT now(),
      updated_at   timestamptz NOT NULL DEFAULT now()
    );

    -- Relational rather than jsonb specifically so target_type='product' + target_id has
    -- referential integrity. megaMenu.data.js hardcodes 24 product URLs as strings today,
    -- so archiving a product leaves a dead link with nothing to detect it. Here the API
    -- resolves hrefs at read time and omits items whose target is gone.
    CREATE TABLE nav_items (
      id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      parent_id   uuid REFERENCES nav_items (id) ON DELETE CASCADE,
      kind        nav_kind NOT NULL,
      label       text NOT NULL,
      layout      nav_layout,
      target_type nav_target NOT NULL DEFAULT 'none',
      target_id   uuid,
      custom_href text,
      media_id    uuid REFERENCES media_assets (id) ON DELETE SET NULL,
      seed        text,
      highlight   boolean NOT NULL DEFAULT false,
      all_label   text,
      all_href    text,
      position    integer NOT NULL DEFAULT 0,
      is_active   boolean NOT NULL DEFAULT true,
      created_at  timestamptz NOT NULL DEFAULT now(),
      updated_at  timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX nav_items_parent_idx ON nav_items (parent_id, position);

    CREATE TABLE footer_link_groups (
      id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      title      text NOT NULL,
      position   integer NOT NULL DEFAULT 0,
      is_active  boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE footer_links (
      id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      group_id    uuid NOT NULL REFERENCES footer_link_groups (id) ON DELETE CASCADE,
      label       text NOT NULL,
      target_type nav_target NOT NULL DEFAULT 'custom',
      target_id   uuid,
      custom_href text,
      position    integer NOT NULL DEFAULT 0,
      created_at  timestamptz NOT NULL DEFAULT now(),
      updated_at  timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE announcements (
      id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      message         text NOT NULL,
      cta_label       text,
      cta_target_type nav_target NOT NULL DEFAULT 'none',
      cta_target_id   uuid,
      cta_custom_href text,
      position        integer NOT NULL DEFAULT 0,
      is_active       boolean NOT NULL DEFAULT true,
      starts_at       timestamptz,
      ends_at         timestamptz,
      created_at      timestamptz NOT NULL DEFAULT now(),
      updated_at      timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT announcement_window_ordered
        CHECK (starts_at IS NULL OR ends_at IS NULL OR ends_at > starts_at)
    );

    -- icon_key must name a key of config/socialIcons.jsx SOCIAL_ICONS. An unknown value
    -- currently renders undefined as a component and white-screens the header, so the
    -- admin picker offers only valid keys and GET /api/settings filters the rest out.
    -- A bad row degrades to a missing icon, never a crash.
    CREATE TABLE social_links (
      id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      label      text NOT NULL,
      icon_key   text NOT NULL,
      href       text NOT NULL,
      position   integer NOT NULL DEFAULT 0,
      is_active  boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE settings (
      key        text PRIMARY KEY,
      value      jsonb NOT NULL,
      "group"    text NOT NULL DEFAULT 'general',
      updated_by uuid REFERENCES admin_users (id) ON DELETE SET NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );

    -- The seed ledger. Every seeded row is recorded here with its insertion order, so
    -- unseed can walk it backwards - reversed insertion order is automatically
    -- foreign-key-safe - without an is_seed column polluting every domain table.
    CREATE TABLE seed_records (
      id          bigserial PRIMARY KEY,
      batch_id    uuid NOT NULL,
      table_name  text NOT NULL,
      record_id   text NOT NULL,
      media_key   text,
      inserted_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX seed_records_batch_idx ON seed_records (batch_id, id DESC);
  `)
}

export async function down({ context }) {
  await context.sequelize.query(`
    DROP TABLE IF EXISTS seed_records;
    DROP TABLE IF EXISTS settings;
    DROP TABLE IF EXISTS social_links;
    DROP TABLE IF EXISTS announcements;
    DROP TABLE IF EXISTS footer_links;
    DROP TABLE IF EXISTS footer_link_groups;
    DROP TABLE IF EXISTS nav_items;
    DROP TABLE IF EXISTS faqs;
    DROP TABLE IF EXISTS page_sections;
    DROP TABLE IF EXISTS static_pages;
    DROP TABLE IF EXISTS homepage_sections;
  `)
}
