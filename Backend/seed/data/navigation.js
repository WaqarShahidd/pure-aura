import { collectionPath, ROUTES } from './routes.js'
import { collectionsMegaGroups, routinesFlyoutPanels } from './megaMenu.js'

// `layout` picks the dropdown shape:
//   'mega'   — full-width panel: sidebar of groups + image columns   (see MegaPanel)
//   'flyout' — two-level panel: labels on the left, links on the right (see FlyoutPanel)
//   'list'   — simple list anchored under the item, from `children`   (see ListPanel)
//   'link'   — no dropdown
// NavItem falls back to 'list' when `children` exists and 'link' otherwise.
export const navigation = [
  {
    label: 'Best Sellers',
    href: collectionPath('best-sellers'),
    highlight: true,
    layout: 'list',
    children: [
      { label: 'Shop All Best Sellers', href: collectionPath('best-sellers') },
      { label: 'New Arrivals', href: collectionPath('new-arrivals') },
      { label: 'Gift Sets', href: collectionPath('gift-sets') },
      { label: 'Limited Collection', href: collectionPath('limited') },
    ],
  },
  {
    label: 'Collections',
    href: collectionPath('all'),
    layout: 'mega',
    groups: collectionsMegaGroups,
  },
  {
    label: 'Templates',
    href: ROUTES.templates,
    layout: 'flyout',
    panels: routinesFlyoutPanels,
  },
  {
    label: 'Presets',
    href: ROUTES.presets,
    layout: 'list',
    children: [
      { label: 'Skin Care', href: collectionPath('skincare') },
      { label: 'Make Up', href: collectionPath('makeup') },
      { label: 'Body Care', href: collectionPath('body-care') },
    ],
  },
  {
    label: 'B2B Features',
    href: ROUTES.b2b,
    layout: 'list',
    children: [
      { label: 'Wholesale Pricing', href: ROUTES.wholesale },
      { label: 'Bulk Orders', href: ROUTES.bulkOrders },
      { label: 'Stockist Enquiries', href: ROUTES.contact },
    ],
  },
]
