import EnergySavingsLeafIcon from '@mui/icons-material/EnergySavingsLeaf'
import { Link } from 'react-router-dom'
import Badge from '../Badge/Badge'
import RatingStars from '../RatingStars/RatingStars'
import PriceTag from '../PriceTag/PriceTag'
import ImagePlaceholder from '../ImagePlaceholder/ImagePlaceholder'
import { productPath } from '../../../config/routes'
import { cn } from '../../../utils/classNames'

// Called as <ProductCard key={p.id} {...p} /> — every prop is optional so spreading a whole
// product record (which carries many more fields than these) stays safe.
export default function ProductCard({
  handle,
  image,
  badge,
  crueltyFree = true,
  title,
  rating,
  reviewCount,
  price,
  compareAtPrice,
  layout = 'grid',
  className,
}) {
  const isList = layout === 'list'

  // Only the media and the title link. Wrapping the whole card would swallow clicks on the
  // quick-add button added in a later phase.
  const withLink = (node, extraClass) =>
    handle ? (
      <Link to={productPath(handle)} className={extraClass}>
        {node}
      </Link>
    ) : (
      <div className={extraClass}>{node}</div>
    )

  const media = (
    <ImagePlaceholder src={image} alt={title} seed={handle || title}>
      {badge && (
        <div className="absolute left-3 top-3">
          <Badge tone="dark">{badge}</Badge>
        </div>
      )}
    </ImagePlaceholder>
  )

  return (
    <div className={cn(isList ? 'flex gap-5' : 'flex flex-col gap-3', className)}>
      {withLink(media, isList ? 'w-48 shrink-0' : 'block')}

      <div className={cn('flex flex-col gap-3', isList && 'flex-1 justify-center')}>
        {crueltyFree && (
          <Badge tone="light" className="w-fit">
            <EnergySavingsLeafIcon sx={{ fontSize: 14 }} />
            Cruelty-free
          </Badge>
        )}

        {withLink(<h3 className="text-base font-medium">{title}</h3>, 'block')}

        {typeof rating === 'number' && <RatingStars rating={rating} count={reviewCount} />}

        <PriceTag price={price} compareAtPrice={compareAtPrice} />
      </div>
    </div>
  )
}
