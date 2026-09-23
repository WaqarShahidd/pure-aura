#!/usr/bin/env node
// Copies every stored media object to the S3 bucket named by the current environment.
// Run this AFTER setting STORAGE_DRIVER=s3 (and the S3_* vars) but this script always
// reads the SOURCE from local disk and writes to S3 - it is a one-way local-to-S3 copy,
// not a generic "sync whatever the active driver is" tool.
//
// Keys are identical on both sides and URLs are computed from MEDIA_PUBLIC_BASE_URL, so
// nothing in the database changes - see Backend/src/lib/storage/index.js. That is what
// makes this idempotent and safe to re-run: a key already on the far side is left alone.
//
//   npm run migrate:media
//   npm run migrate:media -- --dry-run

import { pathToFileURL } from 'node:url'
import { env } from '../src/config/env.js'
import { sequelize } from '../src/db/index.js'
import models from '../src/db/models/index.js'
import { createLocalDiskDriver } from '../src/lib/storage/localDisk.js'
import { createS3Driver } from '../src/lib/storage/s3.js'
import { logger } from '../src/lib/logger.js'

const { MediaAsset, MediaVariant } = models

function mimeFor(key) {
  if (key.endsWith('.webp')) return 'image/webp'
  if (key.endsWith('.png')) return 'image/png'
  if (key.endsWith('.jpg') || key.endsWith('.jpeg')) return 'image/jpeg'
  if (key.endsWith('.pdf')) return 'application/pdf'
  return 'application/octet-stream'
}

async function collectKeys() {
  const [assets, variants] = await Promise.all([
    MediaAsset.findAll({ attributes: ['key', 'mime', 'visibility'] }),
    // A variant's visibility isn't its own column - it inherits the parent asset's,
    // which is also exactly why its key was made to encode that (see the "private
    // thumbnails must not sit under a public prefix" fix in mediaService.js).
    MediaVariant.findAll({ attributes: ['key'] }),
  ])

  const originals = assets.map((row) => ({
    key: row.key,
    mime: row.mime,
    visibility: row.visibility,
  }))
  const derived = variants.map((row) => ({
    key: row.key,
    mime: 'image/webp',
    visibility: row.key.startsWith('private/') ? 'private' : 'public',
  }))

  return [...originals, ...derived]
}

async function migrateMedia({ dryRun = false } = {}) {
  if (env.STORAGE_DRIVER !== 's3') {
    throw new Error(
      'STORAGE_DRIVER is not "s3". Set it (and S3_BUCKET/S3_REGION/S3_ACCESS_KEY_ID/' +
        'S3_SECRET_ACCESS_KEY/MEDIA_PUBLIC_BASE_URL) before running this - it always ' +
        'copies FROM local disk TO the bucket the current environment names.',
    )
  }

  const local = createLocalDiskDriver()
  const s3 = createS3Driver()
  const keys = await collectKeys()

  const result = { total: keys.length, copied: 0, skipped: 0, failed: 0, missingLocally: 0 }

  for (const { key, mime, visibility } of keys) {
    try {
      if (await s3.exists(key)) {
        result.skipped++
        continue
      }

      if (!(await local.exists(key))) {
        result.missingLocally++
        logger.warn({ key }, 'referenced by a database row but not found on local disk - skipped')
        continue
      }

      if (dryRun) {
        result.copied++
        continue
      }

      const buffer = await local.get(key)
      await s3.put(key, buffer, { contentType: mime || mimeFor(key), visibility })

      if (!(await s3.exists(key))) {
        throw new Error('uploaded but a follow-up exists() check still says no')
      }

      result.copied++
    } catch (error) {
      result.failed++
      logger.error({ err: error, key }, 'failed to migrate this key')
    }
  }

  return result
}

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  const result = await migrateMedia({ dryRun })

  logger.info(result, dryRun ? 'dry run complete - nothing was written' : 'media migration complete')

  if (result.failed > 0 || result.missingLocally > 0) {
    process.exitCode = 1
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main()
    .catch((error) => {
      logger.error({ err: error }, 'media migration aborted')
      process.exitCode = 1
    })
    .finally(() => sequelize.close())
}

export { migrateMedia }
