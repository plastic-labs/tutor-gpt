import { Elysia } from 'elysia';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { env } from '../lib/env.js';

const JWKS = createRemoteJWKSet(
  new URL(`${env.SUPABASE_URL}/auth/v1/.well-known/jwks.json`)
);

export const authMiddleware = new Elysia({ name: 'auth' }).derive(
  { as: 'scoped' },
  async ({ request }) => {
    const authorization = request.headers.get('authorization');
    if (!authorization?.startsWith('Bearer ')) {
      throw new Error('Missing or invalid authorization header');
    }

    const token = authorization.slice(7);

    try {
      const { payload } = await jwtVerify(token, JWKS, {
        issuer: `${env.SUPABASE_URL}/auth/v1`,
        audience: 'authenticated',
      });

      const userId = payload.sub;
      if (!userId) {
        throw new Error('Missing sub claim in JWT');
      }

      return { userId, email: payload.email as string | undefined };
    } catch {
      throw new Error('Invalid or expired token');
    }
  }
);
