import { createStream, getUserData, Message } from '@/utils/ai';
import { honcho } from '@/utils/honcho';
import { responsePrompt } from '@/utils/prompts/response';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 100;
export const dynamic = 'force-dynamic'; // always run dynamically

export async function POST(req: NextRequest) {
  const { message, conversationId, honchoThought } = await req.json();

  const userData = await getUserData();
  if (!userData) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const { appId, userId } = userData;

  const history: Message[] = [];
  const responseIter = await honcho.apps.users.sessions.metamessages.list(
    appId,
    userId,
    conversationId,
    {
      metamessage_type: 'response',
    }
  );

  for await (const metamessage of responseIter) {
    const associatedMessage = await honcho.apps.users.sessions.messages.get(
      appId,
      userId,
      conversationId,
      metamessage.message_id
    );

    history.push({ role: 'user', content: metamessage.content });
    history.push({ role: 'assistant', content: associatedMessage.content });
  }

  const messages = [
    ...responsePrompt,
    ...history,
    {
      role: 'user',
      content: `<honcho-response>${honchoThought}</honcho-response>\n${message}`,
    },
  ] as Message[];

  const stream = await createStream('response', messages, {
    appId,
    userId,
    sessionId: conversationId,
    userInput: message,
    honchoContent: honchoThought,
  });

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
