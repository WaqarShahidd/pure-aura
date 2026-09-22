import { collectionPath } from './routes'

export const site = {
  name: 'Pure Aura',
  tagline: 'Simple formulas for everyday glow.',
  copyrightYear: new Date().getFullYear(),
  // The bar rotates through these; the prev/next chevrons step between them.
  announcements: [
    {
      message: 'LIMITED COLLECTION UNLOCKED',
      ctaLabel: 'SHOP NOW',
      ctaHref: collectionPath('limited'),
    },
    {
      message: 'FREE SHIPPING ON ALL ORDERS OVER RS 28,000',
      ctaLabel: 'SHOP ALL',
      ctaHref: collectionPath('all'),
    },
    {
      message: 'NEW ARRIVALS JUST LANDED',
      ctaLabel: 'SEE WHAT’S NEW',
      ctaHref: collectionPath('new-arrivals'),
    },
  ],
  socials: [
    { label: 'Twitter', icon: 'x', href: 'https://x.com' },
    { label: 'Facebook', icon: 'facebook', href: 'https://facebook.com' },
    { label: 'Pinterest', icon: 'pinterest', href: 'https://pinterest.com' },
    { label: 'Instagram', icon: 'instagram', href: 'https://instagram.com' },
  ],
  languages: ['English', 'Français', 'Deutsch'],
  regions: ['Pakistan (PKR Rs)', 'United Arab Emirates (AED)', 'United Kingdom (GBP £)'],
  // `id` matches a <symbol> in public/icons.svg, suffixed with "-icon".
  paymentIcons: [
    { id: 'visa', label: 'Visa' },
    { id: 'mastercard', label: 'Mastercard' },
    { id: 'amex', label: 'American Express' },
    { id: 'paypal', label: 'PayPal' },
    { id: 'diners', label: 'Diners Club' },
    { id: 'discover', label: 'Discover' },
  ],
}
