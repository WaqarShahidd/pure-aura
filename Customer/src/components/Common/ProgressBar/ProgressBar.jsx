import { cn } from '../../../utils/classNames'

// Hand-rolled rather than MUI LinearProgress: no `!` prefix needed for colours, and it dodges
// the theme's global borderRadius of 999 entirely. Used by the free-shipping meter and the
// product page's ingredient percentages.
export default function ProgressBar({ value = 0, label, valueLabel, tone = 'dark', className }) {
  const pct = Math.max(0, Math.min(1, value)) * 100

  return (
    <div className={className}>
      {(label || valueLabel) && (
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="text-charcoal">{label}</span>
          <span className="text-text-muted">{valueLabel}</span>
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
        className="h-1.5 w-full overflow-hidden rounded-full bg-charcoal/10"
      >
        <div
          style={{ width: `${pct}%` }}
          className={cn(
            'h-full rounded-full transition-[width] duration-300',
            tone === 'dark' ? 'bg-charcoal' : 'bg-accent',
          )}
        />
      </div>
    </div>
  )
}
