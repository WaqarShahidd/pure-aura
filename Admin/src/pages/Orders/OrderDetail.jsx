import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Alert, Box, Button, Card, CardContent, Chip, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogContentText, DialogTitle, Divider, Grid, MenuItem, Snackbar, Stack,
  TextField, Typography,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { api, get, patch, post } from '../../lib/api'
import { useAuth } from '../../auth/useAuth'
import {
  statusLabel, STATUS_COLOR, paymentStatusLabel, PAYMENT_STATUS_COLOR,
} from '../../lib/orderStatus'

const money = new Intl.NumberFormat('en-PK', {
  style: 'currency',
  currency: 'PKR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

// The one place a proof file can be seen. It is never statically served, so a bare <img
// src> or <a href> would 401 - the Authorization header only rides along on requests made
// through the shared axios instance, not a plain browser navigation. Fetching the blob and
// opening an object URL is what makes an authenticated view actually work.
function ViewProofButton({ mediaId }) {
  const [loading, setLoading] = useState(false)

  const view = async () => {
    setLoading(true)
    try {
      const response = await api.get(`/admin/media/${mediaId}/raw`, { responseType: 'blob' })
      const url = URL.createObjectURL(response.data)
      window.open(url, '_blank', 'noreferrer')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button size="small" onClick={view} disabled={loading}>
      {loading ? 'Opening…' : 'View proof'}
    </Button>
  )
}

// Destructive or hard-to-undo transitions get an optional note prompt rather than firing
// on a bare click - cancelling and refunding are the two that move money or promises to a
// customer, and a stray click on a dense button row is exactly how those happen by accident.
const CONFIRM_REQUIRED = new Set(['cancelled', 'refunded', 'returned_to_sender'])

export default function OrderDetail() {
  const { number } = useParams()
  const queryClient = useQueryClient()
  const { can } = useAuth()

  const [toast, setToast] = useState(null)
  const [pendingTransition, setPendingTransition] = useState(null)
  const [note, setNote] = useState('')
  const [courierId, setCourierId] = useState('')
  const [trackingNumber, setTrackingNumber] = useState('')
  const [rejecting, setRejecting] = useState(null)
  const [rejectReason, setRejectReason] = useState('')

  const { data: order, isPending } = useQuery({
    queryKey: ['admin-order', number],
    queryFn: () => get(`/admin/orders/${number}`).then((body) => body.data),
  })

  const { data: meta } = useQuery({
    queryKey: ['admin-orders-meta'],
    queryFn: () => get('/admin/orders/meta').then((body) => body.data),
    staleTime: 5 * 60_000,
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-order', number] })
    queryClient.invalidateQueries({ queryKey: ['admin-orders'] })
  }

  const transition = useMutation({
    mutationFn: ({ toStatus, note: transitionNote }) =>
      post(`/admin/orders/${number}/transition`, { toStatus, note: transitionNote || null }),
    onSuccess: (_, { toStatus }) => {
      invalidate()
      setToast({ severity: 'success', message: `Order moved to ${statusLabel(toStatus)}` })
      setPendingTransition(null)
      setNote('')
    },
    onError: (error) => setToast({ severity: 'error', message: error.message }),
  })

  const fulfil = useMutation({
    mutationFn: () => patch(`/admin/orders/${number}/fulfilment`, { courierId, trackingNumber }),
    onSuccess: () => {
      invalidate()
      setToast({ severity: 'success', message: 'Courier and tracking saved' })
    },
    onError: (error) => setToast({ severity: 'error', message: error.message }),
  })

  const verifyPayment = useMutation({
    mutationFn: ({ paymentId, approve, reason }) =>
      post(`/admin/orders/${number}/payments/${paymentId}/verify`, { approve, reason: reason || null }),
    onSuccess: (_, { approve }) => {
      invalidate()
      setToast({
        severity: approve ? 'success' : 'info',
        message: approve ? 'Payment verified' : 'Payment rejected',
      })
      setRejecting(null)
      setRejectReason('')
    },
    onError: (error) => setToast({ severity: 'error', message: error.message }),
  })

  if (isPending) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', minHeight: 300 }}>
        <CircularProgress size={26} />
      </Box>
    )
  }

  if (!order) return null

  const courierName = meta?.couriers.find((row) => row.id === order.courierId)?.name

  const requestTransition = (toStatus) => {
    if (CONFIRM_REQUIRED.has(toStatus)) {
      setPendingTransition(toStatus)
      return
    }
    transition.mutate({ toStatus })
  }

  return (
    <Stack spacing={3}>
      <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
        <Button startIcon={<ArrowBackIcon />} component={Link} to="/orders">
          Orders
        </Button>
      </Stack>

      <Stack direction="row" spacing={2} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
        <Typography variant="h2">{order.number}</Typography>
        <Chip label={statusLabel(order.status)} color={STATUS_COLOR[order.status] ?? 'default'} />
        <Chip
          label={paymentStatusLabel(order.paymentStatus)}
          color={PAYMENT_STATUS_COLOR[order.paymentStatus] ?? 'default'}
          variant="outlined"
        />
        <Box sx={{ flexGrow: 1 }} />
        <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
          Placed {formatDate(order.placedOn)}
        </Typography>
      </Stack>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Stack spacing={3}>
            <Card>
              <CardContent>
                <Typography variant="h3" sx={{ mb: 2 }}>Items</Typography>
                <Stack divider={<Divider />} spacing={1.5}>
                  {order.items.map((item) => (
                    <Stack key={item.handle + item.variantLabel} direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                      <Box
                        component="img"
                        src={item.image}
                        alt=""
                        sx={{ width: 44, height: 44, borderRadius: 1, objectFit: 'cover', bgcolor: '#eef1e7' }}
                      />
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography sx={{ fontSize: 14 }}>{item.title}</Typography>
                        <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                          {item.variantLabel} · Qty {item.quantity}
                        </Typography>
                      </Box>
                      <Typography sx={{ fontSize: 14 }}>{money.format(item.lineTotal)}</Typography>
                    </Stack>
                  ))}
                </Stack>

                <Divider sx={{ my: 2 }} />

                <Stack spacing={0.5}>
                  <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                    <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>Subtotal</Typography>
                    <Typography sx={{ fontSize: 13 }}>{money.format(order.subtotal)}</Typography>
                  </Stack>
                  {order.discount > 0 && (
                    <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                      <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
                        Discount {order.discountCode ? `(${order.discountCode})` : ''}
                      </Typography>
                      <Typography sx={{ fontSize: 13 }}>-{money.format(order.discount)}</Typography>
                    </Stack>
                  )}
                  <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                    <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>Shipping</Typography>
                    <Typography sx={{ fontSize: 13 }}>{order.shipping ? money.format(order.shipping) : 'Free'}</Typography>
                  </Stack>
                  <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                    <Typography sx={{ fontWeight: 600 }}>Total</Typography>
                    <Typography sx={{ fontWeight: 600 }}>{money.format(order.total)}</Typography>
                  </Stack>
                  <Typography sx={{ fontSize: 11, color: 'text.secondary', textAlign: 'right' }}>
                    incl. GST {money.format(order.tax)}
                  </Typography>
                </Stack>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography variant="h3" sx={{ mb: 2 }}>Order history</Typography>
                <Stack spacing={1.5}>
                  {(order.events ?? []).map((event, index) => (
                    <Stack key={index} direction="row" spacing={2}>
                      <Box sx={{ width: 8, height: 8, mt: 0.6, borderRadius: '50%', bgcolor: 'primary.main', flexShrink: 0 }} />
                      <Box>
                        <Typography sx={{ fontSize: 13, fontWeight: 500 }}>{statusLabel(event.status)}</Typography>
                        <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                          {formatDate(event.at)} · {event.actor}
                        </Typography>
                        {event.note && <Typography sx={{ fontSize: 12, mt: 0.5 }}>{event.note}</Typography>}
                      </Box>
                    </Stack>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Stack spacing={3}>
            <Card>
              <CardContent>
                <Typography variant="h3" sx={{ mb: 1.5 }}>Move order</Typography>
                {order.allowedTransitions?.length > 0 ? (
                  <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                    {order.allowedTransitions.map((toStatus) => (
                      <Button
                        key={toStatus}
                        size="small"
                        variant="outlined"
                        onClick={() => requestTransition(toStatus)}
                        disabled={transition.isPending}
                      >
                        {statusLabel(toStatus)}
                      </Button>
                    ))}
                  </Stack>
                ) : (
                  <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
                    This order is in a final state.
                  </Typography>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography variant="h3" sx={{ mb: 1.5 }}>Fulfilment</Typography>
                <Stack spacing={2}>
                  <TextField
                    select
                    label="Courier"
                    size="small"
                    value={courierId || order.courierId || ''}
                    onChange={(event) => setCourierId(event.target.value)}
                    disabled={!can('staff')}
                  >
                    {(meta?.couriers ?? []).map((courier) => (
                      <MenuItem key={courier.id} value={courier.id}>{courier.name}</MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    label="Tracking number"
                    size="small"
                    defaultValue={order.trackingNumber ?? ''}
                    onChange={(event) => setTrackingNumber(event.target.value)}
                    disabled={!can('staff')}
                  />
                  <Button
                    variant="outlined"
                    size="small"
                    disabled={!can('staff') || fulfil.isPending || !(courierId || order.courierId) || !(trackingNumber || order.trackingNumber)}
                    onClick={() => fulfil.mutate()}
                  >
                    {fulfil.isPending ? 'Saving…' : 'Save fulfilment'}
                  </Button>
                  {order.trackingUrl && (
                    <Typography sx={{ fontSize: 12 }}>
                      {courierName ?? 'Courier'} ·{' '}
                      <a href={order.trackingUrl} target="_blank" rel="noreferrer">Track</a>
                    </Typography>
                  )}
                </Stack>
              </CardContent>
            </Card>

            {order.payments?.length > 0 && (
              <Card>
                <CardContent>
                  <Typography variant="h3" sx={{ mb: 1.5 }}>Payment</Typography>
                  <Stack spacing={2} divider={<Divider />}>
                    {order.payments.map((payment) => (
                      <Stack key={payment.id} spacing={1}>
                        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography sx={{ fontSize: 13 }}>{payment.kind}</Typography>
                          <Chip
                            size="small"
                            label={payment.status}
                            color={payment.status === 'succeeded' ? 'success' : payment.status === 'failed' ? 'error' : 'default'}
                          />
                        </Stack>
                        {payment.referenceCode && (
                          <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                            Reference {payment.referenceCode}
                          </Typography>
                        )}
                        {payment.proofMediaId && <ViewProofButton mediaId={payment.proofMediaId} />}
                        {payment.status === 'awaiting_verification' && can('manager') && (
                          <Stack direction="row" spacing={1}>
                            <Button
                              size="small"
                              variant="contained"
                              disabled={verifyPayment.isPending}
                              onClick={() => verifyPayment.mutate({ paymentId: payment.id, approve: true })}
                            >
                              Verify
                            </Button>
                            <Button
                              size="small"
                              color="error"
                              disabled={verifyPayment.isPending}
                              onClick={() => setRejecting(payment.id)}
                            >
                              Reject
                            </Button>
                          </Stack>
                        )}
                      </Stack>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardContent>
                <Typography variant="h3" sx={{ mb: 1.5 }}>Shipping to</Typography>
                <Typography sx={{ fontSize: 13 }}>{order.shippingAddress?.name}</Typography>
                <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
                  {order.shippingAddress?.line1}
                  {order.shippingAddress?.line2 ? `, ${order.shippingAddress.line2}` : ''}
                  <br />
                  {order.shippingAddress?.city}, {order.shippingAddress?.region} {order.shippingAddress?.postcode}
                  <br />
                  {order.shippingAddress?.country}
                </Typography>
                <Divider sx={{ my: 1.5 }} />
                <Typography sx={{ fontSize: 13 }}>{order.email}</Typography>
                {order.phone && <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>{order.phone}</Typography>}
              </CardContent>
            </Card>
          </Stack>
        </Grid>
      </Grid>

      {/* Cancel / refund / return - a note is captured, not required, before it fires. */}
      <Dialog open={Boolean(pendingTransition)} onClose={() => setPendingTransition(null)}>
        <DialogTitle>Move to {statusLabel(pendingTransition)}?</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            This cannot be undone from here. Add a note for the record if useful.
          </DialogContentText>
          <TextField
            label="Note (optional)"
            fullWidth
            multiline
            minRows={2}
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPendingTransition(null)}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            disabled={transition.isPending}
            onClick={() => transition.mutate({ toStatus: pendingTransition, note })}
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(rejecting)} onClose={() => setRejecting(null)}>
        <DialogTitle>Reject this payment?</DialogTitle>
        <DialogContent>
          <TextField
            label="Reason"
            fullWidth
            multiline
            minRows={2}
            value={rejectReason}
            onChange={(event) => setRejectReason(event.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejecting(null)}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            disabled={verifyPayment.isPending}
            onClick={() => verifyPayment.mutate({ paymentId: rejecting, approve: false, reason: rejectReason })}
          >
            Reject
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={Boolean(toast)} autoHideDuration={4000} onClose={() => setToast(null)}>
        <Alert severity={toast?.severity ?? 'info'} onClose={() => setToast(null)}>
          {toast?.message}
        </Alert>
      </Snackbar>
    </Stack>
  )
}
