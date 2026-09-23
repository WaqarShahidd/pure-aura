// The four homepage sections, lifted out of the components that hardcode them today.
//
// Two shapes changed on the way into the database, and both changes are deliberate:
//
// 1. Headings were literal JSX - `<>Your skin. <Accent>Glowing.</Accent></>` - which no
//    admin field can produce. They are now { text, accent } where `accent` is a substring
//    of `text`. AccentText finds it with indexOf and renders the whole thing plain when it
//    does not match, so a typo degrades instead of breaking markup. This generalises the
//    contract PageHero already uses (title.endsWith(accent)).
//
// 2. fallbackGradient was a raw Tailwind class string, 'from-[#7a6a5f] to-[#3f342c]'. A
//    class assembled at runtime is invisible to Tailwind's scanner and would never be
//    compiled, so the value is now two colours and the component builds an inline
//    linear-gradient from them.

export const homepageSections = [
  {
    key: 'hero',
    label: 'Hero Video Banner',
    position: 1,
    content: {
      slides: [
        {
          heading: { text: 'Your skin. Glowing.', accent: 'Glowing.' },
          subheading: 'Simple formulas for everyday glow.',
          fallbackGradient: { from: '#7a6a5f', to: '#3f342c' },
          videoMediaKey: null,
          posterMediaKey: 'hero-1',
          primaryCta: { enabled: true, label: 'Find my Match', href: '/pages/quiz' },
          secondaryCta: { enabled: true, label: 'Shop All', href: '/collections/all' },
        },
        {
          heading: { text: 'Smooth skin. Effortlessly', accent: 'Effortlessly' },
          subheading: 'Simple formulas for everyday glow.',
          fallbackGradient: { from: '#8a6a52', to: '#2c2419' },
          videoMediaKey: null,
          posterMediaKey: 'hero-2',
          primaryCta: { enabled: true, label: 'New Arrival', href: '/collections/new-arrivals' },
          secondaryCta: { enabled: true, label: 'Shop All', href: '/collections/all' },
        },
      ],
    },
  },
  {
    key: 'favorites',
    label: 'Favorites Showcase',
    position: 2,
    content: {
      bandHeading: {
        // Double-quoted for the apostrophe: the JSX this replaced wrote it as &apos;,
        // which renders as a straight quote.
        text: "Own your Glow. Feeling confident in the skin you're in.",
        accent: 'Glow',
      },
      sectionHeading: { text: 'Our favorite.', accent: 'favorite' },
      promoTile: {
        title: 'Puff Official',
        discountLabel: 'UP TO 10% OFF',
        mediaKey: 'promo-tile',
        href: '/collections/best-sellers',
      },
    },
  },
  {
    key: 'marquee_quiz',
    label: 'Marquee & Quiz Banner',
    position: 3,
    content: {
      marqueeItems: ['Organic', 'Award-Winning', 'Plant-Powered'],
      marqueeSpeed: 22,
      eyebrow: '2 minutes · 4 questions',
      heading: { text: 'Find Your Ultimate Glow Routine', accent: 'Glow' },
      body:
        "Let's get to know you with 4 honest questions. We'll analyse the responses " +
        'and recommend the stack that fits your day.',
      cta: { label: 'Start the Quiz', href: '/pages/quiz' },
      disclaimer: {
        prefix: '*By clicking you are accepting our',
        linkLabel: 'Privacy policy',
        href: '/policies/privacy-policy',
      },
    },
  },
  {
    key: 'routine_steps',
    label: 'Routine Steps',
    position: 4,
    content: {
      heading: { text: 'How to take care for glowing skin.', accent: 'glowing skin' },
      // The component hardcodes "open the last step" today. Making it an explicit index
      // means an admin can choose, and the intent stops being a magic expression.
      defaultOpenStepIndex: 2,
      steps: [
        {
          label: 'Cleansers',
          mediaKey: 'routine-1',
          description: null,
          cta: { enabled: false, label: '', href: '' },
        },
        {
          label: 'Serums',
          mediaKey: 'routine-2',
          description: null,
          cta: { enabled: false, label: '', href: '' },
        },
        {
          label: 'Toners',
          mediaKey: 'routine-3',
          description:
            'Achieve glowing skin with our toners as part of your skincare routine. ' +
            'Scientifically formulated for optimal results.',
          cta: { enabled: true, label: 'Shop Toners', href: '/collections/toners' },
        },
      ],
    },
  },
]
