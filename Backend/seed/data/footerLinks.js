import { ROUTES } from './routes.js'

export const footerLinkGroups = [
  {
    title: 'Customer Care',
    links: [
      { label: 'Shipping Policy', href: ROUTES.shipping },
      { label: 'Privacy Policy', href: ROUTES.privacy },
      { label: 'Return & Refund', href: ROUTES.returns },
      { label: 'Terms & Conditions', href: ROUTES.terms },
      { label: 'FAQs', href: ROUTES.faqs },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About us', href: ROUTES.about },
      { label: 'Book a Treatment', href: ROUTES.bookTreatment },
      { label: 'Promotion programs', href: ROUTES.promotions },
      { label: 'Our Promises', href: ROUTES.promises },
      { label: 'Contact', href: ROUTES.contact },
    ],
  },
]

export const footerAbout = {
  heading: 'Pure Aura',
  body: 'At Pure Aura, we believe in the transformative power of beauty and wellness.',
}
