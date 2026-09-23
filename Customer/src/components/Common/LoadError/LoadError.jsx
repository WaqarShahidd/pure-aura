import Button from '../Button/Button'
import { cn } from '../../../utils/classNames'

// Deliberately the same prop shape as EmptyState (title, body, actionLabel, onAction) so
// the two read as siblings at their call sites. An empty result and a failed request look
// similar on screen but mean very different things, and the difference the customer cares
// about is whether trying again might help.
export default function LoadError({
  title = 'We could not load that',
  body = 'Something went wrong on our side. Try again in a moment.',
  actionLabel = 'Try again',
  onAction,
  className,
}) {
  return (
    <div
      role="alert"
      className={cn('mx-auto max-w-md px-6 py-20 text-center', className)}
    >
      <h2 className="text-lg font-medium text-charcoal">{title}</h2>
      <p className="mt-2 text-sm text-text-muted">{body}</p>

      {actionLabel && onAction && (
        <Button variant="solid-dark" onClick={onAction} className="mt-6">
          {actionLabel}
        </Button>
      )}
    </div>
  )
}
