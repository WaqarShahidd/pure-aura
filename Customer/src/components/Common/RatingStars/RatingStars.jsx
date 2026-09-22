import StarIcon from '@mui/icons-material/Star'
import StarBorderIcon from '@mui/icons-material/StarBorder'

export default function RatingStars({ rating = 0, count, max = 5 }) {
  return (
    <div className="flex items-center gap-1 text-accent">
      {Array.from({ length: max }, (_, index) =>
        index < Math.round(rating) ? (
          <StarIcon key={index} fontSize="inherit" />
        ) : (
          <StarBorderIcon key={index} fontSize="inherit" />
        ),
      )}
      {typeof count === 'number' && (
        <span className="ml-1 text-xs text-text-muted">({count})</span>
      )}
    </div>
  )
}
