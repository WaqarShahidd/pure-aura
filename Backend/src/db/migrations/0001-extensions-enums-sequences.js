// Foundations: extensions, every enum type, and the two sequences that generate
// human-facing reference numbers.

export async function up({ context }) {
  const { sequelize } = context

  await sequelize.query(`
    CREATE EXTENSION IF NOT EXISTS pgcrypto;
    CREATE EXTENSION IF NOT EXISTS citext;

    CREATE TYPE product_status AS ENUM ('draft', 'active', 'archived');
    CREATE TYPE product_badge AS ENUM ('BEST SELLER', 'SALE');
    CREATE TYPE facet_type AS ENUM ('list', 'swatch', 'range');
    CREATE TYPE facet_cardinality AS ENUM ('single', 'multi');
    CREATE TYPE sort_direction AS ENUM ('asc', 'desc');
    CREATE TYPE customer_status AS ENUM ('active', 'blocked');
    CREATE TYPE admin_role AS ENUM ('owner', 'manager', 'staff');
    CREATE TYPE subject_type AS ENUM ('customer', 'admin');

    CREATE TYPE order_status AS ENUM (
      'pending_payment', 'confirmed', 'processing', 'packed', 'handed_to_courier',
      'in_transit', 'out_for_delivery', 'delivered', 'failed_delivery',
      'returned_to_sender', 'cancelled', 'refunded'
    );
    CREATE TYPE payment_status AS ENUM (
      'unpaid', 'awaiting_verification', 'paid', 'partially_refunded', 'refunded', 'failed'
    );
    CREATE TYPE actor_type AS ENUM ('admin', 'customer', 'system');
    CREATE TYPE payment_method_kind AS ENUM ('offline', 'manual_transfer', 'gateway');
    CREATE TYPE payment_record_status AS ENUM (
      'pending', 'awaiting_verification', 'succeeded', 'failed', 'refunded'
    );
    CREATE TYPE inventory_reason AS ENUM (
      'order', 'cancel', 'restock', 'adjustment', 'hold_expiry'
    );
    CREATE TYPE discount_kind AS ENUM ('percent', 'fixed', 'free_shipping');
    CREATE TYPE discount_scope AS ENUM ('all', 'collection', 'product');
    CREATE TYPE page_kind AS ENUM ('policy', 'page');
    CREATE TYPE nav_kind AS ENUM ('root', 'group', 'column', 'link');
    CREATE TYPE nav_layout AS ENUM ('mega', 'flyout', 'list', 'link');
    CREATE TYPE nav_target AS ENUM ('collection', 'product', 'page', 'policy', 'custom', 'none');
    CREATE TYPE media_visibility AS ENUM ('public', 'private');
    CREATE TYPE media_variant_label AS ENUM ('thumb', 'md', 'lg');
  `)

  // 10248 is the number of the first mock order in the storefront's data/account.js,
  // so seeded history and anything placed later form one continuous run.
  await sequelize.query(`
    CREATE SEQUENCE order_number_seq START WITH 10248 INCREMENT BY 1;
    CREATE SEQUENCE bank_reference_seq START WITH 44712 INCREMENT BY 1;
  `)
}

export async function down({ context }) {
  const { sequelize } = context

  await sequelize.query(`
    DROP SEQUENCE IF EXISTS bank_reference_seq;
    DROP SEQUENCE IF EXISTS order_number_seq;

    DROP TYPE IF EXISTS media_variant_label;
    DROP TYPE IF EXISTS media_visibility;
    DROP TYPE IF EXISTS nav_target;
    DROP TYPE IF EXISTS nav_layout;
    DROP TYPE IF EXISTS nav_kind;
    DROP TYPE IF EXISTS page_kind;
    DROP TYPE IF EXISTS discount_scope;
    DROP TYPE IF EXISTS discount_kind;
    DROP TYPE IF EXISTS inventory_reason;
    DROP TYPE IF EXISTS payment_record_status;
    DROP TYPE IF EXISTS payment_method_kind;
    DROP TYPE IF EXISTS actor_type;
    DROP TYPE IF EXISTS payment_status;
    DROP TYPE IF EXISTS order_status;
    DROP TYPE IF EXISTS subject_type;
    DROP TYPE IF EXISTS admin_role;
    DROP TYPE IF EXISTS customer_status;
    DROP TYPE IF EXISTS sort_direction;
    DROP TYPE IF EXISTS facet_cardinality;
    DROP TYPE IF EXISTS facet_type;
    DROP TYPE IF EXISTS product_badge;
    DROP TYPE IF EXISTS product_status;
  `)
}
