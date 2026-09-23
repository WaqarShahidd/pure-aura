import { useCallback, useRef, useState } from 'react'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import { cn } from '../../../utils/classNames'
import { useDismissable } from '../../../utils/useDismissable'

export default function SortSelect({ value, onChange, options = [] }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  const dismiss = useCallback(() => setOpen(false), [])
  useDismissable(ref, open, dismiss)

  // The sort vocabulary is fetched, so the first render happens with an empty list.
  // Falling back to a label keeps the control the right width instead of collapsing
  // the filter bar and then pushing it back out when the options arrive.
  const current = options.find((option) => option.id === value) ?? options[0] ?? null

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-1 text-sm text-charcoal"
      >
        <span className="text-text-muted">Sort by:</span>
        {current?.label ?? 'Sort'}
        <KeyboardArrowDownIcon
          fontSize="small"
          className={cn('transition-transform', open && 'rotate-180')}
        />
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute right-0 top-full z-20 mt-2 w-56 overflow-hidden rounded-2xl border border-charcoal/15 bg-white py-1 shadow-lg"
        >
          {options.map((option) => (
            <li key={option.id}>
              <button
                type="button"
                role="option"
                aria-selected={option.id === value}
                onClick={() => {
                  onChange(option.id)
                  setOpen(false)
                }}
                className={cn(
                  'block w-full px-4 py-2 text-left text-sm transition-colors hover:bg-sage',
                  option.id === value && 'font-semibold',
                )}
              >
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
