#!/usr/bin/env node
// Wraps pg_dump rather than reinventing it: pg_dump understands the schema, indexes,
// sequences and constraints in a way a hand-rolled "SELECT * from every table" script
// never fully would, and it is what `restoreDb.js` is written to consume.
//
// Requires the postgresql-client package (`pg_dump` on PATH) - `apt install
// postgresql-client` on Debian/Ubuntu, `brew install postgresql` on macOS. Not every
// environment has it (this dev machine's Postgres was installed without its CLI tools
// on PATH), so a missing binary fails loudly here rather than being silently skipped.
//
//   npm run backup                    writes backups/pure_aura-<timestamp>.dump
//   npm run backup -- --out ./somewhere/file.dump

import { spawn } from 'node:child_process'
import { mkdir } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { databaseUrl } from '../src/config/env.js'
import { logger } from '../src/lib/logger.js'

const here = dirname(fileURLToPath(import.meta.url))
const defaultDir = resolve(here, '..', 'backups')

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-')
}

function run(command, args) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, { stdio: ['ignore', 'inherit', 'inherit'] })
    child.on('error', (error) => {
      if (error.code === 'ENOENT') {
        reject(
          new Error(
            `${command} was not found on PATH. Install the postgresql-client package ` +
              '(it ships pg_dump/psql/pg_restore) and try again.',
          ),
        )
        return
      }
      reject(error)
    })
    child.on('close', (code) => {
      if (code === 0) resolvePromise()
      else reject(new Error(`${command} exited with code ${code}`))
    })
  })
}

export async function backupDb({ outFile } = {}) {
  const target = outFile ?? join(defaultDir, `pure_aura-${timestamp()}.dump`)
  await mkdir(dirname(target), { recursive: true })

  // Custom format (-F c): compressed, and the only format pg_restore can selectively
  // restore from or parallelise - a plain .sql dump can only ever be replayed whole.
  await run('pg_dump', ['--format=custom', '--file', target, databaseUrl])

  logger.info({ target }, 'backup written')
  return target
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const outIndex = process.argv.indexOf('--out')
  const outFile = outIndex >= 0 ? process.argv[outIndex + 1] : undefined

  backupDb({ outFile }).catch((error) => {
    logger.error({ err: error }, 'backup failed')
    process.exitCode = 1
  })
}
