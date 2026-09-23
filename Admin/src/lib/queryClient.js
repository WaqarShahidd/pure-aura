import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      // 401s are handled by the axios interceptor, which retries once after refreshing.
      // Retrying again here would just multiply the requests.
      retry: false,
    },
    mutations: { retry: false },
  },
})
