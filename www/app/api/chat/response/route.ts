import {
  assistant,
  createStream,
  getUserData,
  Message,
  user,
} from '@/utils/ai';
import { honcho } from '@/utils/honcho';
import { responsePrompt } from '@/utils/prompts/response';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 100;
export const dynamic = 'force-dynamic'; // always run dynamically

export async function POST(req: NextRequest) {
  const { message, conversationId, thought, honchoThought } = await req.json();

  console.log('honchoThought', honchoThought);

  const userData = await getUserData();
  if (!userData) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const { appId, userId } = userData;

  const responseIter = await honcho.apps.users.sessions.messages.list(
    appId,
    userId,
    conversationId,
    {}
  );

  const responseHistory = Array.from(responseIter.items);

  const honchoIter = await honcho.apps.users.sessions.metamessages.list(
    appId,
    userId,
    conversationId,
    {
      metamessage_type: 'honcho',
    }
  );

  const honchoHistory = Array.from(honchoIter.items);

  const history = responseHistory.map((message) => {
    if (message.is_user) {
      return user`<honcho>${honchoHistory.find((m) => (m.message_id = message.id))}</honcho>
      ${message.content}`;
    } else {
      return assistant`${message.content}`;
    }
  });

  const finalMessage = user`<honcho>${honchoThought}</honcho>
  ${message}`;

  const prompt = [...responsePrompt, ...history, finalMessage];

  console.log('responsePrompt', prompt);

  // Create logs directory if it doesn't exist

  const stream = await createStream(
    prompt,
    {
      sessionId: conversationId,
      userId,
      type: 'response',
    },
    async (response) => {
      const newUserMessage = await honcho.apps.users.sessions.messages.create(
        appId,
        userId,
        conversationId,
        {
          is_user: true,
          content: message,
        }
      );

      // Execute all requests in parallel
      await Promise.all([
        // Save the thought metamessage
        honcho.apps.users.sessions.metamessages.create(
          appId,
          userId,
          conversationId,
          {
            message_id: newUserMessage.id,
            metamessage_type: 'thought',
            content: thought || '',
            metadata: { type: 'assistant' },
          }
        ),

        // Save honcho metamessage
        honcho.apps.users.sessions.metamessages.create(
          appId,
          userId,
          conversationId,
          {
            message_id: newUserMessage.id,
            metamessage_type: 'honcho',
            content: honchoThought || '',
            metadata: { type: 'assistant' },
          }
        ),

        // Save assistant message
        honcho.apps.users.sessions.messages.create(
          appId,
          userId,
          conversationId,
          {
            is_user: false,
            content: response.text,
          }
        ),
      ]);
    }
  );

  if (!stream) {
    throw new Error('Failed to get stream');
  }

  return new NextResponse(stream.body, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
