import { useMutation, useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'

// Payment and delivery options come from the API because they are admin-managed and, for
// gateways, feature-flagged. The storefront must not be able to offer a method the server
// would refuse - which is exactly what the old hardcoded card form did.
export function useCheckoutOptions() {
  const payment = useQuery({
    queryKey: ['payment-methods'],
    queryFn: () => api('/payment-methods'),
    staleTime: 5 * 60_000,
  })

  const delivery = useQuery({
    queryKey: ['delivery-methods'],
    queryFn: () => api('/delivery-methods'),
    staleTime: 5 * 60_000,
  })

  return {
    methods: payment.data ?? [],
    deliveryMethods: delivery.data ?? [],
    isPending: payment.isPending || delivery.isPending,
  }
}

// The cart drawer's live check as someone types a code - not authoritative. createOrder
// re-validates from scratch at the point that actually matters, the same way it already
// does for payment and delivery methods.
export function useValidateDiscount() {
  return useMutation({
    mutationFn: ({ code, subtotal }) => api('/carts/discount', { method: 'POST', body: { code, subtotal } }),
  })
}

export function usePlaceOrder() {
  return useMutation({
    mutationFn: (body) => api('/orders', { method: 'POST', body }),
  })
}

// The receipt. Looked up by the one-time token in the URL rather than router state, which
// is what makes the confirmation page survive a refresh - it used to redirect home.
export function useOrderLookup(token) {
  return useQuery({
    queryKey: ['order-lookup', token],
    queryFn: () => api(`/orders/lookup?token=${encodeURIComponent(token)}`),
    enabled: Boolean(token),
    retry: false,
  })
}

// Bank transfer proof. The order number identifies which order; the access token proves
// the uploader is the person who placed it, the same way the lookup above does.
export function useUploadProof(orderNumber, token) {
  return useMutation({
    mutationFn: (file) => {
      const body = new FormData()
      body.append('file', file)
      return api(`/orders/${encodeURIComponent(orderNumber)}/proof?token=${encodeURIComponent(token)}`, {
        method: 'POST',
        body,
      })
    },
  })
}
