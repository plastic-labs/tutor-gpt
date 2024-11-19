'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { honcho, getHonchoApp } from '@/utils/honcho';

// TODO add proper authorization check

type Conversation = {
  conversationId: string;
  name: string;
}

export async function getConversations() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  const honchoApp = await getHonchoApp();

  const honchoUser = await honcho.apps.users.getOrCreate(honchoApp.id, user.id)

  const acc = []
  for await (const convo of honcho.apps.users.sessions.list(
    honchoApp.id, honchoUser.id, { is_active: true, reverse: true }
  )) {
    const name = convo.metadata?.name as string ?? 'Untitled'
    const instance: Conversation = {
      conversationId: convo.id,
      name,
    }
    acc.push(instance)
  }
  return acc
}

export async function createConversation() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  const honchoApp = await getHonchoApp();
  const honchoUser = await honcho.apps.users.getOrCreate(honchoApp.id, user.id);

  const session = await honcho.apps.users.sessions.create(honchoApp.id, honchoUser.id, {});

  return { conversationId: session.id, name: 'Untitled' };
}

export async function deleteConversation(conversationId: string) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  const honchoApp = await getHonchoApp();
  const honchoUser = await honcho.apps.users.getOrCreate(honchoApp.id, user.id);

  await honcho.apps.users.sessions.delete(honchoApp.id, honchoUser.id, conversationId);

  return true;
}

export async function updateConversation(conversationId: string, name: string) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  const honchoApp = await getHonchoApp();
  const honchoUser = await honcho.apps.users.getOrCreate(honchoApp.id, user.id);

  await honcho.apps.users.sessions.update(
    honchoApp.id,
    honchoUser.id,
    conversationId,
    { metadata: { name } }
  );

  return true;
}






