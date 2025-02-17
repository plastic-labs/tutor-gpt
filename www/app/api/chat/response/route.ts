import { assistant, createStream, getUserData, user } from '@/utils/ai';
import { honcho } from '@/utils/honcho';
import responsePrompt from '@/utils/prompts/response';
import { NextRequest, NextResponse } from 'next/server';
import { MAX_CONTEXT_SIZE, SUMMARY_SIZE } from '@/utils/prompts/summary';
import jwt from 'jsonwebtoken'
import { JWTPayload } from '@/utils/types';

export const runtime = 'nodejs';
export const maxDuration = 100;
export const dynamic = 'force-dynamic';

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL;

export async function POST(req: NextRequest) {
  const { message, conversationId, thought, honchoThought } = await req.json();

  // console.log('honchoThought', honchoThought);

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

  // Check if we've exceeded max context size since last summary
  const messagesSinceLastSummary =
    lastSummaryMessageIndex === -1
      ? responseHistory.length
      : responseHistory.length - lastSummaryMessageIndex;

  const needsSummary = messagesSinceLastSummary >= MAX_CONTEXT_SIZE;

  const lastMessageOfSummary = needsSummary
    ? responseHistory[responseHistory.length - MAX_CONTEXT_SIZE + SUMMARY_SIZE]
    : undefined;

  console.log('lastMessageOfSummary', lastMessageOfSummary);
  console.log('messagesSinceLastSummary', messagesSinceLastSummary);
  console.log('needsSummary', needsSummary);
  console.log('lastSummary', lastSummary);
  // console.log('responseHistory', responseHistory);

  // If summary is needed, trigger background summary generation
  if (needsSummary && lastMessageOfSummary) {
    const payload: JWTPayload = {
      conversationId,
      action: 'summarize',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (60 * 5) // 5 minutes
    }
    const secret = process.env.JWT_SECRET
    if (!secret) {
      throw new Error('JWT_SECRET is not defined')
    }
    const internalToken = jwt.sign(payload, secret)

    fetch(`${baseUrl}/api/chat/summary`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${internalToken}`
      },
      body: JSON.stringify({
        conversationId,
        lastMessageOfSummaryId: lastMessageOfSummary.id,
        responseHistory,
        lastSummary,
        userId,
        appId,
      }),
    });
  }

  const getHonchoMessage = (id: string) =>
    honchoHistory.find((m) => m.message_id === id)?.content ||
    'No Honcho Message';

  const history = responseHistory.map((message) => {
    if (message.is_user) {
      return user`<context>${getHonchoMessage(message.id)}</context>
      ${message.content}`;
    } else {
      return assistant`${message.content}`;
    }
  });

  const summaryMessage = user`<past_summary>${lastSummary}</past_summary>`;
  const finalMessage = user`<context>${honchoThought}</context>

  ${message}`;

  const prompt = [...responsePrompt, summaryMessage, ...history, finalMessage];

  // console.log('responsePrompt', prompt);

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
