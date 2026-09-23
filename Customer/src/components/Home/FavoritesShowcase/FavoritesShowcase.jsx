import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import SectionHeading from '../../Common/SectionHeading/SectionHeading'
import AccentText from '../../Common/AccentText/AccentText'
import CategoryPills from '../../Common/CategoryPills/CategoryPills'
import ProductCard from '../../Common/ProductCard/ProductCard'
import ProductCardSkeleton from '../../Common/Skeleton/ProductCardSkeleton'
import Skeleton from '../../Common/Skeleton/Skeleton'
import { EMPTY, favoriteCategoriesOf, useFavorites } from '../../../data/useCatalog'
import { featuredProduct } from './products.data'

// Each category carries exactly three favourites, so the 4-column row (promo tile + 3 cards)
// stays full whichever pill is active.
//
// The category list used to be computed at module scope, which ran at import time and
// seeded useState directly. With the data arriving asynchronously that is no longer
// possible, and the fix is better anyway: the active category is DERIVED from what the
// user picked plus whatever loaded, rather than stored. No effect syncing state to data,
// and no flash of an empty pill row before the first category exists.
//
// The copy still lives here rather than coming from the API. Moving it into the homepage
// CMS is a later phase; this one only changes where the PRODUCTS come from, so that the
// before/after screenshots isolate a single variable.
const COPY = {
  bandHeading: {
    // Double-quoted for the apostrophe. The JSX this replaced wrote it as &apos;, which
    // renders as a straight quote, so a curly one here would be a visible change.
    text: "Own your Glow. Feeling confident in the skin you're in.",
    accent: 'Glow',
  },
  sectionHeading: { text: 'Our favorite.', accent: 'favorite' },
}

export default function FavoritesShowcase({ content = COPY }) {
  const { data: favorites = EMPTY, isPending } = useFavorites()
  const [chosen, setChosen] = useState(null)

  const categories = useMemo(() => favoriteCategoriesOf(favorites), [favorites])
  const activeCategory = chosen ?? categories[0]

  const visible = useMemo(
    () => favorites.filter((product) => product.category === activeCategory),
    [favorites, activeCategory],
  )

  const bandHeading = content?.bandHeading
  const sectionHeading = content?.sectionHeading
  const promo = content?.promoTile ?? featuredProduct

  return (
    <section>
      <div className="bg-sage px-6 py-14 text-center md:px-10">
        <SectionHeading as="p" size="lg" className="mx-auto max-w-4xl">
          <AccentText text={bandHeading?.text} accent={bandHeading?.accent} />
        </SectionHeading>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-16 md:px-10">
        <div className="mb-8 text-center">
          <SectionHeading size="md">
            <AccentText text={sectionHeading?.text} accent={sectionHeading?.accent} />
          </SectionHeading>
        </div>

        <div className="mb-10">
          {isPending ? (
            <div className="flex justify-center gap-3">
              {Array.from({ length: 3 }, (_, index) => (
                <Skeleton key={index} className="h-9 w-28" rounded="rounded-full" />
              ))}
            </div>
          ) : (
            <CategoryPills options={categories} active={activeCategory} onChange={setChosen} />
          )}
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
          <Link
            to={promo.href}
            className="relative overflow-hidden rounded-2xl bg-sage md:col-span-1"
          >
            {promo.image && (
              <img src={promo.image} alt={promo.title} className="h-full w-full object-cover" />
            )}
            <div className="absolute bottom-4 left-4 text-white">
              <p className="text-sm font-medium drop-shadow">{promo.discountLabel}</p>
              <p className="text-lg font-semibold drop-shadow">{promo.title}</p>
            </div>
          </Link>

          {isPending
            ? Array.from({ length: 3 }, (_, index) => <ProductCardSkeleton key={index} />)
            : visible.map((product) => <ProductCard key={product.id} {...product} />)}
        </div>
      </div>
    </section>
  )
}
