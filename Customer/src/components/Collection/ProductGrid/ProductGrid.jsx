import ProductCard from '../../Common/ProductCard/ProductCard'
import EmptyState from '../../Common/EmptyState/EmptyState'

export default function ProductGrid({ products, view = 'grid', onClearFilters }) {
  if (products.length === 0) {
    return (
      <EmptyState
        title="No products match those filters"
        body="Try removing a filter or two to see more of the range."
        actionLabel="Clear all filters"
        onAction={onClearFilters}
      />
    )
  }

  // One of the two layouts, never both — cn() joins strings without resolving conflicts.
  const layoutClass =
    view === 'list'
      ? 'flex flex-col gap-8'
      : 'grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-3 lg:grid-cols-5'

  return (
    <div className={layoutClass}>
      {products.map((product) => (
        <ProductCard key={product.id} {...product} layout={view} />
      ))}
    </div>
  )
}
