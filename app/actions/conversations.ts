'use server';

import { createClient } from '@/utils/supabase/server';
import { honcho, getHonchoApp, getHonchoUser } from '@/utils/honcho';
import * as Sentry from '@sentry/nextjs';
import { Conversation } from '@/utils/types';

// TODO add proper authorization check

export async function getConversations() {
  return Sentry.startSpan(
    { name: 'server-action.getConversations', op: 'server.action' },
    async () => {
      const supabase = await createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('Unauthorized');
      }

      const honchoApp = await getHonchoApp();
      const honchoUser = await getHonchoUser(user.id);

      const acc = [];
      for await (const convo of honcho.apps.users.sessions.list(
        honchoApp.id,
        honchoUser.id,
        { is_active: true, reverse: true }
      )) {
        const name = (convo.metadata?.name as string) ?? 'Untitled';
        const instance: Conversation = {
          conversationId: convo.id,
          name,
        };
        acc.push(instance);
      }
      return acc;
    }
  );
}

export async function createConversation() {
  return Sentry.startSpan(
    { name: 'server-action.createConversation', op: 'server.action' },
    async () => {
      const supabase = await createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('Unauthorized');
      }

      const honchoApp = await getHonchoApp();
      const honchoUser = await getHonchoUser(user.id);

      const session = await honcho.apps.users.sessions.create(
        honchoApp.id,
        honchoUser.id,
        {}
      );

      return { conversationId: session.id, name: 'Untitled' };
    }
  );
}

export async function deleteConversation(conversationId: string) {
  return Sentry.startSpan(
    { name: 'server-action.deleteConversation', op: 'server.action' },
    async () => {
      const supabase = await createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('Unauthorized');
      }

      const honchoApp = await getHonchoApp();
      const honchoUser = await getHonchoUser(user.id);

      await honcho.apps.users.sessions.delete(
        honchoApp.id,
        honchoUser.id,
        conversationId
      );

      return true;
    }
  );
}

export async function updateConversation(conversationId: string, name: string) {
  return Sentry.startSpan(
    { name: 'server-action.updateConversation', op: 'server.action' },
    async () => {
      const supabase = await createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('Unauthorized');
      }

      const honchoApp = await getHonchoApp();
      const honchoUser = await getHonchoUser(user.id);

      await honcho.apps.users.sessions.update(
        honchoApp.id,
        honchoUser.id,
        conversationId,
        { metadata: { name } }
      );

      return true;
    }
  );
}
