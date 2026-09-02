import type { ZodType } from 'zod';

export const API_ROOT = 'https://knooiwezzsxcwhtjtdap.supabase.co/functions/v1';

// Supabase's legacy anon JWT is a public browser credential, not a secret.
// It is used only to satisfy JWT verification on read-only public UI endpoints.
export const PUBLIC_SUPABASE_ANON_JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJIUzI1NiIsInJlZiI6Imtub29pd2V6enN4Y3dodGp0ZGFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODczMzY0MjQsImV4cCI6MjEwMjkxMjQyNH0.V22pHe1g39CnFGTYUX-39Teg_EEmr3kns_Fwbdi4kiQ';

export const publicGatewayHeaders = {
  Authorization: `Bearer ${PUBLIC_SUPABASE_ANON_JWT}`,
  apikey: PUBLIC_SUPABASE_ANON_JWT,
} as const;

export const endpoints = {
  fpl: `${API_ROOT}/fpl-api`,
  managerPlan: `${API_ROOT}/fpl-manager-plan-api`,
  fixtures: `${API_ROOT}/fixture-intelligence-api`,
  fixtureFacts: `${API_ROOT}/fixture-facts-api`,
  market: `${API_ROOT}/betting-api`,
  gameweekStatus: `${API_ROOT}/gameweek-status-api`,
} as const;

export class ApiContractError extends Error {
  readonly endpoint: string;

  constructor(endpoint: string, message: string) {
    super(`API contract failed for ${endpoint}: ${message}`);
    this.name = 'ApiContractError';
    this.endpoint = endpoint;
  }
}

export async function fetchValidated<T>(
  url: string,
  schema: ZodType<T>,
  signal?: AbortSignal,
  extraHeaders?: Record<string, string>,
): Promise<T> {
  const response = await fetch(url, {
    cache: 'no-store',
    headers: { Accept: 'application/json', ...(extraHeaders ?? {}) },
    ...(signal ? { signal } : {}),
  });

  if (!response.ok) throw new Error(`HTTP ${response.status} from ${url}`);

  const payload: unknown = await response.json();
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    throw new ApiContractError(url, parsed.error.issues.map((issue) => issue.message).join('; '));
  }
  return parsed.data;
}
