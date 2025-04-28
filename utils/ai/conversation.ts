import { honcho } from '@/utils/honcho';
import { ConversationHistory } from './types';

// Constants
export const MAX_CONTEXT_SIZE = 11;
export const SUMMARY_SIZE = 5;

export async function fetchConversationHistory(
  appId: string,
  userId: string,
  conversationId: string
): Promise<ConversationHistory> {
  const [
    messageIter,
    thoughtIter,
    honchoIter,
    pdfIter,
    summaryIter,
    collectionIter,
  ] = await Promise.all([
    honcho.apps.users.sessions.messages.list(appId, userId, conversationId, {
      reverse: true,
      size: MAX_CONTEXT_SIZE,
    }),
    honcho.apps.users.metamessages.list(
      appId,
      userId,
      {
        session_id: conversationId,
        metamessage_type: 'thought',
        reverse: true,
        size: MAX_CONTEXT_SIZE,
      }
    ),
    honcho.apps.users.metamessages.list(
      appId,
      userId,
      {
        session_id: conversationId,
        metamessage_type: 'honcho',
        reverse: true,
        size: MAX_CONTEXT_SIZE,
      }
    ),
    honcho.apps.users.metamessages.list(
      appId,
      userId,
      {
        session_id: conversationId,
        metamessage_type: 'pdf',
        reverse: true,
        size: MAX_CONTEXT_SIZE,
      }
    ),
    honcho.apps.users.metamessages.list(
      appId,
      userId,
      {
        session_id: conversationId,
        metamessage_type: 'summary',
        reverse: true,
        size: 1,
      }
    ),
    honcho.apps.users.metamessages.list(
      appId,
      userId,
      {
        session_id: conversationId,
        metamessage_type: 'collection',
        reverse: true,
        size: 1,
      }
    ),
  ]);

  return {
    messages: Array.from(messageIter.items || []).reverse(),
    thoughts: Array.from(thoughtIter.items || []).reverse(),
    honchoMessages: Array.from(honchoIter.items || []).reverse(),
    pdfMessages: Array.from(pdfIter.items || []).reverse(),
    summaries: Array.from(summaryIter.items || []),
    collectionId: collectionIter.items?.[0]?.content,
  };
}

export async function saveConversation(
  appId: string,
  userId: string,
  conversationId: string,
  userMessage: string,
  thought: string,
  honchoContent: string,
  pdfContent: string,
  response: string,
  collectionId?: string
) {
  // Save the user message and related metamessages
  const newUserMessage = await honcho.apps.users.sessions.messages.create(
    appId,
    userId,
    conversationId,
    {
      is_user: true,
      content: userMessage,
    }
  );

  // Save the thought metamessage
  await honcho.apps.users.metamessages.create(
    appId,
    userId,
    {
      session_id: conversationId,
      message_id: newUserMessage.id,
      metamessage_type: 'thought',
      content: thought || '',
      metadata: { type: 'assistant' },
    }
  );

  // Save honcho metamessage
  await honcho.apps.users.metamessages.create(
    appId,
    userId,
    {
      session_id: conversationId,
      message_id: newUserMessage.id,
      metamessage_type: 'honcho',
      content: honchoContent || '',
      metadata: { type: 'assistant' },
    }
  );

  // Save PDF metamessage
  await honcho.apps.users.metamessages.create(
    appId,
    userId,
    {
      session_id: conversationId,
      message_id: newUserMessage.id,
      metamessage_type: 'pdf',
      content: pdfContent || '',
      metadata: { type: 'assistant' },
    }
  );

  // Save collection ID metamessage if available
  if (collectionId) {
    await honcho.apps.users.metamessages.create(
      appId,
      userId,
      {
        session_id: conversationId,
        message_id: newUserMessage.id,
        metamessage_type: 'collection',
        content: collectionId,
        metadata: { type: 'assistant' },
      }
    );
  }

  // Save the assistant response
  await honcho.apps.users.sessions.messages.create(
    appId,
    userId,
    conversationId,
    {
      is_user: false,
      content: response,
    }
  );
}
