import { treaty } from '@elysiajs/eden';
import type { App } from '@bloom/backend';
import { useAuthStore } from '@/stores/authStore';

export const api = treaty<App>(import.meta.env.VITE_API_URL ?? 'http://localhost:3001', {
  headers: () => {
    const token = useAuthStore.getState().accessToken;
    return token ? { authorization: `Bearer ${token}` } : {};
  },
});

/** Raw fetch for SSE streaming endpoints */
export async function fetchStream(
  path: string,
  body: Record<string, unknown>,
  options?: { byokConfig?: Record<string, unknown>; signal?: AbortSignal }
) {
  const token = useAuthStore.getState().accessToken;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers.authorization = `Bearer ${token}`;
  }

  if (options?.byokConfig) {
    headers['x-byok-config'] = JSON.stringify(options.byokConfig);
  }

  const response = await fetch(`${import.meta.env.VITE_API_URL}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal: options?.signal,
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  return response;
}
