#!/usr/bin/env node
import { pathToFileURL } from 'node:url'
import { QueryTypes } from 'sequelize'
import { isProduction } from '../src/config/env.js'
import { sequelize } from '../src/db/index.js'
import { logger } from '../src/lib/logger.js'
import { storage } from '../src/lib/storage/index.js'
import { ORDER_NUMBER_START, BANK_REFERENCE_START } from '../src/lib/orderNumber.js'

// Reverses a seed batch exactly, using the ledger seed.js wrote.
//
// Walking the ledger backwards is what makes this foreign-key-safe for free: reversed
// insertion order is a valid deletion order by construction, so there is no dependency
// graph to maintain here and no is_seed column on any domain table.

// Composite-key rows are recorded as 'a:b' and need both halves to delete.
const COMPOSITE_KEYS = {
  collection_products: ['collection_id', 'product_id'],
  product_routine_products: ['product_id', 'related_product_id'],
  product_facet_values: ['product_id', 'facet_value_id'],
  variant_option_values: ['variant_id', 'option_value_id'],
  quiz_answer_values: ['answer_id', 'facet_value_id'],
}

// Tables keyed by something other than a uuid `id` column.
const TEXT_KEYS = {
  settings: 'key',
  feature_flags: 'key',
}

// Counts rows that are NOT part of this batch but point at rows that are. Deleting under
// them would either fail on a foreign key or silently orphan real data, so unseed stops
// and says so rather than guessing.
async function findRealDataReferencing(batchId, transaction) {
  const checks = [
    {
      label: 'orders containing a seeded product',
      sql: `SELECT count(*)::int AS count FROM order_items oi
            JOIN seed_records sr ON sr.table_name = 'products' AND sr.record_id = oi.product_id::text
            WHERE sr.batch_id = :batchId
              AND oi.order_id NOT IN (
                SELECT record_id::uuid FROM seed_records
                WHERE batch_id = :batchId AND table_name = 'orders')`,
    },
    {
      label: 'addresses belonging to a non-seeded customer',
      sql: `SELECT count(*)::int AS count FROM addresses a
            WHERE a.customer_id IN (
              SELECT record_id::uuid FROM seed_records
              WHERE batch_id = :batchId AND table_name = 'customers')
              AND a.id NOT IN (
                SELECT record_id::uuid FROM seed_records
                WHERE batch_id = :batchId AND table_name = 'addresses')`,
    },
    {
      label: 'images added to a seeded product after seeding',
      sql: `SELECT count(*)::int AS count FROM product_images pi
            WHERE pi.product_id IN (
              SELECT record_id::uuid FROM seed_records
              WHERE batch_id = :batchId AND table_name = 'products')
              AND pi.id NOT IN (
                SELECT record_id::uuid FROM seed_records
                WHERE batch_id = :batchId AND table_name = 'product_images')`,
    },
    {
      label: 'inventory movements against a seeded variant',
      sql: `SELECT count(*)::int AS count FROM inventory_moves im
            WHERE im.variant_id IN (
              SELECT record_id::uuid FROM seed_records
              WHERE batch_id = :batchId AND table_name = 'product_variants')`,
    },
  ]

  const blockers = []
  for (const check of checks) {
    const [row] = await sequelize.query(check.sql, {
      replacements: { batchId },
      type: QueryTypes.SELECT,
      transaction,
    })
    if (row.count > 0) blockers.push(`${row.count} ${check.label}`)
  }

  return blockers
}

async function unseed({ batchId = null, all = false, force = false } = {}) {
  if (isProduction && !force) {
    throw new Error('Refusing to unseed a production database without --force')
  }

  const t = await sequelize.transaction()

  try {
    // order_status_events is append-only, enforced by a trigger. Unseed is the one caller
    // allowed to opt out, and only for the length of this transaction. Without this, even
    // deleting the parent order fails, because the cascade reaches the history table.
    await sequelize.query(`SET LOCAL app.allow_history_delete = 'on'`, { transaction: t })

    let batches
    if (all) {
      batches = await sequelize.query(
        'SELECT DISTINCT batch_id FROM seed_records ORDER BY batch_id',
        { type: QueryTypes.SELECT, transaction: t },
      )
      batches = batches.map((row) => row.batch_id)
    } else if (batchId) {
      batches = [batchId]
    } else {
      const [latest] = await sequelize.query(
        'SELECT batch_id FROM seed_records ORDER BY id DESC LIMIT 1',
        { type: QueryTypes.SELECT, transaction: t },
      )
      if (!latest) {
        await t.rollback()
        logger.info('nothing to unseed - the ledger is empty')
        return { batches: 0, rows: 0, mediaDeleted: 0 }
      }
      batches = [latest.batch_id]
    }

    let totalRows = 0
    const mediaKeys = []

    for (const batch of batches) {
      const blockers = await findRealDataReferencing(batch, t)
      if (blockers.length > 0 && !force) {
        throw new Error(
          `Refusing to unseed batch ${batch} - real data depends on it:\n` +
            blockers.map((line) => `  - ${line}`).join('\n') +
            '\nRe-run with --force to delete anyway.',
        )
      }

      const rows = await sequelize.query(
        'SELECT id, table_name, record_id, media_key FROM seed_records WHERE batch_id = :batch ORDER BY id DESC',
        { replacements: { batch }, type: QueryTypes.SELECT, transaction: t },
      )

      // If a row was recorded more than once, it must be deleted at the position of its
      // EARLIEST insertion, because anything inserted after it may reference it. Since
      // this walk runs newest-first, that means acting on the LAST occurrence seen, so
      // the earliest ledger id per identity is computed up front.
      const earliestId = new Map()
      for (const row of rows) {
        const identity = `${row.table_name}:${row.record_id}`
        const current = earliestId.get(identity)
        if (current === undefined || Number(row.id) < current) {
          earliestId.set(identity, Number(row.id))
        }
      }

      for (const row of rows) {
        const identity = `${row.table_name}:${row.record_id}`
        if (earliestId.get(identity) !== Number(row.id)) continue

        if (row.media_key) mediaKeys.push(row.media_key)

        const composite = COMPOSITE_KEYS[row.table_name]
        if (composite) {
          const [left, right] = row.record_id.split(':')
          await sequelize.query(
            `DELETE FROM ${row.table_name} WHERE ${composite[0]} = :left AND ${composite[1]} = :right`,
            { replacements: { left, right }, transaction: t },
          )
        } else {
          const keyColumn = TEXT_KEYS[row.table_name] ?? 'id'
          await sequelize.query(
            `DELETE FROM ${row.table_name} WHERE ${keyColumn} = :id`,
            { replacements: { id: row.record_id }, transaction: t },
          )
        }

        totalRows += 1
      }

      await sequelize.query('DELETE FROM seed_records WHERE batch_id = :batch', {
        replacements: { batch },
        transaction: t,
      })
    }

    // Only rewind the sequences when the ledger is now empty; otherwise a second batch
    // would start handing out numbers that the first one already used.
    const [remaining] = await sequelize.query(
      'SELECT count(*)::int AS count FROM seed_records',
      { type: QueryTypes.SELECT, transaction: t },
    )
    if (remaining.count === 0) {
      await sequelize.query(
        `SELECT setval('order_number_seq', ${ORDER_NUMBER_START}, false),
                setval('bank_reference_seq', ${BANK_REFERENCE_START}, false)`,
        { transaction: t },
      )
    }

    await t.commit()

    // Storage is not transactional, so files are removed only after the rows are safely
    // gone. The other order risks deleting images for a transaction that then rolls back.
    let mediaDeleted = 0
    for (const key of mediaKeys) {
      try {
        await storage.delete(key)
        mediaDeleted += 1
      } catch (error) {
        logger.warn({ key, err: error.message }, 'could not delete media file')
      }
    }

    logger.info({ batches: batches.length, rows: totalRows, mediaDeleted }, 'unseed complete')
    return { batches: batches.length, rows: totalRows, mediaDeleted }
  } catch (error) {
    await t.rollback()
    throw error
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const batchArg = process.argv.find((arg) => arg.startsWith('--batch='))

  unseed({
    batchId: batchArg ? batchArg.split('=')[1] : null,
    all: process.argv.includes('--all'),
    force: process.argv.includes('--force'),
  })
    .then(async (result) => {
      console.log(
        `Removed ${result.rows} rows across ${result.batches} batch(es), ` +
          `${result.mediaDeleted} media files deleted`,
      )
      await sequelize.close()
      process.exit(0)
    })
    .catch(async (error) => {
      console.error(`\n${error.message}\n`)
      await sequelize.close()
      process.exit(1)
    })
}

export { unseed }
