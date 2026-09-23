// Couriers, delivery methods, tax rates, payment methods and feature flags.
// These are all referenced by orders, so they land first.

export async function up({ context }) {
  const { sequelize } = context

  await sequelize.query(`
    CREATE TABLE couriers (
      id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name                  text NOT NULL,
      code                  citext NOT NULL UNIQUE,
      tracking_url_template text,
      phone                 text,
      is_active             boolean NOT NULL DEFAULT true,
      position              integer NOT NULL DEFAULT 0,
      created_at            timestamptz NOT NULL DEFAULT now(),
      updated_at            timestamptz NOT NULL DEFAULT now()
    );

    -- price_amount is an integer number of rupees with a CHECK, which makes the current
    -- express value of 14.0 literally unrepresentable. That figure is an unconverted USD
    -- amount in config/checkout.js and renders as "Rs 14", cheaper than standard's 1700.
    CREATE TABLE delivery_methods (
      id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      code             citext NOT NULL UNIQUE,
      label            text NOT NULL,
      detail           text,
      price_amount     integer NOT NULL CHECK (price_amount >= 0),
      free_over_amount integer CHECK (free_over_amount IS NULL OR free_over_amount >= 0),
      is_pickup        boolean NOT NULL DEFAULT false,
      eta_min_days     smallint,
      eta_max_days     smallint,
      is_enabled       boolean NOT NULL DEFAULT true,
      position         integer NOT NULL DEFAULT 0,
      created_at       timestamptz NOT NULL DEFAULT now(),
      updated_at       timestamptz NOT NULL DEFAULT now()
    );

    -- Rates are basis points (1800 = 18%) so no float touches a total. is_inclusive is
    -- true for this shop: listed prices already contain the tax, and checkout shows the
    -- contained portion rather than adding anything on.
    CREATE TABLE tax_rates (
      id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      country      text NOT NULL,
      rate_bp      integer NOT NULL DEFAULT 0 CHECK (rate_bp >= 0 AND rate_bp < 10000),
      is_inclusive boolean NOT NULL DEFAULT true,
      is_default   boolean NOT NULL DEFAULT false,
      is_active    boolean NOT NULL DEFAULT true,
      created_at   timestamptz NOT NULL DEFAULT now(),
      updated_at   timestamptz NOT NULL DEFAULT now(),
      UNIQUE (country)
    );
    CREATE UNIQUE INDEX tax_rates_one_default_idx ON tax_rates (is_default) WHERE is_default;

    -- is_deletable is false on every seeded row, so the admin API refuses DELETE on all
    -- five. Card/PayPal/Stripe are disabled, never removed - re-enabling one later is a
    -- flag flip plus credentials, not a schema change.
    CREATE TABLE payment_methods (
      id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      code              citext NOT NULL UNIQUE,
      label             text NOT NULL,
      kind              payment_method_kind NOT NULL,
      is_enabled        boolean NOT NULL DEFAULT false,
      requires_proof    boolean NOT NULL DEFAULT false,
      instructions      text,
      icon_key          text,
      surcharge_amount  integer NOT NULL DEFAULT 0 CHECK (surcharge_amount >= 0),
      feature_flag_key  text,
      config            jsonb NOT NULL DEFAULT '{}'::jsonb,
      position          integer NOT NULL DEFAULT 0,
      is_deletable      boolean NOT NULL DEFAULT false,
      created_at        timestamptz NOT NULL DEFAULT now(),
      updated_at        timestamptz NOT NULL DEFAULT now()
    );

    -- The second half of the two-key gate. is_enabled is the merchant switch in the admin
    -- UI; the flag is the engineering switch that needs a deploy with real credentials.
    -- A gateway is offered to customers only when BOTH are on, so nobody can flip "Card"
    -- on in the admin and land customers on a form with no processor behind it.
    CREATE TABLE feature_flags (
      key         text PRIMARY KEY,
      label       text NOT NULL,
      description text,
      is_enabled  boolean NOT NULL DEFAULT false,
      updated_by  uuid REFERENCES admin_users (id) ON DELETE SET NULL,
      created_at  timestamptz NOT NULL DEFAULT now(),
      updated_at  timestamptz NOT NULL DEFAULT now()
    );
  `)
}

export async function down({ context }) {
  await context.sequelize.query(`
    DROP TABLE IF EXISTS feature_flags;
    DROP TABLE IF EXISTS payment_methods;
    DROP TABLE IF EXISTS tax_rates;
    DROP TABLE IF EXISTS delivery_methods;
    DROP TABLE IF EXISTS couriers;
  `)
}
