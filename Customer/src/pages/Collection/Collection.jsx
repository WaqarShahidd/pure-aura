import { useCallback, useMemo } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import CollectionHero from '../../components/Collection/CollectionHero/CollectionHero'
import CategoryCards from '../../components/Collection/CategoryCards/CategoryCards'
import FilterBar from '../../components/Collection/FilterBar/FilterBar'
import ProductGrid from '../../components/Collection/ProductGrid/ProductGrid'
import Pagination from '../../components/Collection/Pagination/Pagination'
import ProductGridSkeleton from '../../components/Common/Skeleton/ProductGridSkeleton'
import LoadError from '../../components/Common/LoadError/LoadError'
import NotFound from '../NotFound/NotFound'
import { EMPTY, useCollection, useCollectionProducts, useFilters } from '../../data/useCatalog'
import { ALL_COLLECTION } from '../../config/routes'
import {
  activeFromParams,
  applyFilters,
  buildFacets,
  paramsFromActive,
  sortProducts,
  toggleFilterValue,
} from '../../utils/productFilters'

const PER_PAGE = 24

// Pages stay free of markup beyond composing sections, but routing-derived and cross-section
// state lives here — the filter bar and the grid both need it.
//
// Filter, sort, view and page now live in the QUERY STRING rather than in useState. A
// filtered view is a thing people send each other and bookmark, and previously none of
// that survived: every selection was invisible to the URL and lost on reload.
export default function Collection() {
  const { handle = ALL_COLLECTION } = useParams()
  const [params, setParams] = useSearchParams()

  const collectionQuery = useCollection(handle)
  const productsQuery = useCollectionProducts(handle)
  const filtersQuery = useFilters()

  const defs = filtersQuery.data?.filters ?? EMPTY
  const priceRanges = filtersQuery.data?.priceRanges ?? EMPTY
  const sortOptions = filtersQuery.data?.sortOptions ?? EMPTY

  const active = useMemo(() => activeFromParams(params, defs), [params, defs])
  const sortId = params.get('sort') ?? filtersQuery.data?.defaultSort ?? null
  const view = params.get('view') === 'list' ? 'list' : 'grid'
  const page = Math.max(1, Number(params.get('page')) || 1)
  const filtersOpen = params.get('filters') !== 'closed'

  const base = productsQuery.data ?? EMPTY

  const facets = useMemo(
    () => buildFacets(base, defs, priceRanges),
    [base, defs, priceRanges],
  )

  const results = useMemo(
    () => sortProducts(applyFilters(base, active, defs, priceRanges), sortId, sortOptions),
    [base, active, defs, priceRanges, sortId, sortOptions],
  )

  const pageCount = Math.max(1, Math.ceil(results.length / PER_PAGE))
  // Clamping rather than trusting the parameter: ?page=99 on a two-page collection should
  // show the last page, not an empty grid.
  const currentPage = Math.min(page, pageCount)
  const visible = useMemo(
    () => results.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE),
    [results, currentPage],
  )

  // Writing the whole parameter set each time keeps the URL canonical: no stale `page=3`
  // left behind when a filter change shrinks the result set.
  const commit = useCallback(
    (nextActive, overrides = {}) => {
      const next = paramsFromActive(nextActive, {
        sort: overrides.sort ?? sortId,
        page: overrides.page ?? 1,
        view: overrides.view ?? view,
      })
      if ((overrides.filtersOpen ?? filtersOpen) === false) next.set('filters', 'closed')
      setParams(next, { replace: true })
    },
    [setParams, sortId, view, filtersOpen],
  )

  const handleToggle = useCallback(
    (filterId, value) => commit(toggleFilterValue(active, filterId, value)),
    [active, commit],
  )

  const handleClear = useCallback(
    (filterId) => {
      const next = { ...active }
      delete next[filterId]
      commit(next)
    },
    [active, commit],
  )

  const handleClearAll = useCallback(() => commit({}), [commit])

  // Every hook above has to run before these returns, or the hook order changes between
  // the loading render and the loaded one and React tears the component down.
  if (collectionQuery.isError && collectionQuery.error?.status === 404) return <NotFound />
  if (collectionQuery.isError || productsQuery.isError) {
    return (
      <LoadError
        onAction={() => {
          collectionQuery.refetch()
          productsQuery.refetch()
        }}
      />
    )
  }

  const collection = collectionQuery.data
  const isLoading = collectionQuery.isPending || productsQuery.isPending || filtersQuery.isPending

  return (
    <>
      <CollectionHero collection={collection} />
      <CategoryCards />

      <section className="mx-auto max-w-7xl px-6 py-12 md:px-10">
        <FilterBar
          resultCount={results.length}
          filtersOpen={filtersOpen}
          onToggleFilters={() => commit(active, { filtersOpen: !filtersOpen, page: currentPage })}
          view={view}
          onViewChange={(nextView) => commit(active, { view: nextView, page: currentPage })}
          sortId={sortId}
          onSortChange={(nextSort) => commit(active, { sort: nextSort })}
          sortOptions={sortOptions}
          defs={defs}
          facets={facets}
          active={active}
          onToggle={handleToggle}
          onClear={handleClear}
          onClearAll={handleClearAll}
        />

        <div className="mt-12">
          {isLoading ? (
            <ProductGridSkeleton count={8} />
          ) : (
            <>
              <ProductGrid products={visible} view={view} onClearFilters={handleClearAll} />
              <Pagination
                page={currentPage}
                pageCount={pageCount}
                onChange={(next) => commit(active, { page: next })}
              />
            </>
          )}
        </div>
      </section>
    </>
  )
}
