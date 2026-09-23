import models from '../db/models/index.js'

const { AuditLog } = models

// Every admin write records what changed, who changed it and when. Called inside the same
// transaction as the write itself, so the log cannot record something that then rolled
// back - an audit trail that disagrees with the data is worse than none.
//
// `before` and `after` are trimmed to the fields that actually differ. Storing whole rows
// makes the log enormous and buries the one changed column in forty unchanged ones.
export async function audit(
  { adminUserId, action, entityType, entityId, before, after, ip },
  transaction = null,
) {
  const [trimmedBefore, trimmedAfter] = diffOf(before, after)

  await AuditLog.create(
    {
      adminUserId: adminUserId ?? null,
      action,
      entityType,
      entityId: entityId == null ? null : String(entityId),
      before: trimmedBefore,
      after: trimmedAfter,
      ip: ip ?? null,
    },
    { transaction },
  )
}

function diffOf(before, after) {
  if (!before || !after) return [before ?? null, after ?? null]

  const changedBefore = {}
  const changedAfter = {}

  for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
    // updatedAt differs on every write by definition, so recording it is pure noise.
    if (key === 'updatedAt' || key === 'createdAt') continue
    if (JSON.stringify(before[key]) === JSON.stringify(after[key])) continue
    changedBefore[key] = before[key] ?? null
    changedAfter[key] = after[key] ?? null
  }

  return [changedBefore, changedAfter]
}

// Convenience for routes: pulls the actor off the request so call sites stay short.
export function auditFrom(req) {
  return (details, transaction) =>
    audit({ ...details, adminUserId: req.admin?.id, ip: req.ip }, transaction)
}
