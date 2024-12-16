import {
  createStream,
  getUserData,
  HistoryWithoutResponse,
  Message,
  // parsePrompt,
} from '@/utils/ai';
import { honcho } from '@/utils/honcho';
import { render } from '@/utils/prompts/lib';
import { thoughtPrompt } from '@/utils/prompts/thought';
// import { readFileSync } from 'fs';
import { NextRequest, NextResponse } from 'next/server';
// import path from 'path';

// const thoughtPrompt = readFileSync(
//   path.join(process.cwd(), 'utils/prompts/thought.md')
// );

export async function POST(req: NextRequest) {
  const { message, conversationId } = await req.json();

  const userData = await getUserData();
  if (!userData) {
    return new NextResponse('Unauthorized', { status: 401 });
  }
  const { appId, userId } = userData;

  const thoughtHistory: Message[] = [];
  const thoughtIter = await honcho.apps.users.sessions.metamessages.list(
    appId,
    userId,
    conversationId,
    {
      metamessage_type: 'thought',
      filter: { type: 'user' },
    }
  );

  for await (const metamessage of thoughtIter) {
    if (metamessage.metadata?.type === 'user') {
      thoughtHistory.push({ role: 'user', content: metamessage.content });
    } else {
      thoughtHistory.push({ role: 'assistant', content: metamessage.content });
    }
  }

  const promptMessages = render(thoughtPrompt, thoughtHistory);

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

  let honchoResponse = 'None';
  let bloomResponse = 'None';

  const responseMetaList = recentResponseMeta.items;
  if (responseMetaList.length > 0) {
    const content = responseMetaList[0].content;
    honchoResponse =
      content.match(/<honcho>([^]*?)<\/honcho>/)?.[1]?.trim() ?? 'None';
    bloomResponse =
      content.match(/<bloom>([^]*?)<\/bloom>/)?.[1]?.trim() ?? 'None';
  }

  const messages = [
    ...promptMessages,
    {
      role: 'user',
      content: `<honcho-response>${honchoResponse}</honcho-response>\n<bloom>${bloomResponse}</bloom>\n${message}`,
    },
  ] as Message[];

  const honchoPayload: HistoryWithoutResponse = {
    appId,
    userId,
    sessionId: conversationId,
    userInput: message,
  };

  const stream = await createStream('thought', messages, honchoPayload);

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
