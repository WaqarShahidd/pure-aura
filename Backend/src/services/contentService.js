import { Op } from 'sequelize'
import models from '../db/models/index.js'
import { mediaUrl } from '../serializers/media.js'
import { notFound } from '../lib/errors.js'

const {
  Setting, SocialLink, Announcement, NavItem, FooterLinkGroup, HomepageSection,
  StaticPage, Faq, Collection, Product, MediaAsset,
} = models

// Keys of SOCIAL_ICONS in Customer/src/config/socialIcons.jsx. An icon key the storefront
// does not know renders `undefined` as a component and white-screens the header, so rows
// naming one are filtered out here rather than trusted. A missing icon is survivable; a
// blank page is not.
const KNOWN_SOCIAL_ICONS = new Set([
  'x', 'facebook', 'pinterest', 'instagram',
  'tiktok', 'youtube', 'linkedin', 'whatsapp', 'threads', 'snapchat',
])

// Ids of <symbol> elements in Customer/public/icons.svg. Same reasoning: an unknown id
// produces a broken <use href="#foo-icon"> and an empty box.
const KNOWN_PAYMENT_ICONS = new Set([
  'visa', 'mastercard', 'amex', 'paypal', 'diners', 'discover', 'cod', 'bank',
])

const MEDIA_INCLUDE = { association: 'image', include: [{ association: 'variants' }] }

// Nav and footer entries store a typed target rather than a raw href, so a link can be
// resolved at read time - and silently dropped when whatever it points at is gone. The
// mega menu currently hardcodes 24 product URLs as strings; archiving a product leaves a
// dead link with nothing to notice it.
async function buildHrefResolver() {
  const [collections, products, pages] = await Promise.all([
    Collection.findAll({ attributes: ['id', 'handle'], where: { isActive: true } }),
    Product.findAll({
      attributes: ['id', 'handle'],
      where: { status: 'active', publishedAt: { [Op.ne]: null } },
    }),
    StaticPage.findAll({ attributes: ['id', 'slug', 'kind'], where: { isPublished: true } }),
  ])

  const byId = {
    collection: new Map(collections.map((row) => [row.id, `/collections/${row.handle}`])),
    product: new Map(products.map((row) => [row.id, `/products/${row.handle}`])),
    page: new Map(pages.map((row) => [row.id, `/pages/${row.slug}`])),
    policy: new Map(pages.map((row) => [row.id, `/policies/${row.slug}`])),
  }

  // Returns null when the target no longer resolves, which callers treat as "omit this".
  return function hrefFor(targetType, targetId, customHref) {
    if (targetType === 'custom' || targetType === 'none') return customHref ?? null
    const map = byId[targetType]
    if (!map) return customHref ?? null
    return map.get(targetId) ?? null
  }
}

// Groups the flat rows by parent, preserving the position ordering the query applied.
function buildNavTree(rows, hrefFor) {
  const childrenByParent = new Map()
  const roots = []

  for (const row of rows) {
    if (!row.parentId) {
      roots.push(row)
      continue
    }
    const siblings = childrenByParent.get(row.parentId) ?? []
    siblings.push(row)
    childrenByParent.set(row.parentId, siblings)
  }

  return roots.map((root) => navNodeToJson(root, childrenByParent, hrefFor)).filter(Boolean)
}

function settingsToObject(rows) {
  const output = {}
  for (const row of rows) output[row.key] = row.value
  return output
}

function navNodeToJson(node, childrenByParent, hrefFor, rootLayout = null) {
  const href = hrefFor(node.targetType, node.targetId, node.customHref)

  // A link whose target has been archived is dropped entirely rather than rendered as a
  // dead end. Groups and columns survive without an href because they are containers.
  if (node.kind === 'link' && !href) return null

  // A root defines the layout; everything below inherits it.
  const layout = node.kind === 'root' ? (node.layout ?? 'list') : rootLayout

  const children = (childrenByParent.get(node.id) ?? [])
    .map((child) => navNodeToJson(child, childrenByParent, hrefFor, layout))
    .filter(Boolean)

  const json = {
    id: node.id,
    kind: node.kind,
    label: node.label,
    href,
    layout: node.layout ?? undefined,
    highlight: node.highlight || undefined,
    allLabel: node.allLabel ?? undefined,
    allHref: node.allHref ?? undefined,
    seed: node.seed ?? undefined,
    image: mediaUrl(node.image) ?? undefined,
  }

  // Children are split by kind into the shape the renderers already expect, rather than
  // handed over as one mixed array for MegaPanel and FlyoutPanel to sort out. Matching
  // megaMenu.data.js here means those components keep working on API data unchanged.
  //
  // The layout of the ROOT decides what a group's links are called, which is why it is
  // threaded down: MegaPanel reads `group.allLinks` for its first column, while
  // FlyoutPanel reads `panel.links`. Same rows, two different names.
  const links = children.filter((child) => child.kind === 'link')
  const columns = children.filter((child) => child.kind === 'column')
  const groups = children.filter((child) => child.kind === 'group')

  if (node.kind === 'root') {
    // navigation.js calls them `groups` under a mega item and `panels` under a flyout.
    if (groups.length) json[layout === 'flyout' ? 'panels' : 'groups'] = groups
    if (links.length) json.links = links
  } else if (node.kind === 'group') {
    if (columns.length) json.columns = columns
    if (links.length) json[layout === 'flyout' ? 'links' : 'allLinks'] = links
  } else if (links.length) {
    json.links = links
  }

  return json
}

// Everything the storefront chrome needs, in one request. Header, footer, announcements
// and settings are on every page, so fetching them separately would mean four round trips
// before anything renders.
export async function getBootstrap() {
  const [settingRows, socials, announcements, navRoots, footerGroups, hrefFor] =
    await Promise.all([
      Setting.findAll(),
      SocialLink.findAll({ where: { isActive: true }, order: [['position', 'ASC']] }),
      Announcement.findAll({ where: { isActive: true }, order: [['position', 'ASC']] }),
      // Fetched FLAT and assembled in JS. The menu is root > group > column > link, and
      // Sequelize cannot express three levels of a self-referencing include without
      // tripping over its own aliases ("missing FROM-clause entry for children->children").
      // One query plus a grouping pass is simpler and faster than the join it was trying
      // to build anyway.
      NavItem.findAll({
        where: { isActive: true },
        order: [['position', 'ASC']],
        include: [MEDIA_INCLUDE],
      }),
      FooterLinkGroup.findAll({
        where: { isActive: true },
        order: [['position', 'ASC']],
        include: [{ association: 'links', separate: true, order: [['position', 'ASC']] }],
      }),
      buildHrefResolver(),
    ])

  const settings = settingsToObject(settingRows)
  const now = new Date()

  return {
    settings: {
      name: settings.site_name ?? 'Pure Aura',
      tagline: settings.tagline ?? '',
      currency: settings.currency ?? 'PKR',
      footerAbout: settings.footer_about ?? null,
      cartCopy: settings.cart_copy ?? null,
      freeShippingThreshold: settings.free_shipping_threshold ?? 0,
      reservationMinutes: settings.reservation_minutes ?? 10,
      footerPaymentIcons: (settings.footer_payment_icons ?? []).filter((icon) =>
        KNOWN_PAYMENT_ICONS.has(icon.id),
      ),
    },

    announcements: announcements
      .filter((row) => (!row.startsAt || row.startsAt <= now) && (!row.endsAt || row.endsAt >= now))
      .map((row) => ({
        message: row.message,
        ctaLabel: row.ctaLabel,
        ctaHref: hrefFor(row.ctaTargetType, row.ctaTargetId, row.ctaCustomHref),
      })),

    socials: socials
      .filter((row) => KNOWN_SOCIAL_ICONS.has(row.iconKey))
      .map((row) => ({ label: row.label, icon: row.iconKey, href: row.href })),

    navigation: buildNavTree(navRoots, hrefFor),

    footer: footerGroups.map((group) => ({
      title: group.title,
      links: (group.links ?? [])
        .map((link) => ({
          label: link.label,
          href: hrefFor(link.targetType, link.targetId, link.customHref),
        }))
        .filter((link) => link.href),
    })),
  }
}

// Media ids inside a section's content blob are swapped for URLs on the way out, so the
// storefront never has to know an asset id exists.
async function hydrateMedia(content) {
  const ids = new Set()

  const walk = (node) => {
    if (!node || typeof node !== 'object') return
    if (Array.isArray(node)) return node.forEach(walk)
    for (const [key, value] of Object.entries(node)) {
      if (key.endsWith('MediaId') || key === 'mediaId') {
        if (value) ids.add(value)
      } else {
        walk(value)
      }
    }
  }
  walk(content)

  if (ids.size === 0) return content

  const assets = await MediaAsset.findAll({
    where: { id: { [Op.in]: [...ids] } },
    include: [{ association: 'variants' }],
  })
  const urlById = new Map(assets.map((asset) => [asset.id, mediaUrl(asset)]))

  const swap = (node) => {
    if (!node || typeof node !== 'object') return node
    if (Array.isArray(node)) return node.map(swap)

    const output = {}
    for (const [key, value] of Object.entries(node)) {
      if (key === 'mediaId') {
        output.image = urlById.get(value) ?? null
      } else if (key.endsWith('MediaId')) {
        // posterMediaId -> poster, videoMediaId -> video
        output[key.replace(/MediaId$/, '')] = urlById.get(value) ?? null
      } else {
        output[key] = swap(value)
      }
    }
    return output
  }

  return swap(content)
}

export async function getHomepage() {
  const sections = await HomepageSection.findAll({
    where: { isEnabled: true },
    order: [['position', 'ASC']],
  })

  return Promise.all(
    sections.map(async (section) => ({
      key: section.key,
      content: await hydrateMedia(section.content),
    })),
  )
}

export async function getPages() {
  const rows = await StaticPage.findAll({
    where: { isPublished: true },
    order: [['position', 'ASC']],
    attributes: ['slug', 'title', 'kind', 'customComponent'],
  })
  return rows.map((row) => ({
    slug: row.slug,
    title: row.title,
    kind: row.kind,
    customComponent: row.customComponent ?? null,
  }))
}

export async function getPage(slug) {
  const page = await StaticPage.findOne({
    where: { slug, isPublished: true },
    include: [{ association: 'sections', separate: true, order: [['position', 'ASC']] }],
  })
  if (!page) throw notFound(`No page with slug "${slug}"`)

  return {
    slug: page.slug,
    title: page.title,
    accent: page.accent ?? null,
    kind: page.kind,
    // Non-null means the storefront renders an interactive component for this slug
    // instead of prose. Page.jsx resolves it against a hardcoded whitelist, so the
    // database can never name a component that does not exist.
    customComponent: page.customComponent ?? null,
    updated: page.updatedLabel ?? null,
    intro: page.intro ?? null,
    sections: (page.sections ?? []).map((section) => ({
      heading: section.heading,
      body: section.body ?? [],
    })),
  }
}

export async function getFaqs() {
  const rows = await Faq.findAll({
    where: { isPublished: true },
    order: [['position', 'ASC']],
  })
  return rows.map((row) => ({ id: row.key, question: row.question, answer: row.answer }))
}
