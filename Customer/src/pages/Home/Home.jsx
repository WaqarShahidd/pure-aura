import HeroVideoBanner from '../../components/Home/HeroVideoBanner/HeroVideoBanner'
import FavoritesShowcase from '../../components/Home/FavoritesShowcase/FavoritesShowcase'
import MarqueeQuizBanner from '../../components/Home/MarqueeQuizBanner/MarqueeQuizBanner'
import RoutineSteps from '../../components/Home/RoutineSteps/RoutineSteps'

export default function Home() {
  return (
    <>
      <HeroVideoBanner />
      <FavoritesShowcase />
      <MarqueeQuizBanner />
      <RoutineSteps />
    </>
  )
}
