// Managed facet vocabularies, and the quiz that shares them.
//
// Customer/src/config/filters.js and components/Page/Quiz/Quiz.jsx both reference the same
// product fields and the same literal facet values today. If an admin could edit those as
// free text, the quiz would silently start scoring zero against every product - a failure
// with no error and no visible symptom beyond bad recommendations.
//
// The ON DELETE RESTRICT from quiz_answer_values to facet_values is the fix. A value the
// quiz depends on cannot be deleted; the API returns 409 naming the question instead.
//
// One trap worth naming, because it is genuinely easy to get wrong: there are TWO
// ingredient vocabularies. The facet `ingredientFilter` uses 'Aloe Vera', while the
// composition list `ingredients[].name` uses 'Aloe Vera Extract'. The quiz scores against
// the facet. Wiring an answer to the composition spelling would match nothing.

export async function up({ context }) {
  const { sequelize } = context

  await sequelize.query(`
    CREATE TABLE facets (
      id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      key          citext NOT NULL UNIQUE,
      label        text NOT NULL,
      field_key    text NOT NULL,
      type         facet_type NOT NULL DEFAULT 'list',
      swatch_field text,
      cardinality  facet_cardinality NOT NULL DEFAULT 'single',
      position     integer NOT NULL DEFAULT 0,
      is_active    boolean NOT NULL DEFAULT true,
      is_system    boolean NOT NULL DEFAULT false,
      created_at   timestamptz NOT NULL DEFAULT now(),
      updated_at   timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE facet_values (
      id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      facet_id   uuid NOT NULL REFERENCES facets (id) ON DELETE CASCADE,
      value      text NOT NULL,
      label      text NOT NULL,
      swatch_hex char(7),
      position   integer NOT NULL DEFAULT 0,
      is_active  boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (facet_id, value)
    );

    -- facet_id is denormalised here so cardinality can be checked and facet counts
    -- grouped without a second join on every filter query.
    CREATE TABLE product_facet_values (
      product_id     uuid NOT NULL REFERENCES products (id) ON DELETE CASCADE,
      facet_value_id uuid NOT NULL REFERENCES facet_values (id) ON DELETE RESTRICT,
      facet_id       uuid NOT NULL REFERENCES facets (id) ON DELETE CASCADE,
      PRIMARY KEY (product_id, facet_value_id)
    );
    CREATE INDEX product_facet_values_value_idx ON product_facet_values (facet_value_id);
    CREATE INDEX product_facet_values_facet_idx ON product_facet_values (product_id, facet_id);

    -- max_amount NULL means unbounded. The storefront currently writes max: Infinity,
    -- which JSON.stringify turns into null anyway - so this is the honest spelling of
    -- what already happens, and it stops being a bug the moment ranges come from an API.
    CREATE TABLE price_ranges (
      id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      key        citext NOT NULL UNIQUE,
      label      text NOT NULL,
      min_amount integer NOT NULL DEFAULT 0 CHECK (min_amount >= 0),
      max_amount integer CHECK (max_amount IS NULL OR max_amount > min_amount),
      position   integer NOT NULL DEFAULT 0,
      is_active  boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );

    -- SORT_OPTIONS currently holds live compare() functions, which cannot be serialized.
    -- Storing {field, direction} lets an admin add "Newest first" without a code change,
    -- while making it impossible to invent a field that has no column behind it.
    CREATE TABLE sort_options (
      id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      key        citext NOT NULL UNIQUE,
      label      text NOT NULL,
      field      text NOT NULL,
      direction  sort_direction NOT NULL DEFAULT 'asc',
      position   integer NOT NULL DEFAULT 0,
      is_default boolean NOT NULL DEFAULT false,
      is_active  boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE UNIQUE INDEX sort_options_one_default_idx ON sort_options (is_default) WHERE is_default;

    CREATE TABLE quiz_questions (
      id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      key        citext NOT NULL UNIQUE,
      prompt     text NOT NULL,
      facet_id   uuid NOT NULL REFERENCES facets (id) ON DELETE RESTRICT,
      position   integer NOT NULL DEFAULT 0,
      is_active  boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE quiz_answers (
      id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      question_id uuid NOT NULL REFERENCES quiz_questions (id) ON DELETE CASCADE,
      label       text NOT NULL,
      position    integer NOT NULL DEFAULT 0,
      created_at  timestamptz NOT NULL DEFAULT now(),
      updated_at  timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE quiz_answer_values (
      answer_id      uuid NOT NULL REFERENCES quiz_answers (id) ON DELETE CASCADE,
      facet_value_id uuid NOT NULL REFERENCES facet_values (id) ON DELETE RESTRICT,
      PRIMARY KEY (answer_id, facet_value_id)
    );
  `)
}

export async function down({ context }) {
  await context.sequelize.query(`
    DROP TABLE IF EXISTS quiz_answer_values;
    DROP TABLE IF EXISTS quiz_answers;
    DROP TABLE IF EXISTS quiz_questions;
    DROP TABLE IF EXISTS sort_options;
    DROP TABLE IF EXISTS price_ranges;
    DROP TABLE IF EXISTS product_facet_values;
    DROP TABLE IF EXISTS facet_values;
    DROP TABLE IF EXISTS facets;
  `)
}
