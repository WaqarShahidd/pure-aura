import { Link } from 'react-router-dom'
import ImagePlaceholder from '../../Common/ImagePlaceholder/ImagePlaceholder'
import { getFeaturedCollections } from '../../../data/catalog'
import { collectionPath } from '../../../config/routes'

// The row of image cards above the filter bar, each with a white pill label at its foot.
export default function CategoryCards() {
  const cards = getFeaturedCollections()

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
