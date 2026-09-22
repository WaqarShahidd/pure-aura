import RemoveIcon from '@mui/icons-material/Remove'
import AddIcon from '@mui/icons-material/Add'
import { cn } from '../../../utils/classNames'

const SIZES = {
  sm: { wrap: 'gap-1 px-2 py-1', value: 'w-6 text-xs', icon: 'inherit' },
  md: { wrap: 'gap-3 px-3 py-2.5', value: 'w-8 text-sm', icon: 'small' },
}

export default function QuantityStepper({ value, onChange, min = 1, max = 99, size = 'md', className }) {
  const scale = SIZES[size]

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border border-charcoal/20',
        scale.wrap,
        className,
      )}
    >
      <button
        type="button"
        aria-label="Decrease quantity"
        disabled={value <= min}
        onClick={() => onChange(value - 1)}
        className="flex items-center text-charcoal transition-opacity disabled:opacity-30"
      >
        <RemoveIcon fontSize={scale.icon} />
      </button>

      <span aria-live="polite" className={cn('text-center', scale.value)}>
        {value}
      </span>

      <button
        type="button"
        aria-label="Increase quantity"
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
        className="flex items-center text-charcoal transition-opacity disabled:opacity-30"
      >
        <AddIcon fontSize={scale.icon} />
      </button>
    </div>
  )
}
