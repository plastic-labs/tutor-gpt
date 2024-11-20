import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { thinkCall, respondCall } from './actions';
import { honcho, getHonchoApp } from '@/utils/honcho';

const OPENROUTER_API_KEY = process.env.OPENAI_API_KEY;
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
const MODEL = process.env.MODEL;

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
  const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://chat.bloombot.ai',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: messages,
      stream: true,
    }),
  });

  let acc = '';
  let jsonBuffer = ''; // Buffer for incomplete JSON

  const stream = new TransformStream({
    async transform(chunk, controller) {
      const text = new TextDecoder().decode(chunk);
      const lines = text.split('\n').filter((line) => line.trim() !== '');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') {
            if (type === 'response') {
              const finalPayload = { ...payload, aiResponse: acc };
              await saveHistory(finalPayload);
            }
            return;
          }
          jsonBuffer += data;
          try {
            const parsed = JSON.parse(jsonBuffer);
            // If successful, clear the buffer
            jsonBuffer = '';
            const content = parsed.choices[0]?.delta?.content || '';
            if (content) {
              acc += content;
              controller.enqueue(content);
            }
          } catch (e) {
            console.error('Error parsing JSON:', e);
            // If it fails to parse, keep the partial JSON in buffer
            // and wait for next chunk
            continue;
          }
        }
      }
    },
    // flush(controller) {
    // controller.terminate();
    // },
  });

  return response.body?.pipeThrough(stream);
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

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Stream error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
