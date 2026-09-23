import models from '../db/models/index.js'
import { notFound, unprocessable } from '../lib/errors.js'

const { NavItem, Collection, Product, StaticPage } = models

// Depth bounded by kind, so the tree can never nest into a shape MegaPanel, FlyoutPanel or
// ListPanel cannot draw. A root can go straight to links (a plain list/link layout) or
// fan out through groups; a group can go straight to links (flyout) or through columns
// (mega); a column and a link are always leaves of their branch.
const ALLOWED_CHILD_KINDS = {
  root: ['group', 'link'],
  group: ['column', 'link'],
  column: ['link'],
  link: [],
}

function serialize(row) {
  return {
    id: row.id,
    parentId: row.parentId,
    kind: row.kind,
    label: row.label,
    layout: row.layout,
    targetType: row.targetType,
    targetId: row.targetId,
    customHref: row.customHref,
    mediaId: row.mediaId,
    seed: row.seed,
    highlight: row.highlight,
    allLabel: row.allLabel,
    allHref: row.allHref,
    position: row.position,
    isActive: row.isActive,
  }
}

// A link whose target has been renamed, unpublished or deleted should never save
// silently - the admin needs to know now, not when the storefront quietly drops it.
async function assertTargetResolves(targetType, targetId) {
  if (!targetId || targetType === 'custom' || targetType === 'none') return

  const model = { collection: Collection, product: Product, page: StaticPage, policy: StaticPage }[targetType]
  if (!model) return

  const row = await model.findByPk(targetId)
  if (!row) {
    throw unprocessable('TARGET_NOT_FOUND', 'That target no longer exists', [
      { field: 'targetId', message: 'Choose a valid target' },
    ])
  }
}

export async function createNavItem(payload) {
  const { parentId, kind } = payload

  if (parentId) {
    const parent = await NavItem.findByPk(parentId)
    if (!parent) throw notFound('No such parent menu item')
    if (!ALLOWED_CHILD_KINDS[parent.kind]?.includes(kind)) {
      throw unprocessable(
        'INVALID_NAV_DEPTH',
        `A ${parent.kind} cannot contain a ${kind}`,
        [{ field: 'kind', message: `Must be one of: ${ALLOWED_CHILD_KINDS[parent.kind].join(', ') || 'nothing'}` }],
      )
    }
  } else if (kind !== 'root') {
    throw unprocessable('INVALID_NAV_DEPTH', 'Only a root item can have no parent', [
      { field: 'parentId', message: 'Required' },
    ])
  }

  await assertTargetResolves(payload.targetType, payload.targetId)

  const siblingCount = await NavItem.count({ where: { parentId: parentId ?? null } })
  const row = await NavItem.create({ ...payload, position: siblingCount })
  return serialize(row)
}

export async function updateNavItem(id, payload) {
  const row = await NavItem.findByPk(id)
  if (!row) throw notFound('No such menu item')

  const before = serialize(row)

  const targetType = payload.targetType ?? row.targetType
  const targetId = 'targetId' in payload ? payload.targetId : row.targetId
  await assertTargetResolves(targetType, targetId)

  // kind is deliberately not accepted here - changing it after creation could leave
  // existing children invalid for the new depth rules. Delete and recreate instead.
  const { kind: _ignoredKind, parentId: _ignoredParentId, ...fields } = payload
  await row.update(fields)

  return { before, after: serialize(row) }
}

export async function deleteNavItem(id) {
  const row = await NavItem.findByPk(id)
  if (!row) throw notFound('No such menu item')
  // parent_id is ON DELETE CASCADE - removing a group takes its columns and links with
  // it, which is the correct behaviour for a menu tree, unlike a catalogue resource
  // where a cascade would mean losing data nobody meant to delete.
  await row.destroy()
}
