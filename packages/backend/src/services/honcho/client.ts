import { Honcho } from '@honcho-ai/sdk';
import type { Peer, Session } from '@honcho-ai/sdk';
import { env } from '../../lib/env.js';

export const honcho = new Honcho({
  apiKey: env.HONCHO_API_KEY,
  environment: env.HONCHO_ENV as 'production' | 'local' | undefined,
});

// Cache for peer/session lookups
const peerCache = new Map<string, { value: Peer; expires: number }>();
const sessionCache = new Map<string, { value: Session; expires: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function getHonchoPeer(supabaseUserId: string): Promise<Peer> {
  const key = `peer:${supabaseUserId}`;
  const cached = peerCache.get(key);
  if (cached && cached.expires > Date.now()) {
    return cached.value;
  }

  const peer = await honcho.peer(supabaseUserId);
  peerCache.set(key, { value: peer, expires: Date.now() + CACHE_TTL });
  return peer;
}

export async function getHonchoSession(sessionId: string): Promise<Session> {
  const key = `session:${sessionId}`;
  const cached = sessionCache.get(key);
  if (cached && cached.expires > Date.now()) {
    return cached.value;
  }

  const session = await honcho.session(sessionId);
  sessionCache.set(key, { value: session, expires: Date.now() + CACHE_TTL });
  return session;
}
