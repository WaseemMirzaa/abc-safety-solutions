import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 1000 * 60 * 30,
      retry: 3,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 12_000),
    },
  },
})
