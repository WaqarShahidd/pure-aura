import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useAuth } from '../context/useAuth'

// The seam data/account.js never had.
//
// catalog.js was deliberately built as a swap point, so moving the catalogue to the API
// was a change in one file. account.js had no such layer - six components imported the
// `orders`, `addresses` and `account` arrays directly - which is why this module exists
// rather than that one simply becoming async like its sibling.
//
// The mutations here are what finally make AddressBook's Add, Edit and Remove buttons do
// something: they have been rendered as bare <button> elements with no onClick since the
// day they were written.

const ACCOUNT = ['account']

export function useProfile() {
  const { isSignedIn } = useAuth()
  return useQuery({
    queryKey: [...ACCOUNT, 'profile'],
    queryFn: () => api('/me'),
    enabled: isSignedIn,
  })
}

export function useAddresses() {
  const { isSignedIn } = useAuth()
  return useQuery({
    queryKey: [...ACCOUNT, 'addresses'],
    queryFn: () => api('/me/addresses'),
    enabled: isSignedIn,
  })
}

export function useOrders() {
  const { isSignedIn } = useAuth()
  return useQuery({
    queryKey: [...ACCOUNT, 'orders'],
    queryFn: () => api('/me/orders'),
    enabled: isSignedIn,
  })
}

export function useOrder(number) {
  const { isSignedIn } = useAuth()
  return useQuery({
    queryKey: [...ACCOUNT, 'orders', number],
    queryFn: () => api(`/me/orders/${encodeURIComponent(number)}`),
    enabled: isSignedIn && Boolean(number),
  })
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()
  const { setCustomer } = useAuth()

  return useMutation({
    mutationFn: (values) => api('/me', { method: 'PATCH', body: values }),
    onSuccess: (customer) => {
      setCustomer(customer)
      queryClient.invalidateQueries({ queryKey: [...ACCOUNT, 'profile'] })
    },
  })
}

// Address mutations all invalidate the same list rather than patching the cache by hand:
// setting one address as default clears the flag on another, so a local edit would need
// to replicate a server-side rule to stay correct.
function useAddressMutation(mutationFn) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [...ACCOUNT, 'addresses'] }),
  })
}

export function useCreateAddress() {
  return useAddressMutation((values) => api('/me/addresses', { method: 'POST', body: values }))
}

export function useUpdateAddress() {
  return useAddressMutation(({ id, ...values }) =>
    api(`/me/addresses/${id}`, { method: 'PATCH', body: values }),
  )
}

export function useDeleteAddress() {
  return useAddressMutation((id) => api(`/me/addresses/${id}`, { method: 'DELETE' }))
}

export function useCancelOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (number) =>
      api(`/me/orders/${encodeURIComponent(number)}/cancel`, { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [...ACCOUNT, 'orders'] }),
  })
}

// orderSubtotal and orderTotal are gone: the server sends the numbers, computed once at
// purchase time and held to by a CHECK constraint. This one survives because it is a
// property of the array, not of the money.
export function orderItemCount(order) {
  return (order?.items ?? []).reduce((total, item) => total + item.quantity, 0)
}
