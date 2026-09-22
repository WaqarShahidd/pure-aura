import { useCallback, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import CollectionHero from '../../components/Collection/CollectionHero/CollectionHero'
import CategoryCards from '../../components/Collection/CategoryCards/CategoryCards'
import FilterBar from '../../components/Collection/FilterBar/FilterBar'
import ProductGrid from '../../components/Collection/ProductGrid/ProductGrid'
import NotFound from '../NotFound/NotFound'
import { getCollectionByHandle, getProductsByCollection } from '../../data/catalog'
import { FILTER_DEFS, DEFAULT_SORT } from '../../config/filters'
import { ALL_COLLECTION } from '../../config/routes'
import {
  applyFilters,
  buildFacets,
  sortProducts,
  toggleFilterValue,
} from '../../utils/productFilters'

// Pages stay free of markup beyond composing sections, but routing-derived and cross-section
// state lives here — the filter bar and the grid both need it.
export default function Collection() {
  const { handle = ALL_COLLECTION } = useParams()
  const collection = getCollectionByHandle(handle)

  const [active, setActive] = useState({})
  const [sortId, setSortId] = useState(DEFAULT_SORT)
  const [view, setView] = useState('grid')
  const [filtersOpen, setFiltersOpen] = useState(true)

  // Clear selections when moving between collections — a filter value from the old one may not
  // even exist in the new set. Done during render rather than in an effect.
  const [lastHandle, setLastHandle] = useState(handle)
  if (handle !== lastHandle) {
    setLastHandle(handle)
    setActive({})
  }

  const base = useMemo(() => getProductsByCollection(handle), [handle])
  const facets = useMemo(() => buildFacets(base, FILTER_DEFS), [base])
  const results = useMemo(
    () => sortProducts(applyFilters(base, active, FILTER_DEFS), sortId),
    [base, active, sortId],
  )

  const handleToggle = useCallback((filterId, value) => {
    setActive((current) => toggleFilterValue(current, filterId, value))
  }, [])

  const handleClear = useCallback((filterId) => {
    setActive((current) => {
      const next = { ...current }
      delete next[filterId]
      return next
    })
  }, [])

  const handleClearAll = useCallback(() => setActive({}), [])

  if (!collection) return <NotFound />

  return (
    <>
      <CollectionHero collection={collection} />
      <CategoryCards />

      <section className="mx-auto max-w-7xl px-6 py-12 md:px-10">
        <FilterBar
          resultCount={results.length}
          filtersOpen={filtersOpen}
          onToggleFilters={() => setFiltersOpen((prev) => !prev)}
          view={view}
          onViewChange={setView}
          sortId={sortId}
          onSortChange={setSortId}
          facets={facets}
          active={active}
          onToggle={handleToggle}
          onClear={handleClear}
          onClearAll={handleClearAll}
        />

        <div className="mt-12">
          <ProductGrid products={results} view={view} onClearFilters={handleClearAll} />
        </div>
      </section>
    </>
  )
}
