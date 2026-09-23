import { Link } from 'react-router-dom'
import Marquee from '../../Common/Marquee/Marquee'
import Button from '../../Common/Button/Button'
import { ROUTES } from '../../../config/routes'

import AccentText from '../../Common/AccentText/AccentText'

// The copy that shipped before the CMS. Used while the homepage request is in flight and
// whenever a field has not been filled in, so the band never renders half-empty.
const FALLBACK = {
  marqueeItems: ['Organic', 'Award-Winning', 'Plant-Powered'],
  marqueeSpeed: 22,
  eyebrow: '2 minutes · 4 questions',
  heading: { text: 'Find Your Ultimate Glow Routine', accent: 'Glow' },
  body:
    "Let's get to know you with 4 honest questions. We'll analyse the responses " +
    'and recommend the stack that fits your day.',
  cta: { label: 'Start the Quiz', href: ROUTES.quiz },
  disclaimer: {
    prefix: '*By clicking you are accepting our',
    linkLabel: 'Privacy policy',
    href: ROUTES.privacy,
  },
}

export default function MarqueeQuizBanner({ content }) {
  const copy = { ...FALLBACK, ...(content ?? {}) }

  return (
    <section>
      <div className="bg-olive py-6">
        <Marquee items={copy.marqueeItems} speed={copy.marqueeSpeed} />
      </div>

      <div className="bg-sage px-6 py-20 text-center md:px-10">
        <p className="text-sm uppercase tracking-wide text-text-muted">{copy.eyebrow}</p>
        <h2 className="mt-3 text-3xl font-medium md:text-4xl">
          <AccentText text={copy.heading?.text} accent={copy.heading?.accent} />
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm text-text-muted">{copy.body}</p>

        <div className="mt-8 flex justify-center">
          <Button variant="solid-dark" to={copy.cta.href} className="uppercase tracking-wide">
            {copy.cta.label}
          </Button>
        </div>

        <p className="mt-3 text-xs text-text-muted">
          {copy.disclaimer.prefix}{' '}
          <Link to={copy.disclaimer.href} className="underline">
            {copy.disclaimer.linkLabel}
          </Link>
        </p>
      </div>
    </section>
  )
}
