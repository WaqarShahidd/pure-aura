import CloseIcon from '@mui/icons-material/Close'
import { useCartCopy } from '../../../data/useContent'

export default function CartHeader({ count, onClose }) {
  const copy = useCartCopy()

  return (
    <div className="flex items-center justify-between border-b border-charcoal/10 px-5 py-4">
      <h2 className="flex items-center gap-2 text-lg font-medium">
        {copy.title}
        {count > 0 && (
          <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-charcoal px-2 text-xs text-white">
            {count}
          </span>
        )}
      </h2>
      <button
        type="button"
        aria-label="Close cart"
        onClick={onClose}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-charcoal/10 transition-colors hover:bg-charcoal/20"
      >
        <CloseIcon fontSize="small" />
      </button>
    </div>
  )
}
