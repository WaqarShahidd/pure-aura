// Media comes before the catalogue because products, collections and nav items all
// point at it. Keys are stored, URLs are not - the URL is computed from
// MEDIA_PUBLIC_BASE_URL at serialize time, which is what makes the S3 switch free.

export async function up({ context }) {
  const { sequelize } = context

  await sequelize.query(`
    CREATE TABLE media_assets (
      id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      key               text NOT NULL UNIQUE,
      original_filename text,
      mime              text NOT NULL,
      bytes             integer NOT NULL CHECK (bytes >= 0),
      width             integer,
      height            integer,
      alt_text          text,
      checksum_sha256   char(64),
      folder            text NOT NULL DEFAULT 'general',
      visibility        media_visibility NOT NULL DEFAULT 'public',
      created_by        uuid,
      created_at        timestamptz NOT NULL DEFAULT now(),
      updated_at        timestamptz NOT NULL DEFAULT now()
    );

    CREATE INDEX media_assets_checksum_idx ON media_assets (checksum_sha256);
    CREATE INDEX media_assets_folder_idx   ON media_assets (folder);

    CREATE TABLE media_variants (
      id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      media_id   uuid NOT NULL REFERENCES media_assets (id) ON DELETE CASCADE,
      label      media_variant_label NOT NULL,
      key        text NOT NULL UNIQUE,
      width      integer NOT NULL,
      height     integer NOT NULL,
      bytes      integer NOT NULL CHECK (bytes >= 0),
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (media_id, label)
    );
  `)
}

export async function down({ context }) {
  await context.sequelize.query(`
    DROP TABLE IF EXISTS media_variants;
    DROP TABLE IF EXISTS media_assets;
  `)
}
