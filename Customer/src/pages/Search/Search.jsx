import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import PageHero from '../../components/Page/PageHero/PageHero'
import ProductGrid from '../../components/Collection/ProductGrid/ProductGrid'
import TextField from '../../components/Common/TextField/TextField'
import EmptyState from '../../components/Common/EmptyState/EmptyState'
import { getAllProducts } from '../../data/catalog'
import { searchProducts } from '../../utils/searchProducts'

export default function Search() {
  const [params, setParams] = useSearchParams()
  const query = params.get('q') ?? ''

  const results = useMemo(
    () => (query ? searchProducts(getAllProducts(), query) : []),
    [query],
  )

  const onChange = (event) => {
    const next = event.target.value
    // `replace` keeps typing out of the history stack.
    setParams(next ? { q: next } : {}, { replace: true })
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
          <ProductGrid products={results} />
        )}
      </section>
    </>
  )
}
