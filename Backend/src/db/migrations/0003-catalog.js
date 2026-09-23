// The catalogue, including real variants.
//
// Price and stock live on the VARIANT, not the product. A single-variant product is the
// normal case - one row, is_default true, no options - so the storefront's existing
// product-level `price` / `compareAtPrice` / `inStock` / `variantSummary` serialize from
// that default variant and nothing on the grid side has to change.
//
// `availability` is NOT a column. It is derived from stock at serialize time, because two
// sources of truth for stock is how you get a product that filters as in-stock and renders
// as out-of-stock.

export async function up({ context }) {
  const { sequelize } = context

  await sequelize.query(`
    CREATE TABLE categories (
      id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      handle      citext NOT NULL UNIQUE,
      title       text NOT NULL,
      description text,
      position    integer NOT NULL DEFAULT 0,
      media_id    uuid REFERENCES media_assets (id) ON DELETE SET NULL,
      created_at  timestamptz NOT NULL DEFAULT now(),
      updated_at  timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE collections (
      id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      handle            citext NOT NULL UNIQUE,
      title             text NOT NULL,
      description       text,
      card_label        text,
      media_id          uuid REFERENCES media_assets (id) ON DELETE SET NULL,
      position          integer NOT NULL DEFAULT 0,
      is_featured       boolean NOT NULL DEFAULT false,
      featured_position integer,
      is_active         boolean NOT NULL DEFAULT true,
      created_at        timestamptz NOT NULL DEFAULT now(),
      updated_at        timestamptz NOT NULL DEFAULT now(),
      deleted_at        timestamptz
    );

    CREATE INDEX collections_featured_idx
      ON collections (is_featured, featured_position)
      WHERE is_featured;

    CREATE TABLE products (
      id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      handle            citext NOT NULL UNIQUE,
      title             text NOT NULL,
      subtitle          text,
      description       text,
      vendor            text,
      badge             product_badge,
      cruelty_free      boolean NOT NULL DEFAULT true,
      -- 0 is a legitimate value meaning "no reviews yet", which two products in the
      -- catalogue already use. RatingStars renders Math.round(rating), so zero stars is
      -- a real state rather than missing data.
      rating            smallint CHECK (rating BETWEEN 0 AND 5),
      review_count      integer NOT NULL DEFAULT 0 CHECK (review_count >= 0),
      ingredient_note   text,
      stock_label       text,
      category_id       uuid REFERENCES categories (id) ON DELETE RESTRICT,
      primary_image_id  uuid REFERENCES media_assets (id) ON DELETE SET NULL,
      is_favorite       boolean NOT NULL DEFAULT false,
      is_upsell         boolean NOT NULL DEFAULT false,
      status            product_status NOT NULL DEFAULT 'draft',
      published_at      timestamptz,
      position          integer NOT NULL DEFAULT 0,
      seo_title         text,
      seo_description   text,
      created_at        timestamptz NOT NULL DEFAULT now(),
      updated_at        timestamptz NOT NULL DEFAULT now(),
      deleted_at        timestamptz
    );

    CREATE INDEX products_status_idx   ON products (status, published_at);
    CREATE INDEX products_category_idx ON products (category_id);
    CREATE INDEX products_favorite_idx ON products (id) WHERE is_favorite;
    CREATE INDEX products_upsell_idx   ON products (id) WHERE is_upsell;

    CREATE TABLE product_options (
      id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      product_id uuid NOT NULL REFERENCES products (id) ON DELETE CASCADE,
      name       text NOT NULL,
      position   integer NOT NULL DEFAULT 0,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (product_id, name)
    );

    CREATE TABLE product_option_values (
      id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      option_id  uuid NOT NULL REFERENCES product_options (id) ON DELETE CASCADE,
      value      text NOT NULL,
      position   integer NOT NULL DEFAULT 0,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (option_id, value)
    );

    CREATE TABLE product_variants (
      id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      product_id          uuid NOT NULL REFERENCES products (id) ON DELETE CASCADE,
      sku                 citext UNIQUE,
      label               text NOT NULL,
      price               integer NOT NULL CHECK (price >= 0),
      compare_at_price    integer CHECK (compare_at_price >= 0),
      stock_quantity      integer NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
      low_stock_threshold integer NOT NULL DEFAULT 5 CHECK (low_stock_threshold >= 0),
      media_id            uuid REFERENCES media_assets (id) ON DELETE SET NULL,
      position            integer NOT NULL DEFAULT 0,
      is_default          boolean NOT NULL DEFAULT false,
      is_active           boolean NOT NULL DEFAULT true,
      created_at          timestamptz NOT NULL DEFAULT now(),
      updated_at          timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT variant_compare_at_above_price
        CHECK (compare_at_price IS NULL OR compare_at_price >= price)
    );

    CREATE UNIQUE INDEX product_variants_one_default_idx
      ON product_variants (product_id) WHERE is_default;
    CREATE INDEX product_variants_product_idx ON product_variants (product_id, position);

    CREATE TABLE variant_option_values (
      variant_id      uuid NOT NULL REFERENCES product_variants (id) ON DELETE CASCADE,
      option_value_id uuid NOT NULL REFERENCES product_option_values (id) ON DELETE RESTRICT,
      PRIMARY KEY (variant_id, option_value_id)
    );

    CREATE TABLE product_images (
      id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      product_id uuid NOT NULL REFERENCES products (id) ON DELETE CASCADE,
      media_id   uuid NOT NULL REFERENCES media_assets (id) ON DELETE RESTRICT,
      position   integer NOT NULL DEFAULT 0,
      alt_text   text,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (product_id, position)
    );

    CREATE TABLE product_ingredients (
      id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      product_id uuid NOT NULL REFERENCES products (id) ON DELETE CASCADE,
      name       text NOT NULL,
      percent    smallint NOT NULL CHECK (percent BETWEEN 0 AND 100),
      position   integer NOT NULL DEFAULT 0,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (product_id, position)
    );

    CREATE TABLE collection_products (
      collection_id uuid NOT NULL REFERENCES collections (id) ON DELETE CASCADE,
      product_id    uuid NOT NULL REFERENCES products (id) ON DELETE CASCADE,
      position      integer NOT NULL DEFAULT 0,
      PRIMARY KEY (collection_id, product_id)
    );
    CREATE INDEX collection_products_product_idx ON collection_products (product_id);

    CREATE TABLE product_routine_products (
      product_id         uuid NOT NULL REFERENCES products (id) ON DELETE CASCADE,
      related_product_id uuid NOT NULL REFERENCES products (id) ON DELETE CASCADE,
      position           integer NOT NULL DEFAULT 0,
      PRIMARY KEY (product_id, related_product_id),
      CONSTRAINT routine_not_self CHECK (product_id <> related_product_id)
    );
  `)
}

export async function down({ context }) {
  await context.sequelize.query(`
    DROP TABLE IF EXISTS product_routine_products;
    DROP TABLE IF EXISTS collection_products;
    DROP TABLE IF EXISTS product_ingredients;
    DROP TABLE IF EXISTS product_images;
    DROP TABLE IF EXISTS variant_option_values;
    DROP TABLE IF EXISTS product_variants;
    DROP TABLE IF EXISTS product_option_values;
    DROP TABLE IF EXISTS product_options;
    DROP TABLE IF EXISTS products;
    DROP TABLE IF EXISTS collections;
    DROP TABLE IF EXISTS categories;
  `)
}
