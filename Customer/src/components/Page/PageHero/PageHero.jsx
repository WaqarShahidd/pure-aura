import SectionHeading, { Accent } from '../../Common/SectionHeading/SectionHeading'
import Breadcrumb from '../../Common/Breadcrumb/Breadcrumb'
import { ROUTES } from '../../../config/routes'

// Shared top-of-page block for every static page: title with an optional italic accent word,
// a short intro, and a breadcrumb bar.
//
// `accent` must be the trailing word(s) of `title` — it marks which part of the title gets the
// serif italic. Anything else is ignored rather than appended, so a mismatch shows the plain
// title instead of duplicating a word.
export default function PageHero({ title, accent, intro, crumbs = [] }) {
  const hasAccent = Boolean(accent) && title.endsWith(accent)
  const lead = hasAccent ? title.slice(0, -accent.length) : title

  return (
    <section>
      <div className="mx-auto max-w-3xl px-6 py-16 text-center md:px-10">
        <SectionHeading size="lg">
          {lead}
          {hasAccent && <Accent>{accent}</Accent>}
        </SectionHeading>
        {intro && <p className="mt-5 text-sm leading-relaxed text-text-muted">{intro}</p>}
      </div>

      <div className="border-y border-charcoal/10 bg-cream py-4">
        <Breadcrumb items={[{ label: 'Home', href: ROUTES.home }, ...crumbs, { label: title }]} />
      </div>
    </section>
  )
}
