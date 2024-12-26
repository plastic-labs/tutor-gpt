import {
  createStream,
  getUserData,
  HistoryWithoutResponse,
  Message,
  user,
  assistant,
  // parsePrompt,
} from '@/utils/ai';
import { honcho } from '@/utils/honcho';
import { thoughtPrompt } from '@/utils/prompts/thought';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 100;
export const dynamic = 'force-dynamic'; // always run dynamically

const CONTEXT_LIMIT = 10;

interface Metadata {
  summary?: string;
}

export async function POST(req: NextRequest) {
  const { message, conversationId } = await req.json();

  const userData = await getUserData();
  if (!userData) {
    return new NextResponse('Unauthorized', { status: 401 });
  }
  const { appId, userId } = userData;

  const thoughtIter = await honcho.apps.users.sessions.metamessages.list(
    appId,
    userId,
    conversationId,
    {
      metamessage_type: 'thought',
      filter: { type: 'user' },
    }
  );

  const thoughtHistory = thoughtIter.items.map(
    (metamessage) => user`${metamessage.content}`
  );

  const recentResponseMeta = await honcho.apps.users.sessions.metamessages.list(
    appId,
    userId,
    conversationId,
    {
      metamessage_type: 'response',
      filter: { type: 'user' },
      reverse: true,
      size: 1,
    }
  );

  const [recentResponse] = recentResponseMeta.items;
  const content = recentResponse?.content ?? '';

  const honchoResponse =
    content.match(/<honcho>([^]*?)<\/honcho>/)?.[1]?.trim() ?? 'None';
  const bloomResponse =
    content.match(/<tutor>([^]*?)<\/tutor>/)?.[1]?.trim() ?? 'None';

  const prompt: Message[] = [
    ...thoughtPrompt,
    ...thoughtHistory,
    {
      role: 'user',
      content: `<honcho-response>${honchoResponse}</honcho-response>\n<tutor>${bloomResponse}</tutor>\n${message}`,
    },
  ];

  const honchoPayload: HistoryWithoutResponse = {
    appId,
    userId,
    sessionId: conversationId,
    userInput: message,
  };

  console.log('Messages:\n');
  console.log(prompt);
  console.log('\n\n\n');

  const stream = await createStream('thought', prompt, honchoPayload);

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
