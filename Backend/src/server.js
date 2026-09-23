import { createApp } from './app.js'
import { env } from './config/env.js'
import { assertDatabaseConnection, closeDatabase } from './db/index.js'
import { logger } from './lib/logger.js'
import { storage } from './lib/storage/index.js'

// Fail fast and loudly. A server that boots without a database just turns every request
// into a confusing 500 a few seconds later.
async function main() {
  await assertDatabaseConnection()

  const app = createApp()
  const server = app.listen(env.PORT, () => {
    logger.info(
      { port: env.PORT, env: env.NODE_ENV, storage: storage.name },
      `Pure Aura API listening on http://localhost:${env.PORT}`,
    )
  })

  // Without this, an in-flight request is cut off mid-transaction on every redeploy.
  const shutdown = (signal) => {
    logger.info({ signal }, 'shutting down')
    server.close(async () => {
      await closeDatabase()
      process.exit(0)
    })
    setTimeout(() => process.exit(1), 10_000).unref()
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))
}

main().catch((error) => {
  logger.error({ err: error }, 'failed to start')
  process.exit(1)
})
