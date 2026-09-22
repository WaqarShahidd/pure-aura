import { cn } from '../../../utils/classNames'

// A plain input rather than MUI's Checkbox: no `!` prefix needed for colours, and it sidesteps
// the theme's global borderRadius.
export default function Checkbox({ label, checked, onChange, className }) {
  return (
    <label className={cn('flex cursor-pointer items-center gap-2.5 text-sm', className)}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 shrink-0 accent-charcoal"
      />
      <span>{label}</span>
    </label>
  )
}
