import CheckIcon from '@mui/icons-material/Check'
import { CHECKOUT_STEPS } from '../../../config/checkout'
import { cn } from '../../../utils/classNames'

export default function CheckoutSteps({ currentIndex, onGoTo }) {
  return (
    <ol className="flex flex-wrap items-center gap-x-3 gap-y-2">
      {CHECKOUT_STEPS.map((step, index) => {
        const done = index < currentIndex
        const active = index === currentIndex

        return (
          <li key={step.id} className="flex items-center gap-3">
            <button
              type="button"
              disabled={!done}
              onClick={() => done && onGoTo(index)}
              className={cn(
                'flex items-center gap-2 text-sm transition-colors',
                active && 'font-semibold text-charcoal',
                done && 'text-charcoal hover:text-accent',
                !active && !done && 'text-text-muted',
              )}
            >
              <span
                className={cn(
                  'flex h-6 w-6 items-center justify-center rounded-full text-xs',
                  done && 'bg-olive text-white',
                  active && 'bg-charcoal text-white',
                  !active && !done && 'border border-charcoal/25',
                )}
              >
                {done ? <CheckIcon sx={{ fontSize: 14 }} /> : index + 1}
              </span>
              {step.label}
            </button>

            {index < CHECKOUT_STEPS.length - 1 && (
              <span aria-hidden="true" className="text-charcoal/25">
                —
              </span>
            )}
          </li>
        )
      })}
    </ol>
  )
}
