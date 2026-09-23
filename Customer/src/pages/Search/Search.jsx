import { useSearchParams } from 'react-router-dom'
import PageHero from '../../components/Page/PageHero/PageHero'
import ProductGrid from '../../components/Collection/ProductGrid/ProductGrid'
import TextField from '../../components/Common/TextField/TextField'
import EmptyState from '../../components/Common/EmptyState/EmptyState'
import ProductGridSkeleton from '../../components/Common/Skeleton/ProductGridSkeleton'
import LoadError from '../../components/Common/LoadError/LoadError'
import { EMPTY, useSearch } from '../../data/useCatalog'

export default function Search() {
  const [params, setParams] = useSearchParams()
  const query = params.get('q') ?? ''

  // Scoring moved to the server, which runs the same weighted algorithm this page used
  // to run locally - same field weights, same every-term-must-match rule, same tie-break.
  const { data: results = EMPTY, isPending, isError, refetch } = useSearch(query)

  const onChange = (event) => {
    const next = event.target.value
    // `replace` keeps typing out of the history stack.
    setParams(next ? { q: next } : {}, { replace: true })
  }

  const renderResults = () => {
    if (isError) return <LoadError onAction={refetch} />
    if (isPending) return <ProductGridSkeleton />
    return <ProductGrid products={results} />
  }

  return (
    <>
      <PageHero
        title="Search"
        intro={query ? `${results.length} result${results.length === 1 ? '' : 's'} for “${query}”` : 'Search the full range by name, ingredient, skin type or texture.'}
      />

      <section className="mx-auto max-w-7xl px-6 py-12 md:px-10">
        <div className="mx-auto mb-12 max-w-xl">
          <TextField
            id="search-input"
            type="search"
            value={query}
            onChange={onChange}
            placeholder="Try “vitamin c”, “dry skin” or “toner”"
            autoFocus
          />
        </div>

        {query === '' ? (
          <EmptyState
            title="Start typing to search"
            body="Results update as you type — no need to press enter."
          />
        ) : (
          renderResults()
        )}
      </section>
    </>
  )
}
