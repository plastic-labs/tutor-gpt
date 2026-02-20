import { Elysia, t } from 'elysia';
import { authMiddleware } from '../middleware/auth.js';
import { honcho, getHonchoPeer, getHonchoSession } from '../services/honcho/client.js';

export const conversationRoutes = new Elysia({ prefix: '/conversations' })
  .use(authMiddleware)
  .get('/', async ({ userId }) => {
    const peer = await getHonchoPeer(userId);

    const conversations = [];
    const sessionsPage = await peer.sessions();
    for (const session of sessionsPage.items) {
      const metadata = session.metadata ?? {};
      conversations.push({
        conversationId: session.id,
        name: (metadata.name as string) ?? 'Untitled',
      });
    }
    return conversations;
  })
  .post('/', async ({ userId }) => {
    const peer = await getHonchoPeer(userId);

    const sessionId = crypto.randomUUID();
    const session = await honcho.session(sessionId);
    await session.addPeers(peer);

    return { conversationId: session.id, name: 'Untitled' };
  })
  .delete(
    '/:id',
    async ({ params }) => {
      const session = await getHonchoSession(params.id);
      await session.delete();

      return { success: true };
    },
    { params: t.Object({ id: t.String() }) }
  )
  .patch(
    '/:id',
    async ({ params, body }) => {
      const session = await getHonchoSession(params.id);
      await session.setMetadata({ name: body.name });

      return { success: true };
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({ name: t.String() }),
    }
  );
