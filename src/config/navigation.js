import { ROUTES } from './routes'

// Each item with `children` renders as a dropdown in the header nav.
export const navigation = [
  {
    label: 'Best Sellers',
    href: ROUTES.bestSellers,
    highlight: true,
    children: [
      { label: 'Shop All Best Sellers', href: ROUTES.bestSellers },
      { label: 'New Arrivals', href: `${ROUTES.collections}/new-arrivals` },
      { label: 'Gift Sets', href: `${ROUTES.collections}/gift-sets` },
    ],
  },
  {
    label: 'Collections',
    href: ROUTES.collections,
    children: [
      { label: 'Skincare', href: `${ROUTES.collections}/skincare` },
      { label: 'Makeup', href: `${ROUTES.collections}/makeup` },
      { label: 'Body Care', href: `${ROUTES.collections}/body-care` },
    ],
  },
  {
    label: 'Templates',
    href: ROUTES.templates,
    children: [
      { label: 'Product Page', href: `${ROUTES.templates}/product` },
      { label: 'Collection Page', href: `${ROUTES.templates}/collection` },
    ],
  },
  {
    label: 'Presets',
    href: ROUTES.presets,
    children: [
      { label: 'Beauty', href: `${ROUTES.presets}/beauty` },
      { label: 'Wellness', href: `${ROUTES.presets}/wellness` },
    ],
  },
  {
    label: 'B2B Features',
    href: ROUTES.b2b,
    children: [
      { label: 'Wholesale Pricing', href: `${ROUTES.b2b}/wholesale` },
      { label: 'Bulk Orders', href: `${ROUTES.b2b}/bulk-orders` },
    ],
  },
]
