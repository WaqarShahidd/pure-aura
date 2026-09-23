import Skeleton from './Skeleton'

// Mirrors ProductCard's real proportions - square media, then title, rating and price
// lines. A skeleton that is the wrong height makes the grid jump when data arrives, which
// is more distracting than no skeleton at all.
export default function ProductCardSkeleton() {
  return (
    <div>
      <Skeleton tone="tile" className="aspect-square w-full" />
      <div className="mt-4 space-y-2">
        <Skeleton className="h-3 w-3/4" rounded="rounded-full" />
        <Skeleton className="h-3 w-1/3" rounded="rounded-full" />
        <Skeleton className="h-4 w-1/4" rounded="rounded-full" />
      </div>
    </div>
  )
}
