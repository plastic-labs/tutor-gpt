import { Elysia, t } from 'elysia';
import { authMiddleware } from '../middleware/auth.js';
import { getHonchoPeer, getHonchoSession } from '../services/honcho/client.js';
import type { Message } from '@bloom/shared/types';

export const messageRoutes = new Elysia({ prefix: '/conversations' })
  .use(authMiddleware)
  .get(
    '/:id/messages',
    async ({ params, userId }) => {
      const peer = await getHonchoPeer(userId);
      const session = await getHonchoSession(params.id);

      const messagesPage = await session.messages();
      const rawMessages = messagesPage.items;

      // Build final message array
      const messages: Message[] = rawMessages.map((msg) => {
        const isUser = msg.peerId === peer.id;
        if (isUser) {
          return {
            id: msg.id,
            content: msg.content,
            isUser: true as const,
            metadata: msg.metadata ?? {},
          };
        }
        return {
          id: msg.id,
          content: msg.content,
          isUser: false as const,
          metadata: msg.metadata ?? {},
        };
      });

      return messages;
    },
    { params: t.Object({ id: t.String() }) }
  );

export const reactionRoutes = new Elysia({ prefix: '/messages' })
  .use(authMiddleware)
  .post(
    '/:id/reaction',
    async ({ params, body }) => {
      const session = await getHonchoSession(body.conversationId);

      const messagesPage = await session.messages();
      const message = messagesPage.items.find((m) => m.id === params.id);
      if (!message) throw new Error('Message not found');

      const metadata: Record<string, unknown> = { ...message.metadata };
      if (body.reaction === null) {
        delete metadata.reaction;
      } else {
        metadata.reaction = body.reaction;
      }

      await session.updateMessage(message, metadata);

      return { success: true };
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({
        conversationId: t.String(),
        reaction: t.Union([
          t.Literal('thumbs_up'),
          t.Literal('thumbs_down'),
          t.Null(),
        ]),
      }),
    }
  );
