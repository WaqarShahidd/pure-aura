import SectionHeading from '../../Common/SectionHeading/SectionHeading'
import Breadcrumb from '../../Common/Breadcrumb/Breadcrumb'
import { ROUTES } from '../../../config/routes'

export default function CollectionHero({ collection }) {
  return (
    <section>
      <div className="mx-auto max-w-7xl px-6 py-16 text-center md:px-10">
        <SectionHeading size="lg">{collection.title}</SectionHeading>
        {collection.description && (
          <p className="mx-auto mt-4 max-w-xl text-sm text-text-muted">{collection.description}</p>
        )}
      </div>

      <div className="border-y border-charcoal/10 bg-cream py-4">
        <Breadcrumb
          items={[
            { label: 'Home', href: ROUTES.home },
            { label: collection.title },
          ]}
        />
      </div>
    </section>
  )
}
