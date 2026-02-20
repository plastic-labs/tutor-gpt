import { Elysia } from 'elysia';

const WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS = 8;

/** In-memory sliding window rate limiter per IP */
const windows = new Map<string, number[]>();

// Clean up stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, timestamps] of windows) {
    const valid = timestamps.filter((t) => now - t < WINDOW_MS);
    if (valid.length === 0) {
      windows.delete(ip);
    } else {
      windows.set(ip, valid);
    }
  }
}, 5 * 60_000);

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  reason?: string;
}

export function checkRateLimit(ip: string): RateLimitResult {
  const now = Date.now();
  const timestamps = (windows.get(ip) ?? []).filter(
    (t) => now - t < WINDOW_MS
  );

  const remaining = Math.max(0, MAX_REQUESTS - timestamps.length);
  const resetTime = timestamps.length > 0 ? timestamps[0] + WINDOW_MS : now + WINDOW_MS;

  if (timestamps.length >= MAX_REQUESTS) {
    windows.set(ip, timestamps);
    return {
      allowed: false,
      remaining: 0,
      resetTime,
      reason: 'Too many requests. Please wait before trying again.',
    };
  }

  timestamps.push(now);
  windows.set(ip, timestamps);
  return { allowed: true, remaining: remaining - 1, resetTime };
}

export const rateLimitPlugin = new Elysia({ name: 'rateLimit' }).derive(
  { as: 'scoped' },
  ({ request }) => {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      request.headers.get('x-real-ip') ??
      '127.0.0.1';
    return { clientIp: ip };
  }
);
