import EnergySavingsLeafIcon from '@mui/icons-material/EnergySavingsLeaf'
import Badge from '../Badge/Badge'
import RatingStars from '../RatingStars/RatingStars'
import { formatPrice } from '../../../utils/formatPrice'

export default function ProductCard({
  image,
  badge,
  crueltyFree = true,
  title,
  rating,
  reviewCount,
  price,
  compareAtPrice,
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-sage">
        {image && (
          <img src={image} alt={title} className="h-full w-full object-cover" />
        )}
        {badge && (
          <div className="absolute left-3 top-3">
            <Badge tone="dark">{badge}</Badge>
          </div>
        )}
      </div>

      {crueltyFree && (
        <Badge tone="light" className="w-fit">
          <EnergySavingsLeafIcon sx={{ fontSize: 14 }} />
          Cruelty-free
        </Badge>
      )}

      <h3 className="text-base font-medium">{title}</h3>

      {typeof rating === 'number' && (
        <RatingStars rating={rating} count={reviewCount} />
      )}

      <div className="flex items-center gap-2">
        {compareAtPrice && (
          <span className="text-sm text-text-muted line-through">
            {formatPrice(compareAtPrice)}
          </span>
        )}
        <span className="text-sm font-semibold text-accent">
          {formatPrice(price)}
        </span>
      </div>
    </div>
  )
}
