import { formatPrice } from '../../../utils/formatPrice'
import { cn } from '../../../utils/classNames'

const SIZES = {
  sm: { compare: 'text-xs', price: 'text-sm' },
  md: { compare: 'text-sm', price: 'text-sm' },
  lg: { compare: 'text-base', price: 'text-xl' },
}

// Struck compare-at price beside the current price. Shared by ProductCard, the product page,
// cart lines and the upsell rail so the treatment stays identical everywhere.
export default function PriceTag({ price, compareAtPrice, size = 'md', className }) {
  const scale = SIZES[size]

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {compareAtPrice && (
        <span className={cn('text-text-muted line-through', scale.compare)}>
          {formatPrice(compareAtPrice)}
        </span>
      )}
      <span className={cn('font-semibold text-accent', scale.price)}>{formatPrice(price)}</span>
    </div>
  )
}
