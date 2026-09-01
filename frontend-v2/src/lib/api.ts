import type { ZodType } from 'zod';

export const API_ROOT = 'https://knooiwezzsxcwhtjtdap.supabase.co/functions/v1';

export const endpoints = {
  fpl: `${API_ROOT}/fpl-api`,
  fixtures: `${API_ROOT}/fixture-intelligence-api`,
  fixtureFacts: `${API_ROOT}/fixture-facts-api`,
  market: `${API_ROOT}/betting-api`,
} as const;

export class ApiContractError extends Error {
  readonly endpoint: string;

  constructor(endpoint: string, message: string) {
    super(`API contract failed for ${endpoint}: ${message}`);
    this.name = 'ApiContractError';
    this.endpoint = endpoint;
  }
}

export async function fetchValidated<T>(url: string, schema: ZodType<T>, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, {
    cache: 'no-store',
    headers: { Accept: 'application/json' },
    ...(signal ? { signal } : {}),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} from ${url}`);
  }

  const payload: unknown = await response.json();
  const parsed = schema.safeParse(payload);

  if (!parsed.success) {
    throw new ApiContractError(url, parsed.error.issues.map((issue) => issue.message).join('; '));
  }

  return parsed.data;
}
