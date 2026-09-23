// Runs once before the suite. Brings pure_aura_test to a known state: schema rebuilt from
// migrations, then seeded with the same data the dev database gets.
//
// The test database is a SEPARATE database, not a schema or a prefix, and NODE_ENV=test
// is what selects it in config/env.js. That separation is deliberate: this file drops
// every table, and pointing it at a developer's working data by accident would be
// expensive in a way no amount of care afterwards can undo.

process.env.NODE_ENV = 'test'

export async function setup() {
  const { databaseUrl } = await import('../src/config/env.js')

  if (!/pure_aura_test/.test(databaseUrl)) {
    throw new Error(
      `Refusing to run tests against ${databaseUrl} - DATABASE_URL_TEST must name a test database`,
    )
  }

  const { umzug } = await import('../scripts/migrate.js')
  const { sequelize } = await import('../src/db/index.js')

  // Down-to-zero then up, rather than assuming the last run left things tidy. A failed
  // suite that aborted mid-transaction should not poison the next one.
  await umzug.down({ to: 0 })
  await umzug.up()

  const { seed } = await import('../scripts/seed.js')
  await seed()

  await sequelize.close()
}

export async function teardown() {
  // Deliberately leaves the data in place: a failing assertion is much easier to chase
  // when the rows that produced it are still there to query.
}
