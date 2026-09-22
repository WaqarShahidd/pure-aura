import SectionHeading, { Accent } from '../../components/Common/SectionHeading/SectionHeading'
import Button from '../../components/Common/Button/Button'
import { ROUTES } from '../../config/routes'

export default function NotFound() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-24 text-center md:px-10">
      <p className="text-sm uppercase tracking-wide text-text-muted">Error 404</p>
      <SectionHeading size="lg" className="mt-3">
        This page has <Accent>wandered off</Accent>.
      </SectionHeading>
      <p className="mx-auto mt-4 max-w-md text-sm text-text-muted">
        The page you were looking for is not here. It may have moved, or the link may be out of
        date.
      </p>
      <div className="mt-8 flex justify-center">
        <Button variant="solid-dark" to={ROUTES.home}>
          Back to home
        </Button>
      </div>
    </section>
  )
}
