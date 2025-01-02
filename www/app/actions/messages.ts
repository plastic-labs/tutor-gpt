'use server';
import { createClient } from '@/utils/supabase/server';
import { honcho, getHonchoApp, getHonchoUser } from '@/utils/honcho';
import * as Sentry from '@sentry/nextjs';

export async function getMessages(conversationId: string) {
  return Sentry.startSpan(
    { name: 'server-action.getMessages', op: 'server.action' },
    async () => {
      const supabase = createClient();

      const honchoApp = await getHonchoApp();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('Unauthorized');
      }
      const honchoUser = await getHonchoUser(user.id);
      const messages = [];
      for await (const message of honcho.apps.users.sessions.messages.list(
        honchoApp.id,
        honchoUser.id,
        conversationId,
        {}
      )) {
        messages.push({
          id: message.id,
          content: message.content,
          isUser: message.is_user,
          metadata: message.metadata,
        });
      }

      return messages;
    }
  );
}

export async function getThought(conversationId: string, messageId: string) {
  return Sentry.startSpan(
    { name: 'server-action.getThought', op: 'server.action' },
    async () => {
      const supabase = createClient();

      const honchoApp = await getHonchoApp();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('Unauthorized');
      }

      const honchoUser = await getHonchoUser(user.id);

      try {
        const [thoughts, dialectic] = await Promise.all([
          honcho.apps.users.sessions.metamessages.list(
            honchoApp.id,
            honchoUser.id,
            conversationId,
            {
              message_id: messageId,
              metamessage_type: 'thought',
              filter: { type: 'assistant' },
            }
          ),
          honcho.apps.users.sessions.metamessages.list(
            honchoApp.id,
            honchoUser.id,
            conversationId,
            {
              message_id: messageId,
              metamessage_type: 'honcho',
              filter: { type: 'assistant' },
            }
          ),
        ]);

        const thoughtText = thoughts.items[0]?.content;
        const dialecticText = dialectic.items[0]?.content;

        if (!thoughtText) {
          return null;
        }

        let completeThought = thoughtText;

        if (dialecticText) {
          completeThought += '\n\nDialectic Response:\n\n' + dialecticText;
        }

        return completeThought;
      } catch (error) {
        console.error('Error in getThought:', error);
        throw new Error('Internal server error');
      }
    }
  );
}

export async function addOrRemoveReaction(
  conversationId: string,
  messageId: string,
  reaction: 'thumbs_up' | 'thumbs_down' | null
) {
  return Sentry.startSpan(
    { name: 'server-action.addOrRemoveReaction', op: 'server.action' },
    async () => {
      const supabase = createClient();

      const honchoApp = await getHonchoApp();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('Unauthorized');
      }

      if (reaction && !['thumbs_up', 'thumbs_down'].includes(reaction)) {
        throw new Error('Invalid reaction type');
      }

      const honchoUser = await getHonchoUser(user.id);

      const message = await honcho.apps.users.sessions.messages.get(
        honchoApp.id,
        honchoUser.id,
        conversationId,
        messageId
      );

      if (!message) {
        throw new Error('Message not found');
      }

      const metadata = message.metadata || {};

      if (reaction === null) {
        delete metadata.reaction;
      } else {
        metadata.reaction = reaction;
      }

      await honcho.apps.users.sessions.messages.update(
        honchoApp.id,
        honchoUser.id,
        conversationId,
        messageId,
        { metadata }
      );
    }
  );
}
