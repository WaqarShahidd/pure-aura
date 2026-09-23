#!/usr/bin/env node
// Restores a dump produced by backupDb.js via pg_restore. Same PATH requirement as that
// script - both come from the postgresql-client package.
//
// pg_restore does not create the database itself, and --clean --if-exists drops existing
// objects inside it before recreating them, so this targets an EXISTING (possibly
// non-empty) database and overwrites its contents. There is no undo once it runs, so the
// script always asks for confirmation unless --yes is passed.
//
//   npm run restore -- --file backups/pure_aura-2026-09-23T10-00-00-000Z.dump
//   npm run restore -- --file ./that.dump --yes

import { createInterface } from 'node:readline/promises'
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { databaseUrl } from '../src/config/env.js'
import { logger } from '../src/lib/logger.js'

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

export async function restoreDb({ file, yes = false }) {
  if (!file) throw new Error('--file <path to a .dump produced by backupDb.js> is required')
  if (!existsSync(file)) throw new Error(`No such file: ${file}`)

  if (!yes) {
    const rl = createInterface({ input: process.stdin, output: process.stdout })
    const answer = await rl.question(
      `This will DROP and recreate every object currently in the target database before ` +
        `restoring ${file}. Type "yes" to continue: `,
    )
    rl.close()
    if (answer.trim().toLowerCase() !== 'yes') {
      logger.info('restore aborted - confirmation not given')
      return false
    }
  }

  await run('pg_restore', ['--clean', '--if-exists', '--no-owner', '--dbname', databaseUrl, file])

  logger.info({ file }, 'restore complete')
  return true
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const fileIndex = process.argv.indexOf('--file')
  const file = fileIndex >= 0 ? process.argv[fileIndex + 1] : undefined
  const yes = process.argv.includes('--yes')

  restoreDb({ file, yes }).catch((error) => {
    logger.error({ err: error }, 'restore failed')
    process.exitCode = 1
  })
}
