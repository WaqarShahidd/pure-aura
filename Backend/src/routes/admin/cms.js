import { Router } from 'express'
import { z } from 'zod'
import models from '../../db/models/index.js'
import { validate } from '../../middleware/validate.js'
import { requireRole } from '../../middleware/auth.js'
import { auditFrom } from '../../services/auditService.js'
import { schemaForSection } from '../../schemas/homepage.js'
import * as navService from '../../services/adminNavService.js'
import { mediaUrl } from '../../serializers/media.js'
import { badRequest, notFound, validationFailed } from '../../lib/errors.js'

const {
  HomepageSection, StaticPage, PageSection, Faq, Announcement, SocialLink, Setting,
  NavItem, FooterLinkGroup, FooterLink, Collection, Product, MediaAsset,
} = models

const router = Router()
const asyncRoute = (handler) => (req, res, next) => handler(req, res, next).catch(next)

// --- homepage ------------------------------------------------------------------------
// Four rows, fixed. POST and DELETE are deliberately absent: the decision was "fixed
// sections, editable fields", and an API that can create a fifth would quietly undo it.
router.get(
  '/homepage/sections',
  asyncRoute(async (req, res) => {
    const sections = await HomepageSection.findAll({ order: [['position', 'ASC']] })

    // Media ids inside the blob are resolved to preview URLs so the editor can show
    // thumbnails without a second round trip per image.
    const ids = new Set()
    const walk = (node) => {
      if (!node || typeof node !== 'object') return
      if (Array.isArray(node)) return node.forEach(walk)
      for (const [key, value] of Object.entries(node)) {
        if ((key === 'mediaId' || key.endsWith('MediaId')) && value) ids.add(value)
        else walk(value)
      }
    }
    sections.forEach((section) => walk(section.content))

    const assets = ids.size
      ? await MediaAsset.findAll({
          where: { id: [...ids] },
          include: [{ association: 'variants' }],
        })
      : []
    const previews = Object.fromEntries(assets.map((asset) => [asset.id, mediaUrl(asset)]))

    res.json({
      data: sections.map((section) => ({
        key: section.key,
        label: section.label,
        isEnabled: section.isEnabled,
        position: section.position,
        content: section.content,
        updatedAt: section.updatedAt,
      })),
      meta: { mediaPreviews: previews },
    })
  }),
)

router.patch(
  '/homepage/sections/:key',
  requireRole('manager'),
  asyncRoute(async (req, res) => {
    const section = await HomepageSection.findOne({ where: { key: req.params.key } })
    if (!section) throw notFound('No such section')

    const patch = {}

    if (req.body.isEnabled !== undefined) patch.isEnabled = Boolean(req.body.isEnabled)

    if (req.body.content !== undefined) {
      const schema = schemaForSection(section.key)
      if (!schema) throw badRequest(`No schema for section "${section.key}"`)

      const parsed = schema.safeParse(req.body.content)
      if (!parsed.success) {
        throw validationFailed(
          parsed.error.issues.map((issue) => ({
            field: issue.path.join('.') || 'content',
            message: issue.message,
          })),
        )
      }
      patch.content = parsed.data
    }

    const before = { isEnabled: section.isEnabled, content: section.content }
    await section.update({ ...patch, updatedBy: req.admin.id })

    await auditFrom(req)({
      action: 'homepage.update',
      entityType: 'homepage_section',
      entityId: section.key,
      before,
      after: { isEnabled: section.isEnabled, content: section.content },
    })

    res.json({ data: { key: section.key, isEnabled: section.isEnabled, content: section.content } })
  }),
)

// --- static pages ---------------------------------------------------------------------
router.get(
  '/pages',
  asyncRoute(async (req, res) => {
    const rows = await StaticPage.findAll({ order: [['position', 'ASC']] })
    res.json({
      data: rows.map((row) => ({
        id: row.id,
        slug: row.slug,
        title: row.title,
        kind: row.kind,
        customComponent: row.customComponent,
        isPublished: row.isPublished,
      })),
    })
  }),
)

router.get(
  '/pages/:slug',
  asyncRoute(async (req, res) => {
    const page = await StaticPage.findOne({
      where: { slug: req.params.slug },
      include: [{ association: 'sections', separate: true, order: [['position', 'ASC']] }],
    })
    if (!page) throw notFound('No such page')

    res.json({
      data: {
        id: page.id,
        slug: page.slug,
        title: page.title,
        accent: page.accent,
        kind: page.kind,
        customComponent: page.customComponent,
        updatedLabel: page.updatedLabel,
        intro: page.intro,
        isPublished: page.isPublished,
        sections: (page.sections ?? []).map((section) => ({
          heading: section.heading,
          body: section.body ?? [],
        })),
      },
    })
  }),
)

const pageSchema = z.object({
  title: z.string().min(1, 'Required'),
  accent: z.string().nullish(),
  intro: z.string().nullish(),
  updatedLabel: z.string().nullish(),
  isPublished: z.boolean().default(true),
  sections: z
    .array(z.object({ heading: z.string().nullish(), body: z.array(z.string()) }))
    .optional(),
})

router.patch(
  '/pages/:slug',
  requireRole('manager'),
  validate(pageSchema.partial()),
  asyncRoute(async (req, res) => {
    const page = await StaticPage.findOne({ where: { slug: req.params.slug } })
    if (!page) throw notFound('No such page')

    const { sections, ...attributes } = req.body
    await page.update(attributes)

    // Sections are replaced wholesale: they have no identity of their own and the editor
    // sends the complete list it is showing.
    if (sections) {
      await PageSection.destroy({ where: { pageId: page.id } })
      for (const [index, section] of sections.entries()) {
        await PageSection.create({
          pageId: page.id,
          heading: section.heading ?? null,
          body: section.body ?? [],
          position: index,
        })
      }
    }

    await auditFrom(req)({
      action: 'page.update',
      entityType: 'static_page',
      entityId: page.slug,
      after: attributes,
    })

    res.json({ data: { slug: page.slug } })
  }),
)

// --- faqs -------------------------------------------------------------------------------
router.get(
  '/faqs',
  asyncRoute(async (req, res) => {
    const rows = await Faq.findAll({ order: [['position', 'ASC']] })
    res.json({
      data: rows.map((row) => ({
        id: row.id,
        key: row.key,
        question: row.question,
        answer: row.answer,
        position: row.position,
        isPublished: row.isPublished,
      })),
    })
  }),
)

router.put(
  '/faqs',
  requireRole('manager'),
  validate(
    z.object({
      faqs: z.array(
        z.object({
          key: z.string().min(1),
          question: z.string().min(1, 'Required'),
          answer: z.string().min(1, 'Required'),
          isPublished: z.boolean().default(true),
        }),
      ),
    }),
  ),
  asyncRoute(async (req, res) => {
    await Faq.destroy({ where: {} })
    for (const [index, faq] of req.body.faqs.entries()) {
      await Faq.create({ ...faq, position: index })
    }

    await auditFrom(req)({ action: 'faqs.replace', entityType: 'faq', entityId: 'all' })
    res.json({ data: { count: req.body.faqs.length } })
  }),
)

// --- announcements ---------------------------------------------------------------------
router.get(
  '/announcements',
  asyncRoute(async (req, res) => {
    const rows = await Announcement.findAll({ order: [['position', 'ASC']] })
    res.json({ data: rows })
  }),
)

router.put(
  '/announcements',
  requireRole('manager'),
  validate(
    z.object({
      announcements: z.array(
        z.object({
          message: z.string().min(1, 'Required'),
          ctaLabel: z.string().nullish(),
          ctaCustomHref: z.string().nullish(),
          isActive: z.boolean().default(true),
        }),
      ),
    }),
  ),
  asyncRoute(async (req, res) => {
    await Announcement.destroy({ where: {} })
    for (const [index, row] of req.body.announcements.entries()) {
      await Announcement.create({ ...row, ctaTargetType: 'custom', position: index })
    }

    await auditFrom(req)({
      action: 'announcements.replace',
      entityType: 'announcement',
      entityId: 'all',
    })
    res.json({ data: { count: req.body.announcements.length } })
  }),
)

// --- navigation -------------------------------------------------------------------------
router.get(
  '/nav-items',
  asyncRoute(async (req, res) => {
    const rows = await NavItem.findAll({ order: [['position', 'ASC']] })
    res.json({ data: rows })
  }),
)

// Ordering is done with up/down buttons rather than drag and drop: two positions swap in
// one transaction, which has no reorder-on-drop race and needs no drag library.
router.post(
  '/nav-items/:id/move',
  requireRole('manager'),
  validate(z.object({ direction: z.enum(['up', 'down']) })),
  asyncRoute(async (req, res) => {
    const item = await NavItem.findByPk(req.params.id)
    if (!item) throw notFound('No such menu item')

    const siblings = await NavItem.findAll({
      where: { parentId: item.parentId ?? null },
      order: [['position', 'ASC']],
    })

    const index = siblings.findIndex((row) => row.id === item.id)
    const target = req.body.direction === 'up' ? index - 1 : index + 1
    if (target < 0 || target >= siblings.length) return res.json({ data: { moved: false } })

    const other = siblings[target]
    const itemPosition = item.position
    await item.update({ position: other.position })
    await other.update({ position: itemPosition })

    res.json({ data: { moved: true } })
  }),
)

const navItemSchema = z.object({
  parentId: z.string().uuid().nullish(),
  kind: z.enum(['root', 'group', 'column', 'link']),
  label: z.string().min(1, 'Required'),
  layout: z.enum(['mega', 'flyout', 'list', 'link']).nullish(),
  targetType: z.enum(['collection', 'product', 'page', 'policy', 'custom', 'none']).default('none'),
  targetId: z.string().uuid().nullish(),
  customHref: z.string().nullish(),
  mediaId: z.string().uuid().nullish(),
  seed: z.string().nullish(),
  highlight: z.boolean().default(false),
  allLabel: z.string().nullish(),
  allHref: z.string().nullish(),
  isActive: z.boolean().default(true),
})

router.post(
  '/nav-items',
  requireRole('manager'),
  validate(navItemSchema),
  asyncRoute(async (req, res) => {
    const item = await navService.createNavItem(req.body)
    await auditFrom(req)({ action: 'nav_item.create', entityType: 'nav_item', entityId: item.id, after: item })
    res.status(201).json({ data: item })
  }),
)

router.patch(
  '/nav-items/:id',
  requireRole('manager'),
  validate(navItemSchema.omit({ kind: true, parentId: true }).partial()),
  asyncRoute(async (req, res) => {
    const { before, after } = await navService.updateNavItem(req.params.id, req.body)
    await auditFrom(req)({ action: 'nav_item.update', entityType: 'nav_item', entityId: req.params.id, before, after })
    res.json({ data: after })
  }),
)

router.delete(
  '/nav-items/:id',
  requireRole('manager'),
  asyncRoute(async (req, res) => {
    await navService.deleteNavItem(req.params.id)
    await auditFrom(req)({ action: 'nav_item.delete', entityType: 'nav_item', entityId: req.params.id })
    res.status(204).end()
  }),
)

// Feeds TargetPicker: choose a type, then a record, instead of typing a URL by hand.
router.get(
  '/link-targets',
  asyncRoute(async (req, res) => {
    const [collections, products, pages] = await Promise.all([
      Collection.findAll({ attributes: ['id', 'title', 'handle'], order: [['title', 'ASC']] }),
      Product.findAll({
        attributes: ['id', 'title', 'handle'],
        where: { status: 'active' },
        order: [['title', 'ASC']],
      }),
      StaticPage.findAll({ attributes: ['id', 'title', 'slug', 'kind'], order: [['title', 'ASC']] }),
    ])

    res.json({
      data: {
        collection: collections.map((row) => ({ id: row.id, label: row.title })),
        product: products.map((row) => ({ id: row.id, label: row.title })),
        page: pages.filter((row) => row.kind === 'page').map((row) => ({ id: row.id, label: row.title })),
        policy: pages.filter((row) => row.kind === 'policy').map((row) => ({ id: row.id, label: row.title })),
      },
    })
  }),
)

// --- footer, socials, settings ------------------------------------------------------------
router.get(
  '/footer',
  asyncRoute(async (req, res) => {
    const groups = await FooterLinkGroup.findAll({
      order: [['position', 'ASC']],
      include: [{ association: 'links', separate: true, order: [['position', 'ASC']] }],
    })
    res.json({ data: groups })
  }),
)

router.put(
  '/footer',
  requireRole('manager'),
  validate(
    z.object({
      groups: z.array(
        z.object({
          title: z.string().min(1, 'Required'),
          links: z.array(
            z.object({ label: z.string().min(1), customHref: z.string().min(1) }),
          ),
        }),
      ),
    }),
  ),
  asyncRoute(async (req, res) => {
    await FooterLinkGroup.destroy({ where: {} })
    for (const [index, group] of req.body.groups.entries()) {
      const row = await FooterLinkGroup.create({ title: group.title, position: index })
      for (const [linkIndex, link] of group.links.entries()) {
        await FooterLink.create({
          groupId: row.id,
          label: link.label,
          targetType: 'custom',
          customHref: link.customHref,
          position: linkIndex,
        })
      }
    }

    await auditFrom(req)({ action: 'footer.replace', entityType: 'footer', entityId: 'all' })
    res.json({ data: { count: req.body.groups.length } })
  }),
)

router.get(
  '/social-links',
  asyncRoute(async (req, res) => {
    res.json({ data: await SocialLink.findAll({ order: [['position', 'ASC']] }) })
  }),
)

router.get(
  '/settings',
  asyncRoute(async (req, res) => {
    const rows = await Setting.findAll()
    res.json({ data: Object.fromEntries(rows.map((row) => [row.key, row.value])) })
  }),
)

router.patch(
  '/settings/:key',
  requireRole('manager'),
  asyncRoute(async (req, res) => {
    const [row] = await Setting.upsert({
      key: req.params.key,
      value: req.body.value,
      updatedBy: req.admin.id,
    })

    await auditFrom(req)({
      action: 'setting.update',
      entityType: 'setting',
      entityId: req.params.key,
      after: { value: req.body.value },
    })

    res.json({ data: { key: row.key, value: row.value } })
  }),
)

export default router
