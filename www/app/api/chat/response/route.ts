import {
  assistant,
  createCompletion,
  createStream,
  getUserData,
  user,
} from '@/utils/ai';
import { honcho } from '@/utils/honcho';
import responsePrompt from '@/utils/prompts/response';
import summaryPrompt from '@/utils/prompts/summary';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 100;
export const dynamic = 'force-dynamic'; // always run dynamically

const MAX_CONTEXT_SIZE = 11;
const SUMMARY_SIZE = 5;

export async function POST(req: NextRequest) {
  const { message, conversationId, thought, honchoThought } = await req.json();

  console.log('honchoThought', honchoThought);

  const userData = await getUserData();
  if (!userData) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const { appId, userId } = userData;

  const [responseIter, honchoIter, summaryIter] = await Promise.all([
    honcho.apps.users.sessions.messages.list(appId, userId, conversationId, {
      reverse: true,
      size: MAX_CONTEXT_SIZE,
    }),
    honcho.apps.users.sessions.metamessages.list(
      appId,
      userId,
      conversationId,
      {
        metamessage_type: 'honcho',
        reverse: true,
        size: MAX_CONTEXT_SIZE,
      }
    ),
    honcho.apps.users.sessions.metamessages.list(
      appId,
      userId,
      conversationId,
      {
        metamessage_type: 'summary',
        reverse: true,
        size: 1,
      }
    ),
  ]);

  const responseHistory = Array.from(responseIter.items).reverse();
  const honchoHistory = Array.from(honchoIter.items).reverse();
  const summaryHistory = Array.from(summaryIter.items);

  // Get the last summary content
  const lastSummary = summaryHistory[0]?.content;

  // Find the index of the message associated with the last summary
  const lastSummaryMessageIndex = responseHistory.findIndex(
    (m) => m.id === summaryHistory[0]?.message_id
  );
  console.log('lastSummaryMessageIndex', lastSummaryMessageIndex);

  // Check if we've exceeded max context size since last summary
  const messagesSinceLastSummary =
    lastSummaryMessageIndex === -1
      ? responseHistory.length
      : responseHistory.length - lastSummaryMessageIndex;

  const needsSummary = messagesSinceLastSummary >= MAX_CONTEXT_SIZE;
  console.log('messagesSinceLastSummary', messagesSinceLastSummary);
  console.log('needsSummary', needsSummary);

  const lastMessageOfSummary = needsSummary
    ? responseHistory[responseHistory.length - MAX_CONTEXT_SIZE + SUMMARY_SIZE]
    : undefined;

  let newSummary: string | undefined;

  console.log('=== CONVERSATION STATUS ===');
  console.log('Total messages:', responseHistory.length);
  console.log('Messages since last summary:', messagesSinceLastSummary);
  console.log('Last summary message index:', lastSummaryMessageIndex);
  console.log('Last summary content:', lastSummary);
  console.log('Last message of summary:', lastMessageOfSummary?.content);
  console.log('Needs summary:', needsSummary);
  console.log('================================');
  if (needsSummary) {
    console.log('=== Starting Summary Generation ===');

    // Get the most recent MAX_CONTEXT_SIZE messages
    const recentMessages = responseHistory.slice(-MAX_CONTEXT_SIZE);
    console.log('Recent messages:', recentMessages);

    // Get the oldest SUMMARY_SIZE messages from those
    const messagesToSummarize = recentMessages.slice(0, SUMMARY_SIZE);
    console.log('Messages to summarize:', messagesToSummarize);

    // Format messages for summary prompt
    const formattedMessages = messagesToSummarize
      .map((msg) => {
        if (msg.is_user) {
          return `User: ${msg.content}`;
        }
        return `Assistant: ${msg.content}`;
      })
      .join('\n');
    console.log('Formatted messages:', formattedMessages);

    // Create summary prompt with existing summary if available
    const summaryMessages = [
      ...summaryPrompt,
      user`<new_messages>
          ${formattedMessages}
          </new_messages>

          <existing_summary>
          ${lastSummary || ''}
          </existing_summary>`,
    ];
    console.log('Summary messages:', summaryMessages);

    // Get summary response
    console.log('Creating summary completion...');
    const summaryResponse = await createCompletion(summaryMessages, {
      sessionId: conversationId,
      userId,
      type: 'summary',
    });

    if (!summaryResponse) {
      console.error('Failed to get summary response');
      throw new Error('Failed to get summary response');
    }

    console.log('Full response:', summaryResponse);

    // Extract summary from response
    const summaryMatch = summaryResponse.match(/<summary>([\s\S]*?)<\/summary/);
    newSummary = summaryMatch ? summaryMatch[1] : undefined;
    console.log('Extracted summary:', newSummary);

    console.log('=== Summary Generation Complete ===');
  }

  console.log('honchoHistory', honchoHistory);
  console.log('responseHistory', responseHistory);

  const getHonchoMessage = (id: string) =>
    honchoHistory.find((m) => m.message_id === id)?.content ||
    'No Honcho Message';

  const history = responseHistory.map((message) => {
    if (message.is_user) {
      return user`<honcho>${getHonchoMessage(message.id)}</honcho>
      ${message.content}`;
    } else {
      return assistant`${message.content}`;
    }
  });

  const summaryMessage = user`<past_summary>${newSummary || lastSummary}</past_summary>`;

  const finalMessage = user`<honcho>${honchoThought}</honcho>
  ${message}`;

  const prompt = [...responsePrompt, summaryMessage, ...history, finalMessage];

  console.log('responsePrompt', prompt);

  const response = await createStream(
    prompt,
    {
      sessionId: conversationId,
      userId,
      type: 'response',
    },
    async (response) => {
      await Promise.all([
        // Save the user message
        honcho.apps.users.sessions.messages
          .create(appId, userId, conversationId, {
            is_user: true,
            content: message,
          })
          .then(async (newUserMessage) => {
            // Save the thought metamessage
            await honcho.apps.users.sessions.metamessages.create(
              appId,
              userId,
              conversationId,
              {
                message_id: newUserMessage.id,
                metamessage_type: 'thought',
                content: thought || '',
                metadata: { type: 'assistant' },
              }
            );

            // Save honcho metamessage
            await honcho.apps.users.sessions.metamessages.create(
              appId,
              userId,
              conversationId,
              {
                message_id: newUserMessage.id,
                metamessage_type: 'honcho',
                content: honchoThought || '',
                metadata: { type: 'assistant' },
              }
            );
          }),

        // Save summary metamessage if one was created
        ...(newSummary
          ? [
              honcho.apps.users.sessions.metamessages.create(
                appId,
                userId,
                conversationId,
                {
                  message_id: lastMessageOfSummary!.id,
                  metamessage_type: 'summary',
                  content: newSummary,
                  metadata: { type: 'assistant' },
                }
              ),
            ]
          : []),
      ]);

      await honcho.apps.users.sessions.messages.create(
        appId,
        userId,
        conversationId,
        {
          is_user: false,
          content: response.text,
        }
      );
    }
  );

  if (!response) {
    throw new Error('Failed to get response');
  }
  return response;
}
