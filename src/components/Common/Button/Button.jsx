import MuiButton from '@mui/material/Button'
import { cn } from '../../../utils/classNames'

// `!` forces Tailwind's !important — needed because MUI's emotion-injected <style> tags are
// unlayered CSS and would otherwise beat Tailwind's @layer utilities regardless of specificity.
const VARIANT_STYLES = {
  'solid-dark': '!bg-charcoal !text-white hover:!bg-charcoal-soft !border !border-charcoal',
  'solid-light': '!bg-white !text-charcoal hover:!bg-cream !border !border-white',
  'outline-light': '!bg-transparent !text-white !border !border-white hover:!bg-white/10',
  'outline-dark': '!bg-transparent !text-charcoal !border !border-charcoal hover:!bg-charcoal/5',
}

export default function Button({
  variant = 'solid-dark',
  className,
  children,
  ...props
}) {
  return (
    <MuiButton
      disableElevation
      className={cn(
        'normal-case rounded-full px-6 py-2.5 text-sm font-medium shadow-none',
        VARIANT_STYLES[variant],
        className,
      )}
      {...props}
    >
      {children}
    </MuiButton>
  )
}
