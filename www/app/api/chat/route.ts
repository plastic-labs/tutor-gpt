import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { thinkCall, respondCall } from './actions';
import { honcho, getHonchoApp } from '@/utils/honcho';
import { streamText } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import * as Sentry from '@sentry/nextjs';

export const runtime = 'nodejs';
export const maxDuration = 100;

const OPENROUTER_API_KEY = process.env.OPENAI_API_KEY;
const MODEL = process.env.MODEL || 'gpt-3.5-turbo';

const openrouter = createOpenRouter({
  apiKey: OPENROUTER_API_KEY,
  headers: {
    'HTTP-Referer': 'https://chat.bloombot.ai',
    'X-Title': 'Bloombot',
  },
});

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
    console.log('Successfully Saved');
  } catch (error) {
    console.error('Error in saveHistory:', error);
    Sentry.captureException(error);
    throw error; // Re-throw to be handled by caller
  }
}

async function fetchOpenRouter(type: string, messages: any[], payload: any) {
  try {
    const result = streamText({
      model: openrouter(MODEL),
      messages,
      onFinish: async (response) => {
        if (type === 'response') {
          const aiResponse = response.text;
          const finalPayload = { ...payload, aiResponse };
          await saveHistory(finalPayload);
          console.log();
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
  } catch (error) {
    console.error('Error in fetchOpenRouter:', error);
    Sentry.captureException(error);
    throw error;
  }
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

  console.log("Starting Stream")

  const honchoApp = await getHonchoApp();
  const honchoUser = await honcho.apps.users.getOrCreate(honchoApp.id, user.id);

  console.log("Got the Honcho User")

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
      console.log("Got Thought Messages")
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

    console.log("Getting the Stream")

    const stream = await fetchOpenRouter(type, messages, honchoPayload);

    if (!stream) {
      throw new Error('Failed to get stream');
    }

    console.log("Got the Stream")

    return stream;
  } catch (error) {
    console.error('Stream error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
