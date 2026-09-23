import Skeleton from '../Common/Skeleton/Skeleton'

// Matches the PDP's two-column split so the page does not jump when the product lands.
export default function ProductDetailSkeleton() {
  return (
    <>
      <div className="border-b border-charcoal/10 bg-cream py-4">
        <div className="mx-auto max-w-7xl px-6 md:px-10">
          <Skeleton className="h-4 w-64" rounded="rounded-full" />
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-6 py-12 md:grid-cols-2 md:px-10">
        <Skeleton tone="tile" className="aspect-square w-full" />

        <div className="space-y-4">
          <Skeleton className="h-8 w-3/4" rounded="rounded-full" />
          <Skeleton className="h-4 w-1/2" rounded="rounded-full" />
          <Skeleton className="h-6 w-32" rounded="rounded-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-12 w-full" rounded="rounded-full" />
          <Skeleton className="h-12 w-full" rounded="rounded-full" />
        </div>
      </div>
    </>
  )
}
