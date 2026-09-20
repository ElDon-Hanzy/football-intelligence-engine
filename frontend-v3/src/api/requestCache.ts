type CacheEntry = { expiresAt: number; value: unknown };

type CachedJsonOptions = {
  headers?: Record<string, string> | undefined;
  ttlMs?: number | undefined;
  timeoutMs?: number | undefined;
  staleIfErrorMs?: number | undefined;
  signal?: AbortSignal | undefined;
};

type StoredCacheEntry = { storedAt: number; value: unknown };

const STORAGE_PREFIX = 'fie:v3:verified-json:';

const resolved = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<unknown>>();

export async function fetchJsonCached(url: string, options: CachedJsonOptions = {}): Promise<unknown> {
  const ttlMs = Math.max(0, options.ttlMs ?? 30_000);
  const timeoutMs = Math.max(1_000, options.timeoutMs ?? 20_000);
  const staleIfErrorMs = Math.max(0, options.staleIfErrorMs ?? 0);
  const now = Date.now();
  const cached = resolved.get(url);
  if (cached && cached.expiresAt > now) return cached.value;
  if (cached) resolved.delete(url);

  let pending = inflight.get(url);
  if (!pending) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
    pending = fetch(url, {
      cache: 'no-store',
      headers: { Accept: 'application/json', ...(options.headers ?? {}) },
      signal: controller.signal,
    }).then(async (response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status} from ${url}`);
      const value: unknown = await response.json();
      if (ttlMs > 0) resolved.set(url, { value, expiresAt: Date.now() + ttlMs });
      writeStored(url, value);
      return value;
    }).catch((error: unknown) => {
      const stale = readStored(url, staleIfErrorMs);
      if (stale !== null) return stale;
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new Error(`Request timed out after ${Math.round(timeoutMs / 1000)}s: ${url}`);
      }
      throw error;
    }).finally(() => {
      window.clearTimeout(timeout);
      inflight.delete(url);
    });
    inflight.set(url, pending);
  }

  return options.signal ? awaitWithAbort(pending, options.signal) : pending;
}

function readStored(url: string, maxAgeMs: number): unknown | null {
  if (maxAgeMs <= 0) return null;
  try {
    const raw = window.sessionStorage.getItem(`${STORAGE_PREFIX}${url}`);
    if (!raw) return null;
    const entry = JSON.parse(raw) as StoredCacheEntry;
    if (!Number.isFinite(entry.storedAt) || Date.now() - entry.storedAt > maxAgeMs) return null;
    return entry.value;
  } catch {
    return null;
  }
}

function writeStored(url: string, value: unknown): void {
  try {
    window.sessionStorage.setItem(`${STORAGE_PREFIX}${url}`, JSON.stringify({ storedAt: Date.now(), value } satisfies StoredCacheEntry));
  } catch {
    // Storage can be unavailable or full; the in-memory cache still works.
  }
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
