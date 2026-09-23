import HeroVideoBanner from '../../components/Home/HeroVideoBanner/HeroVideoBanner'
import FavoritesShowcase from '../../components/Home/FavoritesShowcase/FavoritesShowcase'
import MarqueeQuizBanner from '../../components/Home/MarqueeQuizBanner/MarqueeQuizBanner'
import RoutineSteps from '../../components/Home/RoutineSteps/RoutineSteps'
import { useHomepage } from '../../data/useContent'

// The section set and its ORDER are fixed in code - that was the decision, rather than a
// drag-to-reorder builder. What the admin controls is each section's content and whether
// it appears at all, so this maps the API's enabled sections onto a registry of the four
// components that can render them.
//
// A key the registry does not know is skipped rather than thrown on: the database should
// never contain one, but a storefront that white-screens because someone added a row is a
// worse failure than a missing section.
const SECTIONS = {
  hero: HeroVideoBanner,
  favorites: FavoritesShowcase,
  marquee_quiz: MarqueeQuizBanner,
  routine_steps: RoutineSteps,
}

export default function Home() {
  const { data: sections, isPending } = useHomepage()

  // While loading, render the sections with no content: each one falls back to the copy
  // it shipped with, so the page looks right immediately instead of flashing empty.
  if (isPending || !sections) {
    return (
      <>
        <HeroVideoBanner />
        <FavoritesShowcase />
        <MarqueeQuizBanner />
        <RoutineSteps />
      </>
    )
  }

  return (
    <>
      {sections.map(({ key, content }) => {
        const Section = SECTIONS[key]
        return Section ? <Section key={key} content={content} /> : null
      })}
    </>
  )
}
