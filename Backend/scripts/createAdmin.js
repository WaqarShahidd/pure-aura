#!/usr/bin/env node
import { randomBytes } from 'node:crypto'
import { pathToFileURL } from 'node:url'
import { sequelize } from '../src/db/index.js'
import models from '../src/db/models/index.js'
import { hashPassword } from '../src/services/authService.js'

// Creates or updates an admin account. Usage:
//   npm run create-admin -- --email you@example.com --role owner [--password secret]
// With no password one is generated and printed once - it is never stored in plain text
// and cannot be recovered afterwards.
async function main() {
  const args = process.argv.slice(2)
  const valueOf = (flag) => {
    const index = args.indexOf(flag)
    return index === -1 ? null : args[index + 1]
  }

  const email = valueOf('--email')
  if (!email) throw new Error('--email is required')

  const role = valueOf('--role') ?? 'owner'
  if (!['owner', 'manager', 'staff'].includes(role)) {
    throw new Error(`--role must be owner, manager or staff (got "${role}")`)
  }

  const password = valueOf('--password') ?? randomBytes(9).toString('base64url')
  const name = valueOf('--name') ?? email.split('@')[0]

  const [admin, created] = await models.AdminUser.findOrCreate({
    where: { email },
    defaults: { email, name, role, passwordHash: await hashPassword(password) },
  })

  if (!created) {
    await admin.update({ role, passwordHash: await hashPassword(password), isActive: true })
  }

  console.log(`${created ? 'Created' : 'Updated'} ${email} (${role})`)
  console.log(`Password: ${password}`)
  await sequelize.close()
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(async (error) => {
    console.error(error.message)
    await sequelize.close()
    process.exit(1)
  })
}
