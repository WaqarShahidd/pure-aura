#!/usr/bin/env node
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { SequelizeStorage, Umzug } from 'umzug'
import { sequelize } from '../src/db/index.js'
import { logger } from '../src/lib/logger.js'

const here = dirname(fileURLToPath(import.meta.url))

export const umzug = new Umzug({
  migrations: {
    glob: ['../src/db/migrations/*.js', { cwd: here }],
    resolve: ({ name, path, context }) => ({
      name,
      up: async () => (await import(`file://${path}`)).up({ context }),
      down: async () => (await import(`file://${path}`)).down({ context }),
    }),
  },
  context: sequelize.getQueryInterface(),
  storage: new SequelizeStorage({ sequelize, tableName: 'schema_migrations' }),
  logger: {
    info: (message) => logger.info(message),
    warn: (message) => logger.warn(message),
    error: (message) => logger.error(message),
    debug: (message) => logger.debug(message),
  },
})

async function main() {
  const command = process.argv[2] ?? 'up'

  if (command === 'up') await umzug.up()
  else if (command === 'down') await umzug.down()
  else if (command === 'down:all') await umzug.down({ to: 0 })
  else if (command === 'status') {
    const executed = await umzug.executed()
    const pending = await umzug.pending()
    console.log(`executed (${executed.length}):`)
    executed.forEach((m) => console.log(`  ${m.name}`))
    console.log(`pending (${pending.length}):`)
    pending.forEach((m) => console.log(`  ${m.name}`))
  } else {
    console.error(`Unknown command: ${command}. Use up | down | down:all | status`)
    process.exitCode = 1
  }

  await sequelize.close()
}

// Only run when invoked directly, so the test harness can import `umzug` and drive
// migrations itself without the process exiting underneath it. pathToFileURL handles
// the Windows drive-letter and backslash conversion that a hand-rolled compare misses.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    logger.error({ err: error }, 'migration failed')
    process.exit(1)
  })
}
