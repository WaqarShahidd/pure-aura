import { QueryClient } from '@tanstack/react-query'
import { ApiError } from './api'

// The catalogue changes when an admin edits it, which is rarely, so a minute of staleness
// costs nothing and saves a refetch on every navigation.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        // Retrying a 404 just delays the NotFound page. Network blips are worth one retry.
        if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false
        return failureCount < 1
      },
    },
  },
})
