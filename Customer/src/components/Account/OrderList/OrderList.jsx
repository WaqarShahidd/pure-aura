import { Link } from 'react-router-dom'
import Badge from '../../Common/Badge/Badge'
import EmptyState from '../../Common/EmptyState/EmptyState'
import { orderItemCount, useOrders } from '../../../data/useAccount'
import { formatOrderDate, statusMeta } from '../../../config/orders'
import { orderPath } from '../../../config/routes'
import { formatPrice } from '../../../utils/formatPrice'

export default function OrderList({ limit }) {
  const { data: orders = [], isPending } = useOrders()
  const rows = limit ? orders.slice(0, limit) : orders

  if (isPending) {
    return <div className="min-h-[8rem]" />
  }

  if (rows.length === 0) {
    return <EmptyState title="No orders yet" body="Your orders will appear here once you place one." />
  }

  return (
    <ul className="flex flex-col divide-y divide-charcoal/10 border-y border-charcoal/10">
      {rows.map((order) => (
        <li key={order.id}>
          <Link
            to={orderPath(order.id)}
            className="flex flex-wrap items-center justify-between gap-3 py-4 transition-colors hover:bg-sage/30"
          >
            <div>
              <p className="text-sm font-medium">{order.id}</p>
              <p className="text-xs text-text-muted">
                Placed {formatOrderDate(order.placedOn)} · {orderItemCount(order)} item
                {orderItemCount(order) === 1 ? '' : 's'}
              </p>
            </div>

            <div className="flex items-center gap-4">
              <Badge tone={statusMeta(order.status).tone}>{statusMeta(order.status).label}</Badge>
              <span className="text-sm font-semibold">{formatPrice(order.total)}</span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  )
}
