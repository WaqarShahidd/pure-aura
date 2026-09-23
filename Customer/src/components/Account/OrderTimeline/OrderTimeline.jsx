import { formatOrderDate, statusMeta } from '../../../config/orders'

// The append-only history behind an order's current badge. `events` arrives oldest-first
// from the serializer, so rendering it in order is the whole timeline - no reordering here.
export default function OrderTimeline({ events = [] }) {
  if (events.length === 0) return null

  return (
    <div>
      <h3 className="mb-3 text-sm font-medium">Order history</h3>
      <ol className="flex flex-col gap-4">
        {events.map((event, index) => {
          const isLast = index === events.length - 1
          return (
            <li key={`${event.status}-${event.at}`} className="relative flex gap-4 pb-1 pl-1">
              {!isLast && (
                <span
                  aria-hidden="true"
                  className="absolute left-[7px] top-4 h-full w-px bg-charcoal/10"
                />
              )}
              <span
                className={
                  'relative mt-1 h-3.5 w-3.5 shrink-0 rounded-full border-2 ' +
                  (isLast ? 'border-charcoal bg-charcoal' : 'border-charcoal/30 bg-cream')
                }
              />
              <div className="flex-1 pb-2">
                <p className="text-sm font-medium">{statusMeta(event.status).label}</p>
                <p className="text-xs text-text-muted">{formatOrderDate(event.at)}</p>
                {event.note && <p className="mt-1 text-xs text-text-muted">{event.note}</p>}
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
