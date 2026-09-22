import { Link } from 'react-router-dom'
import Marquee from '../../Common/Marquee/Marquee'
import Button from '../../Common/Button/Button'
import { ROUTES } from '../../../config/routes'

const MARQUEE_ITEMS = ['Organic', 'Award-Winning', 'Plant-Powered']

export default function MarqueeQuizBanner() {
  return (
    <section>
      <div className="bg-olive py-6">
        <Marquee items={MARQUEE_ITEMS} speed={22} />
      </div>

      <div className="bg-sage px-6 py-20 text-center md:px-10">
        <p className="text-sm uppercase tracking-wide text-text-muted">
          2 minutes &middot; 4 questions
        </p>
        <h2 className="mt-3 text-3xl font-medium md:text-4xl">Find Your Ultimate Glow Routine</h2>
        <p className="mx-auto mt-3 max-w-xl text-sm text-text-muted">
          Let&apos;s get to know you with 4 honest questions. We&apos;ll analyse the responses
          and recommend the stack that fits your day.
        </p>

        <div className="mt-8 flex justify-center">
          <Button variant="solid-dark" to={ROUTES.quiz} className="uppercase tracking-wide">
            Start the Quiz
          </Button>
        </div>

        <p className="mt-3 text-xs text-text-muted">
          *By clicking you are accepting our{' '}
          <Link to={ROUTES.privacy} className="underline">
            Privacy policy
          </Link>
        </p>
      </div>
    </section>
  )
}
