// Orders, line items, the append-only status history, and payments.
//
// This table is the superset that reconciles two incompatible shapes in the storefront:
// Checkout.jsx produces {orderId, email, total, delivery} with 8% tax and throws it away,
// while data/account.js carries {id, placedOn, status, trackingNumber, shippingAddressId,
// paymentLabel, shipping, items} with no tax at all. Totals are snapshotted at write time
// and never recomputed, and the CHECK constraint below means there is exactly one
// arithmetic for an order total, enforced by the database rather than by convention.

export async function up({ context }) {
  const { sequelize } = context

  await sequelize.query(`
    CREATE TABLE orders (
      id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      number               text NOT NULL UNIQUE,
      customer_id          uuid REFERENCES customers (id) ON DELETE SET NULL,
      guest_email          citext,
      access_token_hash    text,
      status               order_status NOT NULL DEFAULT 'pending_payment',
      payment_status       payment_status NOT NULL DEFAULT 'unpaid',
      currency             char(3) NOT NULL DEFAULT 'PKR',

      subtotal_amount      integer NOT NULL CHECK (subtotal_amount >= 0),
      discount_amount      integer NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
      shipping_amount      integer NOT NULL DEFAULT 0 CHECK (shipping_amount >= 0),
      tax_rate_bp          integer NOT NULL DEFAULT 0 CHECK (tax_rate_bp >= 0),
      tax_amount           integer NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
      tax_inclusive        boolean NOT NULL DEFAULT true,
      total_amount         integer NOT NULL CHECK (total_amount >= 0),

      delivery_method_id   uuid REFERENCES delivery_methods (id) ON DELETE SET NULL,
      delivery_method_label text,
      payment_method_id    uuid REFERENCES payment_methods (id) ON DELETE SET NULL,
      payment_method_label text,

      contact_email        citext NOT NULL,
      contact_phone        text,
      marketing_opt_in     boolean NOT NULL DEFAULT false,

      ship_name            text NOT NULL,
      ship_line1           text NOT NULL,
      ship_line2           text,
      ship_city            text NOT NULL,
      ship_region          text,
      ship_postcode        text,
      ship_country         text NOT NULL,
      ship_phone           text,

      billing_same         boolean NOT NULL DEFAULT true,
      bill_name            text,
      bill_line1           text,
      bill_line2           text,
      bill_city            text,
      bill_region          text,
      bill_postcode        text,
      bill_country         text,
      bill_phone           text,

      courier_id           uuid REFERENCES couriers (id) ON DELETE SET NULL,
      tracking_number      text,
      tracking_url         text,

      customer_note        text,
      admin_note           text,

      placed_at            timestamptz NOT NULL DEFAULT now(),
      confirmed_at         timestamptz,
      handed_to_courier_at timestamptz,
      delivered_at         timestamptz,
      cancelled_at         timestamptz,
      cancel_reason        text,
      created_at           timestamptz NOT NULL DEFAULT now(),
      updated_at           timestamptz NOT NULL DEFAULT now(),

      -- An order belongs to someone: either a registered customer or a guest email.
      CONSTRAINT order_has_an_owner
        CHECK (customer_id IS NOT NULL OR guest_email IS NOT NULL),

      -- Tax is INCLUDED in the listed prices, so it is never added to the total. This is
      -- the single arithmetic, and it is why the Rs 14 express bug cannot recur silently.
      CONSTRAINT order_total_is_consistent
        CHECK (total_amount = subtotal_amount - discount_amount + shipping_amount),

      CONSTRAINT order_discount_within_subtotal
        CHECK (discount_amount <= subtotal_amount)
    );

    CREATE INDEX orders_customer_idx       ON orders (customer_id, placed_at DESC);
    CREATE INDEX orders_status_idx         ON orders (status);
    CREATE INDEX orders_payment_status_idx ON orders (payment_status);
    CREATE INDEX orders_placed_idx         ON orders (placed_at DESC);
    CREATE INDEX orders_tracking_idx       ON orders (tracking_number);

    -- Everything here is a snapshot taken at purchase time. That is what lets
    -- OrderDetail.jsx drop its getProductByHandle() lookup entirely: the line describes
    -- itself, so archiving a product never breaks order history, and ON DELETE SET NULL
    -- means deleting one never destroys it either.
    CREATE TABLE order_items (
      id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      order_id         uuid NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
      product_id       uuid REFERENCES products (id) ON DELETE SET NULL,
      variant_id       uuid REFERENCES product_variants (id) ON DELETE SET NULL,
      handle           text NOT NULL,
      title            text NOT NULL,
      variant_label    text,
      sku              text,
      image_url        text,
      unit_price       integer NOT NULL CHECK (unit_price >= 0),
      compare_at_price integer CHECK (compare_at_price >= 0),
      quantity         integer NOT NULL CHECK (quantity > 0),
      line_total       integer NOT NULL CHECK (line_total >= 0),
      gift_wrap        boolean NOT NULL DEFAULT false,
      gift_card        boolean NOT NULL DEFAULT false,
      gift_message     text,
      position         integer NOT NULL DEFAULT 0,
      created_at       timestamptz NOT NULL DEFAULT now(),
      updated_at       timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX order_items_order_idx   ON order_items (order_id);
    CREATE INDEX order_items_product_idx ON order_items (product_id);

    CREATE TABLE order_status_events (
      id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      order_id    uuid NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
      from_status order_status,
      to_status   order_status NOT NULL,
      actor_type  actor_type NOT NULL,
      actor_id    uuid,
      note        text,
      metadata    jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_at  timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX order_status_events_order_idx ON order_status_events (order_id, created_at);

    CREATE TABLE payments (
      id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      order_id              uuid NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
      payment_method_id     uuid NOT NULL REFERENCES payment_methods (id) ON DELETE RESTRICT,
      kind                  payment_method_kind NOT NULL,
      amount                integer NOT NULL CHECK (amount >= 0),
      status                payment_record_status NOT NULL DEFAULT 'pending',
      reference_code        text UNIQUE,
      proof_media_id        uuid REFERENCES media_assets (id) ON DELETE SET NULL,
      bank_account_snapshot jsonb,
      gateway_ref           text,
      verified_by_admin_id  uuid REFERENCES admin_users (id) ON DELETE SET NULL,
      verified_at           timestamptz,
      failure_reason        text,
      created_at            timestamptz NOT NULL DEFAULT now(),
      updated_at            timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX payments_order_idx ON payments (order_id);
  `)

  // order_status_events is append-only, enforced by a trigger rather than by REVOKE.
  // REVOKE looks tidier but does nothing when the app connects as the table owner or as
  // a superuser, which is exactly how most local and small-team deploys are configured -
  // so it would be append-only in theory and mutable in practice. A trigger holds for
  // everyone, including postgres itself.
  //
  // UPDATE is blocked unconditionally: there is no legitimate reason to edit history.
  // DELETE is blocked unless a caller opts in for the current transaction.
  //
  // Note what this means in practice, because it is wider than it first looks: an order
  // can no longer be hard-deleted at all without the flag, since `ON DELETE CASCADE` from
  // orders reaches this table and trips the trigger. That is the intended behaviour -
  // orders are cancelled or refunded, never erased - but any code that genuinely needs to
  // remove one must opt in:
  //
  //   BEGIN; SET LOCAL app.allow_history_delete = 'on'; DELETE FROM orders ...; COMMIT;
  //
  // Only scripts/unseed.js does this. Request-handling code never should.
  await sequelize.query(`
    CREATE FUNCTION order_status_events_are_append_only() RETURNS trigger AS $$
    BEGIN
      IF TG_OP = 'DELETE'
         AND current_setting('app.allow_history_delete', true) = 'on' THEN
        RETURN OLD;
      END IF;

      RAISE EXCEPTION 'order_status_events is append-only (attempted %)', TG_OP
        USING HINT = 'Record a new event instead of editing history.';
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER order_status_events_no_update
      BEFORE UPDATE ON order_status_events
      FOR EACH ROW EXECUTE FUNCTION order_status_events_are_append_only();

    CREATE TRIGGER order_status_events_no_delete
      BEFORE DELETE ON order_status_events
      FOR EACH ROW EXECUTE FUNCTION order_status_events_are_append_only();
  `)
}

export async function down({ context }) {
  await context.sequelize.query(`
    DROP TRIGGER IF EXISTS order_status_events_no_delete ON order_status_events;
    DROP TRIGGER IF EXISTS order_status_events_no_update ON order_status_events;
    DROP FUNCTION IF EXISTS order_status_events_are_append_only();
    DROP TABLE IF EXISTS payments;
    DROP TABLE IF EXISTS order_status_events;
    DROP TABLE IF EXISTS order_items;
    DROP TABLE IF EXISTS orders;
  `)
}
