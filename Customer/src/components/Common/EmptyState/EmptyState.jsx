import Button from '../Button/Button'
import { cn } from '../../../utils/classNames'

export default function EmptyState({ title, body, actionLabel, onAction, className }) {
  return (
    <div className={cn('flex flex-col items-center gap-3 py-20 text-center', className)}>
      <h3 className="text-lg font-medium">{title}</h3>
      {body && <p className="max-w-sm text-sm text-text-muted">{body}</p>}
      {actionLabel && onAction && (
        <Button variant="outline-dark" onClick={onAction} className="mt-2">
          {actionLabel}
        </Button>
      )}
    </div>
  )
}
