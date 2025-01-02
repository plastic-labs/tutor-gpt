import {
  createStream,
  getUserData,
  user,
  assistant,
  // parsePrompt,
} from '@/utils/ai';
import { honcho } from '@/utils/honcho';
import { thoughtPrompt } from '@/utils/prompts/thought';
import { createClient } from '@/utils/supabase/server';
import { getChatAccessWithUser } from '@/utils/supabase/actions';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 100;
export const dynamic = 'force-dynamic'; // always run dynamically

interface ThoughtCallProps {
  message: string;
  conversationId: string;
}

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const honchoUserData = await getUserData();
  const { message, conversationId } = (await req.json()) as ThoughtCallProps;

  const {
    data: { user: supabaseUser },
  } = await supabase.auth.getUser();

  if (!honchoUserData || !supabaseUser) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const { canChat } = await getChatAccessWithUser(supabaseUser.id);

  if (!canChat) {
    return new NextResponse('Subscription required', { status: 402 });
  }

  const { appId, userId } = honchoUserData;

  const messageIter = await honcho.apps.users.sessions.messages.list(
    appId,
    userId,
    conversationId,
    {}
  );

  const messageHistory = Array.from(messageIter.items);

  const thoughtIter = await honcho.apps.users.sessions.metamessages.list(
    appId,
    userId,
    conversationId,
    {
      metamessage_type: 'thought',
    }
  );

  const thoughtHistory = Array.from(thoughtIter.items);

  const honchoIter = await honcho.apps.users.sessions.metamessages.list(
    appId,
    userId,
    conversationId,
    {
      metamessage_type: 'honcho',
    }
  );

  const honchoHistory = Array.from(honchoIter.items);

  const history = messageHistory.map((message, i) => {
    if (message.is_user) {
      if (i == 0) {
        return user`${message.content}`;
      }
      const lastUserMessage = messageHistory[i - 2];
      const honchoResponse = honchoHistory.find(
        (h) => h.message_id === lastUserMessage.id
      );
      const tutorResponse = messageHistory[i - 1];

      return user`<honcho-response>${honchoResponse?.content || 'None'}</honcho-response>
      <tutor>${tutorResponse?.content || 'None'}</tutor>
      ${message.content}`;
    } else {
      const lastUserMessage = messageHistory[i - 1];
      const thoughtResponse = thoughtHistory.find(
        (t) => t.message_id === lastUserMessage.id
      );
      return assistant`${thoughtResponse?.content || 'None'}`;
    }
  });

  const finalMessage = user`<honcho-response>${honchoHistory[honchoHistory.length - 1]?.content || 'None'}</honcho-response>
  <tutor>${messageHistory[messageHistory.length - 1]?.content || 'None'}</tutor>
  ${message}`;

  const prompt = [...thoughtPrompt, ...history, finalMessage];

  console.log('Messages:\n');
  console.log(prompt);
  console.log('\n\n\n');

  const stream = await createStream(prompt, {
    sessionId: conversationId,
    userId,
    type: 'thought',
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
