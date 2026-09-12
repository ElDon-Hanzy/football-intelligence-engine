import { QueryClient, dehydrate, hydrate, type DehydratedState } from '@tanstack/react-query';

const CACHE_KEY = 'fie-v2-api-cache';
const CACHE_BUSTER = 'c0253-v1';
const CACHE_MAX_AGE_MS = 15 * 60_000;
const MAX_PERSISTED_QUERIES = 8;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // C0253: current UI data remains fresh for one minute. After that React Query shows
      // the last successful snapshot immediately and revalidates it in the background.
      staleTime: 60_000,
      gcTime: 30 * 60_000,
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(300 * 2 ** attemptIndex, 1_200),
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
  },
});

type PersistedApiCache = {
  buster: string;
  savedAt: number;
  state: DehydratedState;
};

function restorePersistedCache(): void {
  try {
    const raw = window.sessionStorage.getItem(CACHE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as PersistedApiCache;
    if (parsed.buster !== CACHE_BUSTER || !Number.isFinite(parsed.savedAt) || Date.now() - parsed.savedAt > CACHE_MAX_AGE_MS) {
      window.sessionStorage.removeItem(CACHE_KEY);
      return;
    }
    hydrate(queryClient, parsed.state);
  } catch {
    // Storage can be disabled by browser privacy settings. Falling back to memory-only
    // caching must never prevent the website from loading live data.
  }
}

function persistApiCache(): void {
  try {
    const state = dehydrate(queryClient, {
      shouldDehydrateQuery: (query) => query.state.status === 'success'
        && Array.isArray(query.queryKey)
        && query.queryKey[0] === 'api',
    });
    let queries = [...state.queries]
      .sort((a, b) => (b.state.dataUpdatedAt ?? 0) - (a.state.dataUpdatedAt ?? 0))
      .slice(0, MAX_PERSISTED_QUERIES);

    // Keep the freshest successful responses if the browser gives this tab a small
    // sessionStorage quota. This prevents a large historical FPL payload from breaking
    // persistence for the current Gameweek.
    while (true) {
      const payload: PersistedApiCache = {
        buster: CACHE_BUSTER,
        savedAt: Date.now(),
        state: { ...state, queries },
      };
      try {
        window.sessionStorage.setItem(CACHE_KEY, JSON.stringify(payload));
        return;
      } catch {
        if (queries.length === 0) return;
        queries = queries.slice(0, -1);
      }
    }
  } catch {
    // Persistence is an acceleration layer only. Live API loading remains authoritative.
  }
}

if (typeof window !== 'undefined') {
  restorePersistedCache();
  let persistTimer: number | undefined;
  queryClient.getQueryCache().subscribe(() => {
    if (persistTimer != null) window.clearTimeout(persistTimer);
    persistTimer = window.setTimeout(persistApiCache, 250);
  });
  window.addEventListener('pagehide', persistApiCache);
}
