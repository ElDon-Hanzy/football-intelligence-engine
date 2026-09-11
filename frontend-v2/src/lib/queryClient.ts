import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      // C0250: production read endpoints occasionally return a transient 5xx/timeout while
      // recomputing current-state views. One retry was not enough and could make otherwise
      // populated cards render unavailable. Three total attempts remain fail-closed while
      // avoiding a single transport failure becoming a false data-gap signal.
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(750 * 2 ** attemptIndex, 3_000),
      refetchOnWindowFocus: false,
    },
  },
});