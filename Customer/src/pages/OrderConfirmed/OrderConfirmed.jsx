import { useState } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlined'
import SectionHeading, { Accent } from '../../components/Common/SectionHeading/SectionHeading'
import Button from '../../components/Common/Button/Button'
import Skeleton from '../../components/Common/Skeleton/Skeleton'
import LoadError from '../../components/Common/LoadError/LoadError'
import { useOrderLookup, useUploadProof } from '../../data/useCheckout'
import { ROUTES, collectionPath } from '../../config/routes'
import { formatPrice } from '../../utils/formatPrice'

// Shown only for a bank-transfer order that hasn't had a receipt attached yet - this is
// the "confirmation page shows the code and an upload control" step from the payments
// plan. Once a file is sent the order moves to `awaiting_verification` and there is
// nothing left to do here but wait for Admin.
function ProofUpload({ order, token, onUploaded }) {
  const [file, setFile] = useState(null)
  const upload = useUploadProof(order.id, token)

  if (order.payment?.hasProof || order.paymentStatus !== 'unpaid') {
    return (
      <p className="mt-6 rounded-2xl bg-sage px-5 py-4 text-sm text-charcoal">
        We have your payment receipt and are checking it. You&apos;ll see this order move to
        Confirmed once it&apos;s verified.
      </p>
    )
  }

  return (
    <div className="mt-6 rounded-2xl border border-charcoal/15 px-5 py-4 text-left">
      <h3 className="text-sm font-medium">Upload your transfer receipt</h3>
      <p className="mt-1 text-xs text-text-muted">
        Transfer the total using reference <span className="text-charcoal">{order.payment.referenceCode}</span>,
        then attach the receipt or a screenshot below (JPG, PNG or PDF, up to 10MB).
      </p>

      <input
        type="file"
        accept=".jpg,.jpeg,.png,.pdf"
        onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        className="mt-3 block w-full text-sm"
      />

      {upload.isError && (
        <p className="mt-2 text-xs text-accent">{upload.error.message ?? 'That upload failed'}</p>
      )}

      <Button
        variant="solid-dark"
        className="mt-4"
        disabled={!file || upload.isPending}
        onClick={() => file && upload.mutate(file, { onSuccess: onUploaded })}
      >
        {upload.isPending ? 'Uploading…' : 'Send receipt'}
      </Button>
    </div>
  )
}

export default function OrderConfirmed() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const { data: order, isPending, isError, refetch } = useOrderLookup(token)

  // Reached without a token (a bare visit, or a stale link) - there is nothing to look up.
  if (!token) return <Navigate to={ROUTES.home} replace />

  if (isPending) {
    return (
      <section className="mx-auto max-w-2xl px-6 py-24 text-center md:px-10">
        <Skeleton className="mx-auto h-10 w-10" rounded="rounded-full" />
        <Skeleton className="mx-auto mt-5 h-6 w-64" />
        <Skeleton className="mx-auto mt-8 h-40 w-full max-w-sm" />
      </section>
    )
  }

  if (isError || !order) {
    return (
      <LoadError
        title="We could not find that order"
        body="The link may have expired. Your order still went through - check your account or contact us."
        onAction={refetch}
      />
    )
  }

  return (
    <section className="mx-auto max-w-2xl px-6 py-24 text-center md:px-10">
      <CheckCircleOutlineIcon sx={{ fontSize: 48 }} className="text-olive" />

      <SectionHeading size="lg" className="mt-5">
        Thank you, that&apos;s <Accent>all done</Accent>.
      </SectionHeading>

      <p className="mx-auto mt-4 max-w-md text-sm text-text-muted">
        Order <span className="text-charcoal">{order.id}</span> is confirmed. A receipt is on
        its way to {order.email}.
      </p>

      <dl className="mx-auto mt-10 flex max-w-sm flex-col gap-2 rounded-2xl border border-charcoal/15 px-6 py-5 text-sm">
        <div className="flex justify-between">
          <dt className="text-text-muted">Order number</dt>
          <dd>{order.id}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-text-muted">Delivery</dt>
          <dd>{order.delivery}</dd>
        </div>
        <div className="flex justify-between border-t border-charcoal/10 pt-2 font-medium">
          <dt>Total paid</dt>
          <dd>{formatPrice(order.total)}</dd>
        </div>
      </dl>

      {order.payment?.kind === 'manual_transfer' && (
        <ProofUpload order={order} token={token} onUploaded={refetch} />
      )}

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
