import { Sequelize } from 'sequelize'
import { databaseUrl, isProduction, isTest } from '../config/env.js'
import { logger } from '../lib/logger.js'

// underscored: true everywhere, so models read as camelCase in JS and the schema stays
// snake_case in SQL. timestamps are on by default; the few join tables that do not want
// them opt out individually.
export const sequelize = new Sequelize(databaseUrl, {
  dialect: 'postgres',
  logging: isTest ? false : (sql, ms) => logger.debug({ ms }, sql),
  benchmark: true,
  define: {
    underscored: true,
    freezeTableName: true,
  },
  pool: {
    max: isProduction ? 20 : 5,
    min: 0,
    idle: 10_000,
    acquire: 30_000,
  },
})

export async function assertDatabaseConnection() {
  await sequelize.authenticate()
}

// Deliberately never sequelize.sync(), not even in development. The seed and unseed
// scripts depend on a schema that only ever changes through a reviewed migration with
// a working `down` - sync() would silently drift the two apart.
export async function closeDatabase() {
  await sequelize.close()
}
