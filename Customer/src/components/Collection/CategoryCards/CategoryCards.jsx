import { Link } from 'react-router-dom'
import ImagePlaceholder from '../../Common/ImagePlaceholder/ImagePlaceholder'
import Skeleton from '../../Common/Skeleton/Skeleton'
import { EMPTY, useFeaturedCollections } from '../../../data/useCatalog'
import { collectionPath } from '../../../config/routes'

// The row of image cards above the filter bar, each with a white pill label at its foot.
export default function CategoryCards() {
  const { data: cards = EMPTY, isPending } = useFeaturedCollections()

  // Four tiles either way, so the row never collapses and reflows when they arrive.
  if (isPending) {
    return (
      <div className="mx-auto max-w-7xl px-6 pt-12 md:px-10">
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} tone="tile" className="aspect-[4/3] w-full" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-6 pt-12 md:px-10">
      <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
        {cards.map((card) => (
          <Link key={card.handle} to={collectionPath(card.handle)} className="group block">
            <ImagePlaceholder
              src={card.image}
              alt={card.title}
              seed={card.handle}
              aspect="landscape"
            >
              <div className="absolute inset-x-0 bottom-4 flex justify-center">
                <span className="rounded-full bg-white px-5 py-2.5 text-sm font-medium text-charcoal shadow-sm transition-transform group-hover:scale-105">
                  {card.cardLabel}
                </span>
              </div>
            </ImagePlaceholder>
          </Link>
        ))}
      </div>
    </div>
  )
}
