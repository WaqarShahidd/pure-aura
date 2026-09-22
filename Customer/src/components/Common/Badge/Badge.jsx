import { cn } from '../../../utils/classNames'

export default function Badge({ children, tone = 'dark', className }) {
  const tones = {
    dark: 'bg-charcoal text-white',
    light: 'bg-white text-charcoal border border-charcoal/15',
    outline: 'bg-transparent text-charcoal border border-charcoal/30',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}
