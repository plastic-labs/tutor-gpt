import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { swagger } from '@elysiajs/swagger';
import { env } from './lib/env.js';
import { webhookRoutes } from './routes/webhook.js';
import { chatRoutes } from './routes/chat.js';
import { conversationRoutes } from './routes/conversations.js';
import { messageRoutes, reactionRoutes } from './routes/messages.js';
import { artifactRoutes } from './routes/artifacts.js';
import { settingsRoutes } from './routes/settings.js';

const app = new Elysia()
  // Swagger docs
  .use(
    swagger({
      documentation: {
        info: {
          title: 'Bloom API',
          version: '0.1.0',
          description: 'Bloombot learning companion API',
        },
      },
    })
  )
  // CORS
  .use(
    cors({
      origin: env.FRONTEND_URL,
      credentials: true,
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-BYOK-Config',
        'Stripe-Signature',
      ],
    })
  )
  // Error handling
  .onError(({ error, set }) => {
    const message = error instanceof Error ? error.message : String(error);
    if (message === 'Missing or invalid authorization header') {
      set.status = 401;
      return { error: 'Unauthorized' };
    }
    if (message === 'Invalid or expired token') {
      set.status = 401;
      return { error: 'Invalid or expired token' };
    }
    console.error('Unhandled error:', error);
    set.status = 500;
    return { error: 'Internal server error' };
  })
  // Webhook route registered BEFORE auth middleware (Stripe calls it unauthenticated)
  .use(webhookRoutes)
  // Authenticated routes
  .use(chatRoutes)
  .use(conversationRoutes)
  .use(messageRoutes)
  .use(reactionRoutes)
  .use(artifactRoutes)
  .use(settingsRoutes)
  // Health check
  .get('/health', () => ({ status: 'ok', timestamp: new Date().toISOString() }))
  .listen(env.PORT);

console.log(`Bloom API running at ${app.server?.hostname}:${app.server?.port}`);

// Export type for Eden Treaty type inference
export type App = typeof app;
