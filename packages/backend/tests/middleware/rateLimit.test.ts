import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock elysia so importing rateLimit.ts does not trigger the problematic
// typebox code path.  We only need the pure `checkRateLimit` function.
vi.mock('elysia', () => ({
  Elysia: vi.fn().mockImplementation(() => ({
    derive: vi.fn().mockReturnThis(),
  })),
}));

import { checkRateLimit } from '../../src/middleware/rateLimit.js';

describe('checkRateLimit', () => {
  // Each test uses a unique IP so there is no cross-test pollution from the
  // module-level `windows` Map.
  let ip: string;
  let counter = 0;

  beforeEach(() => {
    counter += 1;
    ip = `10.0.0.${counter}`;
  });

  it('allows the first request with remaining = 7', () => {
    const result = checkRateLimit(ip);

    expect(result.allowed).toBe(true);
    // MAX_REQUESTS is 8. After the first call the remaining should be 7.
    expect(result.remaining).toBe(7);
  });

  it('allows the 8th request (remaining = 0)', () => {
    // Use up requests 1-7
    for (let i = 0; i < 7; i++) {
      checkRateLimit(ip);
    }

    const result = checkRateLimit(ip); // 8th request
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(0);
  });

  it('rejects the 9th request within the same minute', () => {
    // Use up all 8 allowed requests
    for (let i = 0; i < 8; i++) {
      checkRateLimit(ip);
    }

    const result = checkRateLimit(ip); // 9th request
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.reason).toBeDefined();
    expect(result.reason).toContain('Too many requests');
  });

  it('tracks requests from different IPs independently', () => {
    const ipA = `192.168.1.${counter}`;
    const ipB = `192.168.2.${counter}`;

    // Exhaust limit for ipA
    for (let i = 0; i < 8; i++) {
      checkRateLimit(ipA);
    }

    // ipB should still be allowed
    const result = checkRateLimit(ipB);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(7);

    // ipA should be rejected
    const resultA = checkRateLimit(ipA);
    expect(resultA.allowed).toBe(false);
  });

  it('returns a resetTime that is in the future', () => {
    const before = Date.now();
    const result = checkRateLimit(ip);
    const after = Date.now();

    // resetTime must be strictly after the call time (within a small tolerance)
    expect(result.resetTime).toBeGreaterThanOrEqual(before);
    // It should be roughly now + 60 000 ms
    expect(result.resetTime).toBeLessThanOrEqual(after + 60_000 + 10);
  });
});
