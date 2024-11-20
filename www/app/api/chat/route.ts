import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { thinkCall, respondCall } from './actions';
import { honcho, getHonchoApp } from '@/utils/honcho';
import { streamText } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';

const OPENROUTER_API_KEY = process.env.OPENAI_API_KEY;
const MODEL = process.env.MODEL || 'gpt-3.5-turbo';

async function saveHistory({
  appId,
  userId,
  sessionId,
  userInput,
  thought,
  honchoContent,
  aiResponse,
}: {
  appId: string;
  userId: string;
  sessionId: string;
  userInput: string;
  thought: string;
  honchoContent: string;
  aiResponse: string;
}) {
  try {
    // Create user message
    const newUserMessage = await honcho.apps.users.sessions.messages.create(
      appId,
      userId,
      sessionId,
      {
        is_user: true,
        content: userInput,
      }
    );

    // Save thought metamessage for user message
    const thoughtMetamessage = `<honcho-response>${honchoContent}</honcho-response>\n<bloom>${aiResponse}</bloom>\n${userInput}`;
    await honcho.apps.users.sessions.metamessages.create(
      appId,
      userId,
      sessionId,
      {
        message_id: newUserMessage.id,
        metamessage_type: 'thought',
        content: thoughtMetamessage,
        metadata: { type: 'user' },
      }
    );

    // Create AI message
    const newAiMessage = await honcho.apps.users.sessions.messages.create(
      appId,
      userId,
      sessionId,
      {
        is_user: false,
        content: aiResponse,
      }
    );

    // Save thought metamessage for AI message
    await honcho.apps.users.sessions.metamessages.create(
      appId,
      userId,
      sessionId,
      {
        content: thought,
        message_id: newAiMessage.id,
        metamessage_type: 'thought',
        metadata: { type: 'assistant' },
      }
    );

    // Save response metamessage
    const responseMetamessage = `<honcho-response>${honchoContent}</honcho-response>\n${userInput}`;
    await honcho.apps.users.sessions.metamessages.create(
      appId,
      userId,
      sessionId,
      {
        message_id: newAiMessage.id,
        metamessage_type: 'response',
        content: responseMetamessage,
      }
    );
  } catch (error) {
    console.error('Error in saveHistory:', error);
    throw error; // Re-throw to be handled by caller
  }
}

async function fetchOpenRouter(type: string, messages: any[], payload: any) {
  const openrouter = createOpenRouter({
    apiKey: OPENROUTER_API_KEY,
    headers: {
      'HTTP-Referer': 'https://chat.bloombot.ai',
      'X-Title': 'Bloombot',
    },
  });

  const result = streamText({
    model: openrouter(MODEL),
    messages,
    onFinish: async (response) => {
      if (type === 'response') {
        const aiResponse = response.text;
        const finalPayload = { ...payload, aiResponse };
        await saveHistory(finalPayload);
      }
    },
  });
  return result.toTextStreamResponse({
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}

export async function POST(req: NextRequest) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const data = await req.json();

  const { type, message, conversationId, thought } = data;

  const honchoApp = await getHonchoApp();
  const honchoUser = await honcho.apps.users.getOrCreate(honchoApp.id, user.id);

  const honchoPayload = {
    appId: honchoApp.id,
    userId: honchoUser.id,
    sessionId: conversationId,
    userInput: message,
    thought,
  };

  try {
    let messages;
    if (type === 'thought') {
      messages = await thinkCall({
        userInput: message,
        appId: honchoApp.id,
        userId: honchoUser.id,
        sessionId: conversationId,
      });
    } else {
      const dialecticQuery = await honcho.apps.users.sessions.chat(
        honchoApp.id,
        honchoUser.id,
        conversationId,
        { queries: thought }
      );
      const honchoResponse = dialecticQuery.content;

      // @ts-ignore
      honchoPayload['honchoContent'] = honchoResponse;

      messages = await respondCall({
        userInput: message,
        appId: honchoApp.id,
        userId: honchoUser.id,
        sessionId: conversationId,
        honchoContent: honchoResponse,
      });
    }

    const stream = await fetchOpenRouter(type, messages, honchoPayload);

    if (!stream) {
      throw new Error('Failed to get stream');
    }

    return stream;
  } catch (error) {
    console.error('Stream error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
