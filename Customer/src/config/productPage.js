// Static copy for the product page. Kept out of the components so wording changes never mean
// touching JSX.
export const productPageCopy = {
  giftWrapLabel: 'Gift wrap this product',
  giftCardHeading: 'Get a gift card',
  giftCardLabel: 'Yes, I want one',
  giftMessageLabel: 'Leave a message in the gift card (Optional)',
  giftMessagePlaceholder: 'Leave a message in the gift card (Optional)',
  upload: {
    heading: 'Upload the design you want to print on the packaging box',
    prompt: 'Drop your file here, or',
    browse: 'Browse',
    hint: 'Maximum file size 25Mb',
    error: 'File cannot exceed 25Mb',
  },
  addToCart: 'Add to cart',
  buyNow: 'Buy it now',
  pickup: {
    title: 'Pickup available at Head Office',
    subtitle: 'Usually ready in 24 hours',
    link: 'View store information',
  },
  moreDeals: {
    title: 'More Deals From Pure Aura!',
    action: 'Add',
  },
  routineTitle: 'Complete your routine with',
  payWith: 'Pay with',
}

// The three accordion sections below "Ingredient bar" are the same for every product.
export const productAccordionSections = [
  {
    id: 'testing',
    title: 'Testing Shows',
    body:
      'In a four-week consumer study of 104 participants, 92% reported skin that felt more ' +
      'comfortable and 87% saw a visible improvement in tone and texture.',
  },
  {
    id: 'returns',
    title: 'Returns + Exchanges',
    body:
      'Not the right fit? Return any unopened product within 30 days for a full refund, or ' +
      'exchange an opened one once within 60 days. We cover return shipping.',
  },
  {
    id: 'giving-back',
    title: 'Giving Back',
    body:
      'One percent of every order funds clean water projects. Our packaging is refillable, and ' +
      'we take back empties in store for recycling.',
  },
]

export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024
