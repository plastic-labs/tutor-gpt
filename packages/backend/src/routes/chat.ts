import { Elysia, t } from 'elysia';
import { authMiddleware } from '../middleware/auth.js';
import { rateLimitPlugin, checkRateLimit } from '../middleware/rateLimit.js';
import { respond } from '../services/ai/agents/response.js';
import { generateText, user } from '../services/ai/provider.js';
import { namePrompt } from '../services/ai/prompts.js';
import { getChatAccess } from '../services/supabase/queries.js';
import { decrementFreeMessages } from '../services/supabase/admin.js';
import { byokConfigSchema } from '@bloom/shared/schemas';
import type { StreamChunk, BYOKConfig } from '@bloom/shared/types';

export const chatRoutes = new Elysia({ prefix: '/chat' })
  .use(authMiddleware)
  .use(rateLimitPlugin)
  .post(
    '/',
    async function* ({ body, userId, clientIp, request }) {
      // Rate limiting
      const rateLimitResult = checkRateLimit(clientIp);
      if (!rateLimitResult.allowed) {
        yield {
          type: 'error',
          message: 'Rate limit exceeded. Please wait before trying again.',
        } satisfies StreamChunk;
        return;
      }

      // Parse BYOK config from header
      let byokConfig: BYOKConfig | undefined;
      const byokHeader = request.headers.get('x-byok-config');
      if (byokHeader) {
        try {
          byokConfig = byokConfigSchema.parse(JSON.parse(byokHeader));
        } catch {
          yield { type: 'error', message: 'Invalid BYOK configuration' } satisfies StreamChunk;
          return;
        }
      }

      // Check chat access (skip if BYOK)
      if (!byokConfig?.enabled) {
        const access = await getChatAccess(userId);
        if (!access.canChat) {
          yield {
            type: 'error',
            message: 'No active subscription or free messages remaining.',
          } satisfies StreamChunk;
          return;
        }

        // Decrement free messages if trialing
        if (!access.isSubscribed && access.freeMessages > 0) {
          await decrementFreeMessages(userId);
        }
      }

      // Stream response
      for await (const chunk of respond({
        message: body.message,
        conversationId: body.conversationId,
        userId,
        byokConfig,
      })) {
        yield chunk;
      }
    },
    {
      body: t.Object({
        message: t.String(),
        conversationId: t.String(),
      }),
    }
  )
  .post(
    '/name',
    async ({ body, userId }) => {
      const finalMessage = user`${body.message}`;
      const prompt = [...namePrompt, finalMessage];

      const result = await generateText({
        messages: prompt,
        maxTokens: 10,
        metadata: {
          sessionId: 'name',
          userId,
          type: 'name',
        },
      });

      return { name: result.text };
    },
    {
      body: t.Object({
        message: t.String(),
        conversationId: t.String(),
      }),
    }
  );
