import bcrypt from 'bcryptjs'
import { Op } from 'sequelize'
import models from '../db/models/index.js'
import { conflict, forbidden, notFound, unprocessable } from '../lib/errors.js'

const { AdminUser, AuditLog } = models

function serialize(row) {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    isActive: row.isActive,
    lastLoginAt: row.lastLoginAt,
  }
}

export async function listAdminUsers() {
  const rows = await AdminUser.findAll({ order: [['name', 'ASC']] })
  return rows.map(serialize)
}

export async function createAdminUser(payload) {
  const { password, ...fields } = payload
  const row = await AdminUser.create({ ...fields, passwordHash: await bcrypt.hash(password, 10) })
  return serialize(row)
}

export async function updateAdminUser(id, payload) {
  const row = await AdminUser.findByPk(id)
  if (!row) throw notFound('No such admin user')

  const { password, ...fields } = payload

  // The last owner cannot demote or deactivate themselves out of the account, or nobody
  // could ever grant owner again without going around the application entirely.
  if ((fields.role && fields.role !== 'owner') || fields.isActive === false) {
    if (row.role === 'owner') {
      const otherOwners = await AdminUser.count({ where: { role: 'owner', id: { [Op.ne]: id }, isActive: true } })
      if (otherOwners === 0) {
        throw unprocessable('LAST_OWNER', 'At least one active owner must remain', [
          { field: 'role', message: 'This is the only owner' },
        ])
      }
    }
  }

  const before = serialize(row)
  const patch = { ...fields }
  if (password) patch.passwordHash = await bcrypt.hash(password, 10)
  await row.update(patch)

  return { before, after: serialize(row) }
}

export async function deleteAdminUser(id, { actingAdminId }) {
  if (id === actingAdminId) {
    throw forbidden('You cannot remove your own account')
  }

  const row = await AdminUser.findByPk(id)
  if (!row) throw notFound('No such admin user')

  if (row.role === 'owner') {
    const otherOwners = await AdminUser.count({ where: { role: 'owner', id: { [Op.ne]: id }, isActive: true } })
    if (otherOwners === 0) {
      throw conflict('LAST_OWNER', 'At least one active owner must remain')
    }
  }

  await row.destroy()
}

export async function listAuditLog({ page = 1, perPage = 50, entityType } = {}) {
  const where = entityType ? { entityType } : {}
  const { rows, count } = await AuditLog.findAndCountAll({
    where,
    include: [{ association: 'admin', attributes: ['id', 'name', 'email'] }],
    order: [['createdAt', 'DESC']],
    limit: perPage,
    offset: (page - 1) * perPage,
  })

  return {
    data: rows.map((row) => ({
      id: row.id,
      action: row.action,
      entityType: row.entityType,
      entityId: row.entityId,
      before: row.before,
      after: row.after,
      admin: row.admin ? { id: row.admin.id, name: row.admin.name, email: row.admin.email } : null,
      createdAt: row.createdAt,
    })),
    meta: { page, perPage, total: count, totalPages: Math.max(1, Math.ceil(count / perPage)) },
  }
}
