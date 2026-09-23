import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import { cn } from '../../../utils/classNames'

// Renders nothing for a single page, so a small collection looks exactly as it did before
// pagination existed.
//
// Long ranges collapse to first / neighbours / last with ellipses, because a shop with two
// hundred products would otherwise print forty numbered buttons across the footer.
function pagesToShow(page, pageCount) {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, index) => index + 1)

  const pages = new Set([1, pageCount, page, page - 1, page + 1])
  const sorted = [...pages].filter((value) => value >= 1 && value <= pageCount).sort((a, b) => a - b)

  const withGaps = []
  for (const [index, value] of sorted.entries()) {
    if (index > 0 && value - sorted[index - 1] > 1) withGaps.push('gap')
    withGaps.push(value)
  }

  return withGaps
}

export default function Pagination({ page, pageCount, onChange, className }) {
  if (pageCount <= 1) return null

  const go = (next) => {
    if (next < 1 || next > pageCount || next === page) return
    onChange(next)
    // The grid is below the fold after a page change; without this the customer lands
    // halfway down a fresh set of products.
    window.scrollTo({ top: 0, behavior: 'auto' })
  }

  return (
    <nav
      aria-label="Pagination"
      className={cn('mt-12 flex items-center justify-center gap-2', className)}
    >
      <button
        type="button"
        onClick={() => go(page - 1)}
        disabled={page === 1}
        aria-label="Previous page"
        className="flex h-9 w-9 items-center justify-center rounded-full border border-charcoal/15 disabled:opacity-40"
      >
        <ChevronLeftIcon fontSize="small" />
      </button>

      {pagesToShow(page, pageCount).map((value, index) =>
        value === 'gap' ? (
          <span key={`gap-${index}`} className="px-1 text-sm text-text-muted">
            …
          </span>
        ) : (
          <button
            key={value}
            type="button"
            onClick={() => go(value)}
            aria-current={value === page ? 'page' : undefined}
            className={cn(
              'h-9 min-w-9 rounded-full px-3 text-sm transition-colors',
              value === page
                ? 'bg-charcoal text-white'
                : 'border border-charcoal/15 text-charcoal hover:bg-sage',
            )}
          >
            {value}
          </button>
        ),
      )}

      <button
        type="button"
        onClick={() => go(page + 1)}
        disabled={page === pageCount}
        aria-label="Next page"
        className="flex h-9 w-9 items-center justify-center rounded-full border border-charcoal/15 disabled:opacity-40"
      >
        <ChevronRightIcon fontSize="small" />
      </button>
    </nav>
  )
}
