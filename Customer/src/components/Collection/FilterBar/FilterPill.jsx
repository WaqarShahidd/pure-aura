import { useCallback, useRef, useState } from 'react'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import { cn } from '../../../utils/classNames'
import { useDismissable } from '../../../utils/useDismissable'

// One component for all ten filters. `def.type` only changes how a row is drawn — the panel,
// the toggling and the counts are identical, so adding a facet needs no new component.
export default function FilterPill({ def, options, selected = [], onToggle, onClear }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  const dismiss = useCallback(() => setOpen(false), [])
  useDismissable(ref, open, dismiss)

  if (options.length === 0) return null

  const isSwatch = def.type === 'swatch'

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          'flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition-colors',
          selected.length > 0
            ? 'border-charcoal bg-charcoal text-white'
            : 'border-charcoal/20 text-charcoal hover:border-charcoal/40',
        )}
      >
        {def.label}
        {selected.length > 0 && <span>({selected.length})</span>}
        <KeyboardArrowDownIcon
          fontSize="small"
          className={cn('transition-transform', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div
          className={cn(
            "absolute left-0 top-full z-20 mt-2 rounded-2xl border border-charcoal/15 bg-white p-2 shadow-lg",
            isSwatch ? "w-80" : "w-64",
          )}
        >
          <div className={cn('max-h-72 overflow-y-auto', isSwatch && 'grid grid-cols-3 gap-1 p-1')}>
            {options.map((option) => {
              const checked = selected.includes(option.value)

              if (isSwatch) {
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => onToggle(def.id, option.value)}
                    className="flex flex-col items-center gap-1.5 rounded-lg p-2 transition-colors hover:bg-sage/50"
                  >
                    <span
                      style={{ backgroundColor: option.swatch }}
                      className={cn(
                        'h-10 w-10 rounded-full border transition-shadow',
                        checked
                          ? 'border-charcoal ring-2 ring-charcoal ring-offset-2'
                          : 'border-charcoal/20',
                      )}
                    />
                    <span className="text-center text-[11px] leading-tight text-charcoal">
                      {option.label}
                    </span>
                    <span className="text-[11px] text-text-muted">({option.count})</span>
                  </button>
                )
              }

              return (
                <label
                  key={option.value}
                  className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-sage/50"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onToggle(def.id, option.value)}
                    className="h-4 w-4 shrink-0 accent-charcoal"
                  />
                  <span className="flex-1 text-charcoal">{option.label}</span>
                  <span className="text-xs text-text-muted">({option.count})</span>
                </label>
              )
            })}
          </div>

          {selected.length > 0 && (
            <button
              type="button"
              onClick={() => onClear(def.id)}
              className="mt-1 w-full border-t border-charcoal/10 px-3 py-2 text-left text-xs text-text-muted transition-colors hover:text-charcoal"
            >
              Clear {def.label.toLowerCase()}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
