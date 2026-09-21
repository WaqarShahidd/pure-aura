import { cn } from '../../../utils/classNames'

const SIZE_STYLES = {
  sm: 'text-2xl md:text-3xl',
  md: 'text-3xl md:text-4xl',
  lg: 'text-4xl md:text-6xl',
}

export function Accent({ children, className }) {
  return <span className={cn('italic-accent', className)}>{children}</span>
}

export default function SectionHeading({
  as: Tag = 'h2',
  size = 'md',
  className,
  children,
}) {
  return (
    <Tag className={cn('font-medium leading-tight', SIZE_STYLES[size], className)}>
      {children}
    </Tag>
  )
}
