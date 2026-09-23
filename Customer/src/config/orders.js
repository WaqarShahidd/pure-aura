// Order status presentation.
//
// The storefront used to know two statuses, both as raw strings, and branched on them
// inline in two files: `order.status === 'Delivered' ? 'light' : 'dark'`. The real
// lifecycle has twelve, so the mapping lives here instead of being spelled out twice.
//
// `tone` matches Badge's vocabulary. Terminal statuses are the ones nothing follows, which
// is what decides whether the timeline shows a "next step" or stops.
export const ORDER_STATUS_META = {
  pending_payment: { label: 'Awaiting payment', tone: 'outline', isTerminal: false },
  confirmed: { label: 'Confirmed', tone: 'dark', isTerminal: false },
  processing: { label: 'Being prepared', tone: 'dark', isTerminal: false },
  packed: { label: 'Packed', tone: 'dark', isTerminal: false },
  handed_to_courier: { label: 'Handed to courier', tone: 'dark', isTerminal: false },
  in_transit: { label: 'In transit', tone: 'dark', isTerminal: false },
  out_for_delivery: { label: 'Out for delivery', tone: 'dark', isTerminal: false },
  delivered: { label: 'Delivered', tone: 'light', isTerminal: true },
  failed_delivery: { label: 'Delivery attempted', tone: 'outline', isTerminal: false },
  returned_to_sender: { label: 'Returned', tone: 'outline', isTerminal: true },
  cancelled: { label: 'Cancelled', tone: 'outline', isTerminal: true },
  refunded: { label: 'Refunded', tone: 'outline', isTerminal: true },
}

export const PAYMENT_STATUS_META = {
  unpaid: { label: 'Unpaid' },
  awaiting_verification: { label: 'Checking your payment' },
  paid: { label: 'Paid' },
  partially_refunded: { label: 'Partially refunded' },
  refunded: { label: 'Refunded' },
  failed: { label: 'Payment failed' },
}

// An unknown status should read as itself rather than crash a badge.
export function statusMeta(status) {
  return ORDER_STATUS_META[status] ?? { label: status, tone: 'outline', isTerminal: false }
}

// A customer may only cancel before the order has been worked on; the server enforces the
// same rule, this just decides whether to offer the button.
export function canCancel(status) {
  return status === 'pending_payment' || status === 'confirmed'
}

export function formatOrderDate(value) {
  if (!value) return null
  return new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
