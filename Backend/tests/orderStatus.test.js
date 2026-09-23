import { describe, expect, it } from 'vitest'
import {
  ORDER_STATUSES,
  REQUIRES_FULFILMENT,
  TERMINAL_STATUSES,
  TRANSITIONS,
  allowedFor,
  canTransition,
  customerCanCancel,
} from '../src/lib/orderStatus.js'

// The transition matrix from plan/03 section 2.5, checked directly against the exported
// data rather than through the HTTP layer - this is the one source of truth the admin UI
// greys its buttons from, so a bug here is a bug in what the UI believes is possible too.

describe('canTransition', () => {
  const legalPairs = [
    ['pending_payment', 'confirmed'],
    ['pending_payment', 'cancelled'],
    ['confirmed', 'processing'],
    ['confirmed', 'cancelled'],
    ['processing', 'packed'],
    ['packed', 'handed_to_courier'],
    ['handed_to_courier', 'in_transit'],
    ['in_transit', 'out_for_delivery'],
    ['out_for_delivery', 'delivered'],
    ['out_for_delivery', 'failed_delivery'],
    ['failed_delivery', 'out_for_delivery'],
    ['failed_delivery', 'returned_to_sender'],
    ['delivered', 'refunded'],
    ['returned_to_sender', 'refunded'],
  ]

  it.each(legalPairs)('allows %s -> %s', (from, to) => {
    expect(canTransition(from, to)).toBe(true)
  })

  const illegalPairs = [
    ['pending_payment', 'delivered'],
    ['confirmed', 'delivered'],
    ['confirmed', 'handed_to_courier'],
    ['delivered', 'processing'],
    ['delivered', 'cancelled'],
    ['packed', 'in_transit'],
  ]

  it.each(illegalPairs)('refuses %s -> %s', (from, to) => {
    expect(canTransition(from, to)).toBe(false)
  })

  it('has no transitions out of a terminal status', () => {
    for (const status of TERMINAL_STATUSES) {
      expect(TRANSITIONS[status]).toEqual([])
    }
  })

  it('has an entry for every known status, so an unlisted status is never silently permissive', () => {
    for (const status of ORDER_STATUSES) {
      expect(TRANSITIONS).toHaveProperty(status)
    }
  })
})

describe('allowedFor - role gates', () => {
  it('lets staff move an order all the way to delivered or failed_delivery, nothing terminal', () => {
    expect(allowedFor('out_for_delivery', 'staff')).toEqual(['delivered', 'failed_delivery'])
  })

  it('lets staff confirm an order but not cancel it', () => {
    expect(allowedFor('pending_payment', 'staff')).toEqual(['confirmed'])
  })

  it('lets manager cancel and return, but not refund', () => {
    expect(allowedFor('pending_payment', 'manager')).toEqual(['confirmed', 'cancelled'])
    expect(allowedFor('failed_delivery', 'manager')).toEqual(['out_for_delivery', 'returned_to_sender'])
    expect(allowedFor('delivered', 'manager')).toEqual([])
  })

  it('only owner may refund - the only role that moves money', () => {
    expect(allowedFor('delivered', 'owner')).toEqual(['refunded'])
    expect(allowedFor('returned_to_sender', 'owner')).toEqual(['refunded'])
  })

  it('an unknown role gets nothing, not everything', () => {
    expect(allowedFor('confirmed', 'nobody')).toEqual([])
    expect(allowedFor('confirmed', undefined)).toEqual([])
  })

  it('is always a subset of what canTransition permits', () => {
    for (const from of ORDER_STATUSES) {
      for (const role of ['staff', 'manager', 'owner']) {
        for (const to of allowedFor(from, role)) {
          expect(canTransition(from, to)).toBe(true)
        }
      }
    }
  })
})

describe('customerCanCancel', () => {
  it('allows cancelling before the order has been worked on', () => {
    expect(customerCanCancel('pending_payment')).toBe(true)
    expect(customerCanCancel('confirmed')).toBe(true)
  })

  it('refuses once packing or shipping has started', () => {
    expect(customerCanCancel('processing')).toBe(false)
    expect(customerCanCancel('packed')).toBe(false)
    expect(customerCanCancel('handed_to_courier')).toBe(false)
    expect(customerCanCancel('delivered')).toBe(false)
  })
})

describe('REQUIRES_FULFILMENT', () => {
  it('names the one status a courier and tracking number gate', () => {
    expect(REQUIRES_FULFILMENT).toBe('handed_to_courier')
  })
})
