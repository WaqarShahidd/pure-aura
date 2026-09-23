// Mirrors Backend/src/lib/orderStatus.js and Customer/src/config/orders.js - the same
// twelve statuses, presented for a table and a detail screen rather than a storefront
// badge. Kept here rather than shared across apps because Admin and Customer are
// deliberately separate deployments with no shared source.
export const STATUS_LABELS = {
  pending_payment: 'Awaiting payment',
  confirmed: 'Confirmed',
  processing: 'Processing',
  packed: 'Packed',
  handed_to_courier: 'Handed to courier',
  in_transit: 'In transit',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  failed_delivery: 'Delivery attempted',
  returned_to_sender: 'Returned',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
}

export const STATUS_COLOR = {
  pending_payment: 'default',
  confirmed: 'info',
  processing: 'info',
  packed: 'info',
  handed_to_courier: 'info',
  in_transit: 'info',
  out_for_delivery: 'info',
  delivered: 'success',
  failed_delivery: 'warning',
  returned_to_sender: 'warning',
  cancelled: 'default',
  refunded: 'default',
}

export const PAYMENT_STATUS_LABELS = {
  unpaid: 'Unpaid',
  awaiting_verification: 'Checking payment',
  paid: 'Paid',
  partially_refunded: 'Partially refunded',
  refunded: 'Refunded',
  failed: 'Payment failed',
}

export const PAYMENT_STATUS_COLOR = {
  unpaid: 'default',
  awaiting_verification: 'warning',
  paid: 'success',
  partially_refunded: 'warning',
  refunded: 'default',
  failed: 'error',
}

export function statusLabel(status) {
  return STATUS_LABELS[status] ?? status
}

export function paymentStatusLabel(status) {
  return PAYMENT_STATUS_LABELS[status] ?? status
}
