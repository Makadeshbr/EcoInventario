import type { ApiErrorResponse } from '@/types/api';

const DEFAULT_API_BASE_URL = 'http://localhost:8080/api/v1';

export class ApiClientError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

function isApiErrorResponse(payload: unknown): payload is ApiErrorResponse {
  return typeof payload === 'object' && payload !== null && 'error' in payload;
}

type ApiFetchOptions = {
  token?: string;
  method?: string;
  body?: unknown;
  signal?: AbortSignal;
};

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const baseUrl =
    process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? DEFAULT_API_BASE_URL;
  const url = `${baseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;

  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const request: RequestInit = {
    method: options.method ?? 'GET',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    cache: 'no-store',
  };
  if (options.signal) {
    request.signal = options.signal;
  }

  const response = await fetch(url, request);

  if (response.status === 204) {
    return undefined as T;
  }

  const payload = (await response.json().catch(() => null)) as ApiErrorResponse | T | null;
  if (!response.ok) {
    const message =
      isApiErrorResponse(payload) && payload.error?.message
        ? payload.error.message
        : 'Falha ao comunicar com a API';
    throw new ApiClientError(message, response.status);
  }

  return payload as T;
}
