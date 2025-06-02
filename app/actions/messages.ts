'use server';
import { createClient } from '@/utils/supabase/server';
import { honcho, getHonchoApp, getHonchoUser } from '@/utils/honcho';
import { Message, ThinkingData } from '@/utils/types';
import * as Sentry from '@sentry/nextjs';

/**
 * Constructs a map linking AI message IDs to their associated thinking metadata for a conversation.
 *
 * For each user message immediately followed by an AI message, retrieves related metamessages of types 'thought', 'honcho', and 'pdf', parses their contents, and assembles a {@link ThinkingData} object. Only AI messages with at least one relevant piece of thinking data are included in the resulting map.
 *
 * @param appId - The application ID.
 * @param userId - The user ID.
 * @param conversationId - The conversation/session ID.
 * @param messages - The ordered list of messages in the conversation.
 * @returns A map from AI message IDs to their corresponding {@link ThinkingData} objects. Returns an empty map if no relevant pairs or on error.
 */
async function buildThinkingDataMap(
  appId: string,
  userId: string,
  conversationId: string,
  messages: any[]
): Promise<Map<string, ThinkingData>> {
  try {
    // Create a mapping from user messages to their following AI messages
    const userToAiMessageMap = new Map<string, string>();

    for (let i = 0; i < messages.length - 1; i++) {
      const currentMessage = messages[i];
      const nextMessage = messages[i + 1];

      // If current is user and next is AI, map them
      if (currentMessage.is_user && !nextMessage.is_user) {
        userToAiMessageMap.set(currentMessage.id, nextMessage.id);
      }
    }

    // Get all user message IDs that have corresponding AI messages
    const userMessageIds = Array.from(userToAiMessageMap.keys());

    if (userMessageIds.length === 0) {
      return new Map();
    }

    // Fetch all metamessages attached to user messages in parallel
    const [allThoughts, allHoncho, allPdf] = await Promise.all([
      honcho.apps.users.metamessages.list(appId, userId, {
        session_id: conversationId,
        metamessage_type: 'thought',
        filter: { type: 'assistant' },
      }),
      honcho.apps.users.metamessages.list(appId, userId, {
        session_id: conversationId,
        metamessage_type: 'honcho',
        filter: { type: 'assistant' },
      }),
      honcho.apps.users.metamessages.list(appId, userId, {
        session_id: conversationId,
        metamessage_type: 'pdf',
        filter: { type: 'assistant' },
      }),
    ]);

    // Build maps for quick lookup by user message_id
    const thoughtsMap = new Map<string, string>();
    const honchoMap = new Map<string, string>();
    const pdfMap = new Map<string, string>();

    allThoughts.items.forEach((item) => {
      if (item.message_id && userMessageIds.includes(item.message_id)) {
        thoughtsMap.set(item.message_id, item.content);
      }
    });

    allHoncho.items.forEach((item) => {
      if (item.message_id && userMessageIds.includes(item.message_id)) {
        honchoMap.set(item.message_id, item.content);
      }
    });

    allPdf.items.forEach((item) => {
      if (item.message_id && userMessageIds.includes(item.message_id)) {
        pdfMap.set(item.message_id, item.content);
      }
    });

    // Create thinking data map keyed by AI message IDs
    const thinkingDataMap = new Map<string, ThinkingData>();

    userToAiMessageMap.forEach((aiMessageId, userMessageId) => {
      const thoughtData = thoughtsMap.get(userMessageId) || '';
      const honchoData = honchoMap.get(userMessageId) || '';
      const pdfData = pdfMap.get(userMessageId) || '';

      // Parse the thought content to extract XML if present
      let thoughtContent = '';
      let honchoQuery = '';
      let pdfQuery = '';

      if (thoughtData) {
        // Parse using new delimiter style from thought.ts
        const parts = thoughtData.split('␁');

        thoughtContent = parts[0].trim();
        honchoQuery = parts[1]?.trim() || '';
        pdfQuery = parts[2]?.trim() || '';
      }

      // Use the raw honcho and pdf data as responses
      const honchoResponse = honchoData;
      const pdfResponse = pdfData;

      // Only create thinking data if any content exists
      if (
        thoughtContent ||
        honchoQuery ||
        honchoResponse ||
        pdfQuery ||
        pdfResponse
      ) {
        thinkingDataMap.set(aiMessageId, {
          thoughtContent,
          thoughtFinished: true, // Past messages are always finished
          honchoQuery,
          honchoResponse,
          pdfQuery,
          pdfResponse,
        });
      }
    });

    return thinkingDataMap;
  } catch (error) {
    console.error('Error building thinking data map:', error);
    return new Map();
  }
}

/**
 * Retrieves all messages for a conversation, attaching thinking metadata to AI messages.
 *
 * For each message in the conversation, user messages are returned as-is, while AI messages include associated thinking data if available.
 *
 * @param conversationId - The unique identifier of the conversation whose messages are to be retrieved.
 * @returns An array of messages, with AI messages containing additional thinking metadata when present.
 *
 * @throws {Error} If the user is not authenticated.
 */
export async function getMessages(conversationId: string): Promise<Message[]> {
  return Sentry.startSpan(
    { name: 'server-action.getMessages', op: 'server.action' },
    async () => {
      const supabase = await createClient();

      const honchoApp = await getHonchoApp();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('Unauthorized');
      }
      const honchoUser = await getHonchoUser(user.id);

      // First, collect all raw messages
      const rawMessages = [];
      for await (const message of honcho.apps.users.sessions.messages.list(
        honchoApp.id,
        honchoUser.id,
        conversationId,
        {}
      )) {
        rawMessages.push(message);
      }

      // Build thinking data map using the message sequence
      const thinkingDataMap = await buildThinkingDataMap(
        honchoApp.id,
        honchoUser.id,
        conversationId,
        rawMessages
      );

      // Build final message array with thinking data properly attached
      const messages: Message[] = [];

      rawMessages.forEach((message) => {
        if (message.is_user) {
          // User message - no thinking data
          messages.push({
            id: message.id,
            content: message.content,
            isUser: true,
            metadata: message.metadata,
          });
        } else {
          // AI message - get thinking data from map
          const thinking = thinkingDataMap.get(message.id);

          messages.push({
            id: message.id,
            content: message.content,
            isUser: false,
            metadata: message.metadata,
            thinking,
          });
        }
      });

      return messages;
    }
  );
}

/**
 * Retrieves and combines the "thought," "honcho," and "pdf" metamessage content for a specific message in a conversation.
 *
 * Returns a concatenated string containing the thought, dialectic response, and PDF agent response if available, or `null` if none exist.
 *
 * @param conversationId - The ID of the conversation containing the message.
 * @param messageId - The ID of the message for which to retrieve thought data.
 * @returns The combined thought content as a string, or `null` if no relevant content is found.
 *
 * @throws {Error} If the user is unauthorized or if an internal server error occurs during retrieval.
 */
export async function getThought(conversationId: string, messageId: string) {
  return Sentry.startSpan(
    { name: 'server-action.getThought', op: 'server.action' },
    async () => {
      const supabase = await createClient();

      const honchoApp = await getHonchoApp();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('Unauthorized');
      }

      const honchoUser = await getHonchoUser(user.id);

      try {
        const [thoughts, dialectic, pdf] = await Promise.all([
          honcho.apps.users.metamessages.list(honchoApp.id, honchoUser.id, {
            session_id: conversationId,
            message_id: messageId,
            metamessage_type: 'thought',
            filter: { type: 'assistant' },
          }),
          honcho.apps.users.metamessages.list(honchoApp.id, honchoUser.id, {
            session_id: conversationId,
            message_id: messageId,
            metamessage_type: 'honcho',
            filter: { type: 'assistant' },
          }),
          honcho.apps.users.metamessages.list(honchoApp.id, honchoUser.id, {
            session_id: conversationId,
            message_id: messageId,
            metamessage_type: 'pdf',
            filter: { type: 'assistant' },
          }),
        ]);

        const thoughtText = thoughts.items[0]?.content;
        const dialecticText = dialectic.items[0]?.content;
        const pdfText = pdf.items[0]?.content;

        if (!thoughtText && !dialecticText && !pdfText) {
          return null;
        }

        let completeThought = thoughtText ?? '';

        if (dialecticText) {
          completeThought += '\n\nDialectic Response:\n\n' + dialecticText;
        }

        if (pdfText) {
          completeThought += '\n\nPDF Agent Response:\n\n' + pdfText;
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
      const supabase = await createClient();

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
