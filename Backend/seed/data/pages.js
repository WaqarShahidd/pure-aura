// Copy for the static content pages. Keyed by URL slug — one entry renders one page through
// components/Page/StaticPage, so adding a policy page is a data change, not a new component.

const section = (heading, ...body) => ({ heading, body })

export const staticPages = {
  // ── Policies ────────────────────────────────────────────────────────────────────────
  'shipping-policy': {
    title: 'Shipping Policy',
    kind: 'policy',
    updated: 'January 2026',
    intro: 'How and when your order reaches you, and what it costs.',
    sections: [
      section(
        'Processing times',
        'Orders placed before 2pm on a working day are packed and dispatched the same day. Anything after that goes out the next working day. During launches and sale periods this can stretch to two working days — we will say so on the product page if it does.',
      ),
      section(
        'Delivery options',
        'Standard delivery arrives in 3-5 working days. Express delivery arrives the next working day if ordered before 2pm. Orders over Rs 28,000 ship free on the standard service.',
        'We currently ship across Pakistan, and to the UAE, Saudi Arabia and the United Kingdom. Tracking is emailed as soon as your parcel leaves us.',
      ),
      section(
        'Customs and duties',
        'Orders shipped outside Pakistan may attract import duties or taxes on arrival. These are set by the destination country and are the recipient’s responsibility. We cannot calculate them in advance.',
      ),
      section(
        'Something gone wrong?',
        'If your parcel has not moved for five working days, or it arrives damaged, email us within 14 days of dispatch and we will replace or refund it.',
      ),
    ],
  },

  'privacy-policy': {
    title: 'Privacy Policy',
    kind: 'policy',
    updated: 'January 2026',
    intro: 'What we collect, why we collect it, and what you can ask us to do with it.',
    sections: [
      section(
        'What we collect',
        'When you place an order we collect your name, delivery and billing address, email address and phone number. Payment card details are handled by our payment processor and never reach our servers.',
        'When you browse we collect basic analytics: pages viewed, approximate location from your IP address, and device type.',
      ),
      section(
        'Why we collect it',
        'To fulfil your order, to answer your questions, to prevent fraud, and — only if you have opted in — to send you email about new products and offers. We do not sell your data.',
      ),
      section(
        'Cookies',
        'Essential cookies keep your cart and preferences working and cannot be turned off. Analytics and marketing cookies are optional and can be changed at any time from the cookie banner.',
      ),
      section(
        'Your rights',
        'You can ask for a copy of the data we hold on you, ask us to correct it, or ask us to delete it. Email privacy@pureaura.example and we will respond within 30 days.',
      ),
    ],
  },

  'refund-policy': {
    title: 'Return & Refund',
    kind: 'policy',
    updated: 'January 2026',
    intro: 'Thirty days to change your mind, sixty if the formula does not agree with your skin.',
    sections: [
      section(
        'Unopened products',
        'Return any unopened product within 30 days of delivery for a full refund, including what you paid for standard shipping.',
      ),
      section(
        'Opened products',
        'Skincare is personal, and a formula that suits one person can irritate another. If you have opened a product and it does not agree with your skin, you can return it once within 60 days for a refund or exchange.',
      ),
      section(
        'How to start a return',
        'Email returns@pureaura.example with your order number and which items you are sending back. We will send a prepaid label. Refunds are issued to the original payment method within five working days of the parcel reaching us.',
      ),
      section(
        'Exceptions',
        'Gift cards and items marked final sale cannot be returned. Sets must be returned complete.',
      ),
    ],
  },

  'terms-of-service': {
    title: 'Terms & Conditions',
    kind: 'policy',
    updated: 'January 2026',
    intro: 'The agreement between you and Pure Aura when you use this site or buy from it.',
    sections: [
      section(
        'Using this site',
        'By browsing or ordering you agree to these terms. You must be at least 16 years old to place an order, and the details you give us must be accurate.',
      ),
      section(
        'Orders and pricing',
        'An order is an offer to buy. It is accepted when we email you a dispatch confirmation. If an item is priced incorrectly we will contact you before charging you, and you may cancel.',
      ),
      section(
        'Product information',
        'We describe our products as accurately as we can, but nothing on this site is medical advice. Patch test new products, and speak to a professional about a persistent skin concern.',
      ),
      section(
        'Liability',
        'Nothing here limits our liability for death, personal injury or fraud caused by our negligence. Otherwise our liability for any order is limited to what you paid for it.',
      ),
    ],
  },

  // ── Company pages ───────────────────────────────────────────────────────────────────
  'about-us': {
    title: 'About us',
    accent: 'us',
    kind: 'page',
    intro: 'Pure Aura started with a simple frustration: skincare that promised the world and listed everything except what was actually in it.',
    sections: [
      section(
        'Why we exist',
        'We make a small range of formulas that do what they say, in concentrations that are printed on the box. No twelve-step routine, no miracle claims, no ingredient list you need a chemistry degree to read.',
        'Every formula is developed with a working cosmetic chemist and tested on people, never on animals.',
      ),
      section(
        'How we make things',
        'We work in small batches so nothing sits in a warehouse losing potency. Our actives are sourced from suppliers who can tell us where they came from, and our packaging is refillable wherever the formula allows it.',
      ),
      section(
        'Where we are going',
        'We are working toward refills for the whole range by the end of next year, and toward publishing the full percentage breakdown of every formula, not just the headline actives.',
      ),
    ],
  },

  'our-promises': {
    title: 'Our Promises',
    accent: 'Promises',
    kind: 'page',
    intro: 'Four things we will not compromise on, and what you can hold us to.',
    sections: [
      section(
        'Cruelty-free, always',
        'We do not test on animals, and we do not sell into markets that require animal testing as a condition of entry. Our suppliers are held to the same standard.',
      ),
      section(
        'Honest concentrations',
        'If a product says 10% vitamin C, it contains 10% vitamin C. The ingredient bar on every product page shows the actives and their percentage of the total formula.',
      ),
      section(
        'Refillable where we can',
        'Glass and aluminium containers are designed to be refilled. Bring empties back to any stockist and we will recycle what we cannot reuse.',
      ),
      section(
        'A real returns policy',
        'Thirty days on anything unopened. Sixty days if a formula does not agree with your skin, even if you have used it. We cover return shipping.',
      ),
    ],
  },

  'promotion-programs': {
    title: 'Promotion programs',
    accent: 'programs',
    kind: 'page',
    intro: 'Ways to save, and ways to earn if you share what you love.',
    sections: [
      section(
        'Refer a friend',
        'Give a friend 15% off their first order and get Rs 4,200 credit when it ships. There is no cap on how many people you can refer.',
      ),
      section(
        'Aura Circle rewards',
        'Earn a point for every Rs 100 spent, plus bonus points for reviews and for returning empties. 500 points is Rs 7,000 off. Points never expire while your account is active.',
      ),
      section(
        'Subscribe and save',
        'Put any staple on a repeating order and save 15% every time, with free standard shipping. Skip, pause or cancel from your account whenever you like.',
      ),
      section(
        'Students and key workers',
        'Verify once and get 20% off every order. Verification is handled by our partner and takes about a minute.',
      ),
    ],
  },

  // ── Nav pages ───────────────────────────────────────────────────────────────────────
  templates: {
    title: 'Routines',
    accent: 'Routines',
    kind: 'page',
    intro: 'Ready-made routines built around a concern, a time of day, or how much time you actually have.',
    sections: [
      section(
        'Start with the three-step',
        'Cleanse, treat, protect. If you do nothing else, do these three consistently — consistency beats complexity every time.',
      ),
      section(
        'Layer by weight',
        'Thinnest to thickest: toner, then serum, then moisturiser, then oil or balm. Sunscreen always goes last in the morning.',
      ),
      section(
        'Introduce one thing at a time',
        'Give a new active two weeks on its own before adding another. If something stings beyond the first minute, stop using it.',
      ),
    ],
  },

  presets: {
    title: 'Collections',
    accent: 'Collections',
    kind: 'page',
    intro: 'Our range, grouped the way people actually shop it.',
    sections: [
      section(
        'Skin care',
        'Cleansers, toners, serums and moisturisers for every skin type, from barrier repair to brightening.',
      ),
      section(
        'Make up',
        'Skin-first colour that wears like nothing at all — tints, balms and a palette that blends without effort.',
      ),
      section(
        'Body care',
        'Washes, oils and lotions for the rest of you, in the same formulas and the same concentrations.',
      ),
    ],
  },

  'b2b-features': {
    title: 'B2B Features',
    accent: 'Features',
    kind: 'page',
    intro: 'Stock Pure Aura in your salon, spa or store, or order at volume for your team.',
    sections: [
      section(
        'Wholesale pricing',
        'Tiered trade pricing from 12 units, with better rates as volume grows. Opening orders start at Rs 140,000 and there is no ongoing minimum.',
      ),
      section(
        'Bulk and corporate orders',
        'Gifting for staff or clients, with optional custom printed packaging and a message card. Lead time is two weeks for printed orders.',
      ),
      section(
        'Training and materials',
        'Every stockist gets product training for their team, printed ingredient cards, and testers refreshed each quarter at no cost.',
      ),
      section(
        'How to apply',
        'Send us your business name, location and the range you are interested in through the contact page, and our trade team will come back within two working days.',
      ),
    ],
  },
  wholesale: {
    title: 'Wholesale Pricing',
    accent: 'Pricing',
    kind: 'page',
    intro: 'Trade terms for salons, spas, pharmacies and independent retailers.',
    sections: [
      section(
        'Trade tiers',
        'Pricing steps down as volume goes up: 40% off retail from 12 units, 45% from 48 units, and 50% from 144 units. Tiers are assessed per order, not per year, so a big order is rewarded straight away.',
      ),
      section(
        'Opening and reorders',
        'Opening orders start at Rs 140,000 and can mix the whole range. After that there is no minimum and no obligation to reorder on any schedule.',
      ),
      section(
        'Payment terms',
        'First order is paid up front. After two settled orders you can apply for 30-day terms. We invoice on dispatch, not on order.',
      ),
      section(
        'What is included',
        'Testers for every product you stock, refreshed quarterly at no charge, printed ingredient cards for your counter, and product training for your team.',
      ),
      section(
        'Apply',
        'Send your business name, location and the range you are interested in through the contact page. Our trade team replies within two working days.',
      ),
    ],
  },

  'bulk-orders': {
    title: 'Bulk Orders',
    accent: 'Orders',
    kind: 'page',
    intro: 'Corporate gifting, event favours and team orders, with optional custom packaging.',
    sections: [
      section(
        'How it works',
        'Tell us the quantity, the budget per head and the date you need it by. We will come back with two or three options from the range and a firm quote.',
      ),
      section(
        'Custom packaging',
        'Printed outer boxes and a message card are available from 50 units. Artwork is due two weeks before dispatch; we will send a proof before anything is printed.',
      ),
      section(
        'Lead times',
        'Two weeks for printed orders, five working days for standard packaging. Rush orders are sometimes possible — ask and we will be straight with you.',
      ),
      section(
        'Pricing',
        'Bulk pricing starts at 25% off retail from 50 units and is quoted individually above 250. Custom printing is charged at cost.',
      ),
      section(
        'Get a quote',
        'Use the contact page and choose “Wholesale and stockists”, or email trade@pureaura.example with your requirements.',
      ),
    ],
  },
}

export const faqs = [
  {
    id: 'patch-test',
    question: 'How should I patch test a new product?',
    answer:
      'Apply a small amount to the inside of your forearm for three consecutive days. If there is no redness or itching, it is safe to use on your face. Do this whenever you introduce a new active.',
  },
  {
    id: 'order-change',
    question: 'Can I change or cancel my order?',
    answer:
      'If it has not shipped yet, yes — email us with your order number as soon as you can. Once you have had a dispatch confirmation it is on its way, but you can still return it under our 30-day policy.',
  },
  {
    id: 'shipping-time',
    question: 'How long will delivery take?',
    answer:
      'Standard delivery is 3-5 working days and is free over Rs 28,000. Express is next working day if you order before 2pm. You will get tracking by email as soon as it leaves us.',
  },
  {
    id: 'pregnancy',
    question: 'Which products are safe during pregnancy?',
    answer:
      'Most of our range is, but we would rather you checked with your midwife or doctor than took our word for it. The full ingredient list is on every product page to make that conversation easier.',
  },
  {
    id: 'vegan',
    question: 'Are your products vegan and cruelty-free?',
    answer:
      'Everything we make is cruelty-free, and the vast majority is vegan. Products containing beeswax or honey are marked on the product page — use the Tags filter on the shop page to see only vegan formulas.',
  },
  {
    id: 'refills',
    question: 'Do you offer refills?',
    answer:
      'For part of the range today, and we are working toward the whole range. Bring empties back to any stockist and we will recycle whatever we cannot reuse.',
  },
  {
    id: 'expiry',
    question: 'How long does a product last once opened?',
    answer:
      'Look for the small open-jar symbol on the box — it shows the number of months the formula stays at full strength after opening. For most of our range that is 12 months.',
  },
  {
    id: 'contact',
    question: 'How do I get in touch?',
    answer:
      'Use the contact page and we will reply within one working day. For anything about an existing order, include the order number so we can look it up first.',
  },
]
