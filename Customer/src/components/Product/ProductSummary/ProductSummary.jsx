import RatingStars from '../../Common/RatingStars/RatingStars'
import PriceTag from '../../Common/PriceTag/PriceTag'
import { cn } from '../../../utils/classNames'

export default function ProductSummary({ product }) {
  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-2xl font-medium md:text-3xl">{product.title}</h1>
      {product.subtitle && <p className="text-sm text-text-muted">{product.subtitle}</p>}

      <RatingStars rating={product.rating} count={product.reviewCount} />
      <PriceTag price={product.price} compareAtPrice={product.compareAtPrice} size="lg" />

      <p className="flex items-center gap-2 text-sm">
        <span
          className={cn(
            'h-2 w-2 rounded-full',
            product.inStock ? 'bg-olive' : 'bg-charcoal/30',
          )}
        />
        <span className="text-text-muted">{product.stockLabel}</span>
      </p>
    </div>
  )
}
