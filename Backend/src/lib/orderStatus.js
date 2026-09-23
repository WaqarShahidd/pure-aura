// The order state machine. Exported as plain data so the admin panel can grey out
// buttons for transitions the server would reject anyway - one source of truth for
// "what can happen next", rather than a matrix duplicated in the UI.
//
// Status and payment status are two ORTHOGONAL axes on purpose. Cash on delivery is
// delivered-and-paid in the same instant; a bank transfer is confirmed-and-paid days
// before anything ships. Collapsing them into one enum needs a combinatorial explosion
// of statuses and makes the admin order list unfilterable.

export const ORDER_STATUSES = [
  'pending_payment',
  'confirmed',
  'processing',
  'packed',
  'handed_to_courier',
  'in_transit',
  'out_for_delivery',
  'delivered',
  'failed_delivery',
  'returned_to_sender',
  'cancelled',
  'refunded',
]

export const PAYMENT_STATUSES = [
  'unpaid',
  'awaiting_verification',
  'paid',
  'partially_refunded',
  'refunded',
  'failed',
]

export const TRANSITIONS = {
  pending_payment: ['confirmed', 'cancelled'],
  confirmed: ['processing', 'cancelled'],
  processing: ['packed', 'cancelled'],
  packed: ['handed_to_courier', 'cancelled'],
  handed_to_courier: ['in_transit', 'failed_delivery'],
  in_transit: ['out_for_delivery', 'failed_delivery'],
  out_for_delivery: ['delivered', 'failed_delivery'],
  failed_delivery: ['out_for_delivery', 'returned_to_sender'],
  returned_to_sender: ['refunded'],
  delivered: ['refunded'],
  cancelled: [],
  refunded: [],
}

// Which role may move an order INTO a given status. Roles are cumulative in practice
// (an owner can do anything a manager can) which allowedFor() resolves below.
const MIN_ROLE = {
  confirmed: 'staff',
  processing: 'staff',
  packed: 'staff',
  handed_to_courier: 'staff',
  in_transit: 'staff',
  out_for_delivery: 'staff',
  delivered: 'staff',
  failed_delivery: 'staff',
  cancelled: 'manager',
  returned_to_sender: 'manager',
  refunded: 'owner',
}

const ROLE_RANK = { staff: 1, manager: 2, owner: 3 }

// Reaching handed_to_courier requires a courier and a tracking number, so the fulfilment
// endpoint is the only way in. A status button alone must not get there.
export const REQUIRES_FULFILMENT = 'handed_to_courier'

// Timestamp columns stamped in the same transaction as the status event, so an order's
// dates can never drift from its history.
export const STATUS_TIMESTAMPS = {
  confirmed: 'confirmedAt',
  handed_to_courier: 'handedToCourierAt',
  delivered: 'deliveredAt',
  cancelled: 'cancelledAt',
}

export const TERMINAL_STATUSES = ['cancelled', 'refunded']

export function canTransition(from, to) {
  return (TRANSITIONS[from] ?? []).includes(to)
}

export function allowedFor(from, role) {
  const rank = ROLE_RANK[role] ?? 0
  return (TRANSITIONS[from] ?? []).filter((to) => rank >= ROLE_RANK[MIN_ROLE[to] ?? 'owner'])
}

// A customer may only ever cancel, and only before the order has been worked on.
export function customerCanCancel(status) {
  return status === 'pending_payment' || status === 'confirmed'
}
