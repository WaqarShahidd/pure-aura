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
