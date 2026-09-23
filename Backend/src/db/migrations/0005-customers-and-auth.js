// Customers, addresses, admin users, and the token tables behind both.
//
// admin_users is a SEPARATE table rather than a role column on customers. They have
// different lifecycles, different password policies and different token audiences;
// merging them is how privilege-escalation bugs happen. The two JWT secrets in env.js
// are the other half of that separation.

export async function up({ context }) {
  const { sequelize } = context

  await sequelize.query(`
    CREATE TABLE customers (
      id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      email             citext NOT NULL UNIQUE,
      password_hash     text,
      first_name        text,
      last_name         text,
      phone             text,
      birthday          date,
      marketing_opt_in  boolean NOT NULL DEFAULT false,
      sms_opt_in        boolean NOT NULL DEFAULT false,
      reward_points     integer NOT NULL DEFAULT 0 CHECK (reward_points >= 0),
      email_verified_at timestamptz,
      last_login_at     timestamptz,
      status            customer_status NOT NULL DEFAULT 'active',
      created_at        timestamptz NOT NULL DEFAULT now(),
      updated_at        timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE addresses (
      id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      customer_id uuid NOT NULL REFERENCES customers (id) ON DELETE CASCADE,
      label       text,
      is_default  boolean NOT NULL DEFAULT false,
      name        text NOT NULL,
      line1       text NOT NULL,
      line2       text,
      city        text NOT NULL,
      region      text,
      postcode    text,
      country     text NOT NULL,
      phone       text,
      created_at  timestamptz NOT NULL DEFAULT now(),
      updated_at  timestamptz NOT NULL DEFAULT now()
    );

    -- At most one default address per customer, enforced rather than hoped for.
    CREATE UNIQUE INDEX addresses_one_default_idx
      ON addresses (customer_id) WHERE is_default;
    CREATE INDEX addresses_customer_idx ON addresses (customer_id);

    CREATE TABLE admin_users (
      id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      email         citext NOT NULL UNIQUE,
      password_hash text NOT NULL,
      name          text NOT NULL,
      role          admin_role NOT NULL DEFAULT 'staff',
      is_active     boolean NOT NULL DEFAULT true,
      last_login_at timestamptz,
      created_at    timestamptz NOT NULL DEFAULT now(),
      updated_at    timestamptz NOT NULL DEFAULT now()
    );

    -- Refresh tokens are rotated on every use. Presenting an already-revoked token means
    -- either a replay or a stolen cookie, so the whole family gets revoked - which is what
    -- replaced_by_id exists to let us walk.
    CREATE TABLE refresh_tokens (
      id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      subject_type   subject_type NOT NULL,
      subject_id     uuid NOT NULL,
      token_hash     text NOT NULL UNIQUE,
      expires_at     timestamptz NOT NULL,
      revoked_at     timestamptz,
      replaced_by_id uuid REFERENCES refresh_tokens (id) ON DELETE SET NULL,
      user_agent     text,
      ip             inet,
      created_at     timestamptz NOT NULL DEFAULT now(),
      updated_at     timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX refresh_tokens_subject_idx ON refresh_tokens (subject_type, subject_id);
    CREATE INDEX refresh_tokens_expiry_idx  ON refresh_tokens (expires_at);

    CREATE TABLE password_resets (
      id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      subject_type subject_type NOT NULL,
      subject_id   uuid NOT NULL,
      token_hash   text NOT NULL UNIQUE,
      expires_at   timestamptz NOT NULL,
      used_at      timestamptz,
      created_at   timestamptz NOT NULL DEFAULT now(),
      updated_at   timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE audit_log (
      id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      admin_user_id uuid REFERENCES admin_users (id) ON DELETE SET NULL,
      action        text NOT NULL,
      entity_type   text NOT NULL,
      entity_id     text,
      before        jsonb,
      after         jsonb,
      ip            inet,
      created_at    timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX audit_log_entity_idx  ON audit_log (entity_type, entity_id);
    CREATE INDEX audit_log_created_idx ON audit_log (created_at DESC);
  `)
}

export async function down({ context }) {
  await context.sequelize.query(`
    DROP TABLE IF EXISTS audit_log;
    DROP TABLE IF EXISTS password_resets;
    DROP TABLE IF EXISTS refresh_tokens;
    DROP TABLE IF EXISTS admin_users;
    DROP TABLE IF EXISTS addresses;
    DROP TABLE IF EXISTS customers;
  `)
}
