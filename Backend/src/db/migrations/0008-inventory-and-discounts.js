// Real inventory and real discounts - both of which the storefront currently pretends to
// have.
//
// The cart's 10-minute countdown (ReservationBanner) holds nothing today: expiry does
// literally nothing. And CartActions accepts any string as a discount code, chips it,
// persists it to localStorage, and never applies it to a total. These tables make both
// true rather than decorative.

export async function up({ context }) {
  const { sequelize } = context

  await sequelize.query(`
    -- Available stock is stock_quantity minus the sum of live holds, so two people racing
    -- the last unit cannot both win. The sweep in inventoryService releases expired rows.
    CREATE TABLE inventory_holds (
      id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      cart_token  text NOT NULL,
      variant_id  uuid NOT NULL REFERENCES product_variants (id) ON DELETE CASCADE,
      quantity    integer NOT NULL CHECK (quantity > 0),
      expires_at  timestamptz NOT NULL,
      released_at timestamptz,
      order_id    uuid REFERENCES orders (id) ON DELETE SET NULL,
      created_at  timestamptz NOT NULL DEFAULT now(),
      updated_at  timestamptz NOT NULL DEFAULT now()
    );

    CREATE INDEX inventory_holds_cart_idx ON inventory_holds (cart_token);
    CREATE INDEX inventory_holds_live_idx
      ON inventory_holds (variant_id, expires_at) WHERE released_at IS NULL;

    -- An append-only ledger, so "where did those three units go" is always answerable and
    -- stock_quantity can be reconstructed from scratch if it ever drifts.
    CREATE TABLE inventory_moves (
      id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      variant_id    uuid NOT NULL REFERENCES product_variants (id) ON DELETE CASCADE,
      delta         integer NOT NULL,
      reason        inventory_reason NOT NULL,
      order_id      uuid REFERENCES orders (id) ON DELETE SET NULL,
      admin_user_id uuid REFERENCES admin_users (id) ON DELETE SET NULL,
      note          text,
      created_at    timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX inventory_moves_variant_idx ON inventory_moves (variant_id, created_at DESC);

    CREATE TABLE discount_codes (
      id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      code               citext NOT NULL UNIQUE,
      kind               discount_kind NOT NULL,
      value              integer NOT NULL DEFAULT 0 CHECK (value >= 0),
      min_subtotal       integer NOT NULL DEFAULT 0 CHECK (min_subtotal >= 0),
      max_uses           integer CHECK (max_uses IS NULL OR max_uses > 0),
      used_count         integer NOT NULL DEFAULT 0 CHECK (used_count >= 0),
      per_customer_limit integer CHECK (per_customer_limit IS NULL OR per_customer_limit > 0),
      applies_to         discount_scope NOT NULL DEFAULT 'all',
      target_id          uuid,
      starts_at          timestamptz,
      ends_at            timestamptz,
      is_active          boolean NOT NULL DEFAULT true,
      created_at         timestamptz NOT NULL DEFAULT now(),
      updated_at         timestamptz NOT NULL DEFAULT now(),

      -- A percentage above 100 is always a typo, and it would produce a negative total
      -- that the orders CHECK constraint would then reject far from the cause.
      CONSTRAINT discount_percent_within_range
        CHECK (kind <> 'percent' OR value BETWEEN 0 AND 100),

      CONSTRAINT discount_window_ordered
        CHECK (starts_at IS NULL OR ends_at IS NULL OR ends_at > starts_at)
    );

    CREATE TABLE discount_redemptions (
      id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      discount_id uuid NOT NULL REFERENCES discount_codes (id) ON DELETE CASCADE,
      order_id    uuid NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
      customer_id uuid REFERENCES customers (id) ON DELETE SET NULL,
      amount      integer NOT NULL CHECK (amount >= 0),
      created_at  timestamptz NOT NULL DEFAULT now(),
      UNIQUE (discount_id, order_id)
    );
    CREATE INDEX discount_redemptions_customer_idx
      ON discount_redemptions (discount_id, customer_id);
  `)

  await sequelize.query(`
    ALTER TABLE orders
      ADD COLUMN discount_id uuid REFERENCES discount_codes (id) ON DELETE SET NULL,
      ADD COLUMN discount_code text;
  `)
}

export async function down({ context }) {
  await context.sequelize.query(`
    ALTER TABLE orders
      DROP COLUMN IF EXISTS discount_code,
      DROP COLUMN IF EXISTS discount_id;

    DROP TABLE IF EXISTS discount_redemptions;
    DROP TABLE IF EXISTS discount_codes;
    DROP TABLE IF EXISTS inventory_moves;
    DROP TABLE IF EXISTS inventory_holds;
  `)
}
