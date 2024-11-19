'use server';
import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { honcho, getHonchoApp } from '@/utils/honcho';
import { Message } from '@/utils/api';

const defaultMessage: Message = {
  content: `I'm your Aristotelian learning companion — here to help you follow your curiosity in whatever direction you like. My engineering makes me extremely receptive to your needs and interests. You can reply normally, and I’ll always respond!\n\nIf I&apos;m off track, just say so!\n\nNeed to leave or just done chatting? Let me know! I’m conversational by design so I’ll say goodbye 😊.`,
  isUser: false,
  id: '',
};

export async function getMessages(conversationId: string) {
  const supabase = createClient();

  const honchoApp = await getHonchoApp();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Unauthorized');
  }
  const honchoUser = await honcho.apps.users.getOrCreate(honchoApp.id, user.id);
  const session = await honcho.apps.users.sessions.get(
    honchoApp.id,
    honchoUser.id,
    conversationId
  );
  const messages = [];
  // TODO check if empty params is necessary
  for await (const message of honcho.apps.users.sessions.messages.list(
    honchoApp.id,
    honchoUser.id,
    session.id,
    {}
  )) {
    messages.push({
      id: message.id,
      content: message.content,
      isUser: message.is_user,
      metadata: message.metadata,
    });
  }

  return [defaultMessage, ...messages];
}

export async function getThought(conversationId: string, messageId: string) {
  const supabase = createClient();

  const honchoApp = await getHonchoApp();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  const honchoUser = await honcho.apps.users.getOrCreate(honchoApp.id, user.id);

  try {
    const thoughts = await honcho.apps.users.sessions.metamessages.list(
      honchoApp.id,
      honchoUser.id,
      conversationId,
      {
        message_id: messageId,
        metamessage_type: 'thought',
        filter: { type: 'assistant' },
      }
    );

    return thoughts.items[0]?.content || null;
  } catch (error) {
    console.error('Error in getThought:', error);
    throw new Error('Internal server error');
  }
}

export async function addOrRemoveReaction(
  conversationId: string,
  messageId: string,
  reaction: 'thumbs_up' | 'thumbs_down' | null
) {
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

  const honchoUser = await honcho.apps.users.getOrCreate(honchoApp.id, user.id);

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
