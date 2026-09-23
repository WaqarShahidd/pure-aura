import { Link } from 'react-router-dom'
import Badge from '../../Common/Badge/Badge'
import ImagePlaceholder from '../../Common/ImagePlaceholder/ImagePlaceholder'
import Button from '../../Common/Button/Button'
import OrderTimeline from '../OrderTimeline/OrderTimeline'
import { formatOrderDate, statusMeta } from '../../../config/orders'
import { ROUTES, productPath } from '../../../config/routes'
import { formatPrice } from '../../../utils/formatPrice'

export default function OrderDetail({ order }) {

  const address = order.shippingAddress

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link to={ROUTES.accountOrders} className="text-sm text-accent underline underline-offset-4">
            Back to orders
          </Link>
          <h2 className="mt-2 text-xl font-medium">Order {order.id}</h2>
          <p className="text-sm text-text-muted">Placed {formatOrderDate(order.placedOn)}</p>
        </div>
        <Badge tone={statusMeta(order.status).tone}>{statusMeta(order.status).label}</Badge>
      </div>

      <ul className="flex flex-col divide-y divide-charcoal/10 border-y border-charcoal/10">
        {order.items.map((item) => {
          return (
            <li key={item.handle} className="flex items-center gap-4 py-4">
              <Link to={productPath(item.handle)} className="w-16 shrink-0">
                <ImagePlaceholder
                  src={item.image}
                  alt={item.title}
                  seed={item.handle}
                  rounded="rounded-xl"
                />
              </Link>
              <div className="flex-1">
                <Link to={productPath(item.handle)} className="text-sm font-medium">
                  {item.title}
                </Link>
                <p className="text-xs text-text-muted">Quantity {item.quantity}</p>
              </div>
              <span className="text-sm font-semibold">{formatPrice(item.price * item.quantity)}</span>
            </li>
          )
        })}
      </ul>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <div>
          <h3 className="mb-2 text-sm font-medium">Delivered to</h3>
          <address className="text-sm not-italic text-text-muted">
            <span className="block text-charcoal">{address?.name}</span>
            {address?.line1}
            {address?.line2 && <>, {address.line2}</>}
            <br />
            {address?.city}, {address?.region} {address?.postcode}
            <br />
            {address?.country}
          </address>

          <h3 className="mb-2 mt-5 text-sm font-medium">Tracking</h3>
          <p className="text-sm text-text-muted">
            {order.trackingNumber ? (
              order.trackingUrl ? (
                <a href={order.trackingUrl} target="_blank" rel="noreferrer" className="underline">
                  {order.courier?.name ? `${order.courier.name} · ` : ''}
                  {order.trackingNumber}
                </a>
              ) : (
                order.trackingNumber
              )
            ) : (
              'Not dispatched yet'
            )}
          </p>
          {order.deliveredOn && (
            <p className="text-sm text-text-muted">Delivered {formatOrderDate(order.deliveredOn)}</p>
          )}
        </div>

        <div>
          <h3 className="mb-2 text-sm font-medium">Summary</h3>
          <dl className="flex flex-col gap-1.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-text-muted">Subtotal</dt>
              <dd>{formatPrice(order.subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-muted">Shipping</dt>
              <dd>{order.shipping ? formatPrice(order.shipping) : 'Free'}</dd>
            </div>
            <div className="flex justify-between border-t border-charcoal/10 pt-2 font-medium">
              <dt>Total</dt>
              <dd>{formatPrice(order.total)}</dd>
            </div>
          </dl>
          <p className="mt-2 text-xs text-text-muted">Paid with {order.paymentLabel}</p>

          <Button variant="outline-dark" to={ROUTES.contact} className="mt-5">
            Get help with this order
          </Button>
        </div>
      </div>

      <OrderTimeline events={order.events} />
    </div>
  )
}
