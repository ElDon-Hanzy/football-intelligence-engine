type CacheEntry = { expiresAt: number; value: unknown };

type CachedJsonOptions = {
  headers?: Record<string, string> | undefined;
  ttlMs?: number | undefined;
  signal?: AbortSignal | undefined;
};

const resolved = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<unknown>>();

export async function fetchJsonCached(url: string, options: CachedJsonOptions = {}): Promise<unknown> {
  const ttlMs = Math.max(0, options.ttlMs ?? 30_000);
  const now = Date.now();
  const cached = resolved.get(url);
  if (cached && cached.expiresAt > now) return cached.value;
  if (cached) resolved.delete(url);

  let pending = inflight.get(url);
  if (!pending) {
    pending = fetch(url, {
      cache: 'no-store',
      headers: { Accept: 'application/json', ...(options.headers ?? {}) },
    }).then(async (response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status} from ${url}`);
      const value: unknown = await response.json();
      if (ttlMs > 0) resolved.set(url, { value, expiresAt: Date.now() + ttlMs });
      return value;
    }).finally(() => inflight.delete(url));
    inflight.set(url, pending);
  }

  return options.signal ? awaitWithAbort(pending, options.signal) : pending;
}

function awaitWithAbort<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) return Promise.reject(new DOMException('Aborted', 'AbortError'));
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(new DOMException('Aborted', 'AbortError'));
    signal.addEventListener('abort', onAbort, { once: true });
    promise.then(
      (value) => { signal.removeEventListener('abort', onAbort); resolve(value); },
      (error) => { signal.removeEventListener('abort', onAbort); reject(error); },
    );
  });
}
