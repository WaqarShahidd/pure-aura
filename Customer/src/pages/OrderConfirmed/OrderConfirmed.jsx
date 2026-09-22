import { Navigate, useLocation } from 'react-router-dom'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlined'
import SectionHeading, { Accent } from '../../components/Common/SectionHeading/SectionHeading'
import Button from '../../components/Common/Button/Button'
import { DELIVERY_METHODS } from '../../config/checkout'
import { ROUTES, collectionPath } from '../../config/routes'
import { formatPrice } from '../../utils/formatPrice'

export default function OrderConfirmed() {
  const { state } = useLocation()

  // Reached without placing an order (a refresh, or a pasted link) — there is nothing to show.
  if (!state?.orderId) return <Navigate to={ROUTES.home} replace />

  const method = DELIVERY_METHODS.find((candidate) => candidate.id === state.delivery)

  return (
    <section className="mx-auto max-w-2xl px-6 py-24 text-center md:px-10">
      <CheckCircleOutlineIcon sx={{ fontSize: 48 }} className="text-olive" />

      <SectionHeading size="lg" className="mt-5">
        Thank you, that&apos;s <Accent>all done</Accent>.
      </SectionHeading>

      <p className="mx-auto mt-4 max-w-md text-sm text-text-muted">
        Order <span className="text-charcoal">{state.orderId}</span> is confirmed. A receipt is on
        its way to {state.email}.
      </p>

      <dl className="mx-auto mt-10 flex max-w-sm flex-col gap-2 rounded-2xl border border-charcoal/15 px-6 py-5 text-sm">
        <div className="flex justify-between">
          <dt className="text-text-muted">Order number</dt>
          <dd>{state.orderId}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-text-muted">Delivery</dt>
          <dd>{method?.label}</dd>
        </div>
        <div className="flex justify-between border-t border-charcoal/10 pt-2 font-medium">
          <dt>Total paid</dt>
          <dd>{formatPrice(state.total)}</dd>
        </div>
      </dl>

      <p className="mt-6 text-xs text-text-muted">
        This is a demo store — no payment was taken and nothing will ship.
      </p>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button variant="solid-dark" to={collectionPath('all')}>
          Keep shopping
        </Button>
        <Button variant="outline-dark" to={ROUTES.accountOrders}>
          View orders
        </Button>
      </div>
    </section>
  )
}
