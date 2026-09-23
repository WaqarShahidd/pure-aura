import { cn } from '../../../utils/classNames'

// Skeletons reuse ImagePlaceholder's tint vocabulary rather than the usual grey bars, so a
// loading page reads as the same site rather than as a generic spinner screen. Class names
// are written out in full because Tailwind scans source text.
const TONES = {
  tile: 'bg-sage',
  line: 'bg-charcoal/10',
  soft: 'bg-cream',
}

export default function Skeleton({ tone = 'line', className, rounded = 'rounded-2xl' }) {
  return (
    <div
      aria-hidden="true"
      className={cn('animate-pulse', TONES[tone] ?? TONES.line, rounded, className)}
    />
  )
}
