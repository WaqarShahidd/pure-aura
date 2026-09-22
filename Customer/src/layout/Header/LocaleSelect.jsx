import { useCallback, useRef, useState } from 'react'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import { cn } from '../../utils/classNames'
import { useDismissable } from '../../utils/useDismissable'

// Hand-rolled rather than a MUI Menu: the theme sets a global borderRadius of 999, which would
// render a menu Paper as a capsule, and this needs no portal or focus trap.
export default function LocaleSelect({ label, options, tone = 'light' }) {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState(options[0])
  const ref = useRef(null)

  const dismiss = useCallback(() => setOpen(false), [])
  useDismissable(ref, open, dismiss)

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          'flex items-center gap-1 transition-opacity hover:opacity-100',
          tone === 'light' ? 'opacity-80' : 'text-white/60 hover:text-white',
        )}
      >
        {selected}
        <KeyboardArrowDownIcon fontSize="inherit" />
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute right-0 top-full z-50 mt-2 min-w-40 overflow-hidden rounded-xl border border-charcoal/10 bg-white py-1 text-charcoal shadow-lg"
        >
          {options.map((option) => (
            <li key={option}>
              <button
                type="button"
                role="option"
                aria-selected={option === selected}
                onClick={() => {
                  setSelected(option)
                  setOpen(false)
                }}
                className={cn(
                  'block w-full px-4 py-2 text-left text-xs transition-colors hover:bg-sage',
                  option === selected && 'font-semibold',
                )}
              >
                {option}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
