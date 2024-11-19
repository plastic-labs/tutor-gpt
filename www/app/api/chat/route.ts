import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

const OPENROUTER_API_KEY = process.env.OPENAI_API_KEY;
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
const MODEL = process.env.MODEL;

async function fetchOpenRouter(messages: any[]) {
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

  const stream = new TransformStream({
    async transform(chunk, controller) {
      const text = new TextDecoder().decode(chunk);
      const lines = text.split('\n').filter((line) => line.trim() !== '');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') {
            controller.terminate(); // Properly terminate when done
            return;
          }
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices[0]?.delta?.content || '';
            if (content) {
              controller.enqueue(content);
            }
          } catch (e) {
            console.error('Error parsing JSON:', e);
          }
        }
      }
    },
    flush(controller) {
      controller.terminate();
    },
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

  console.log(data);

  const { type, message, conversationId, thought, honchoContent } = data;

  try {
    let messages;
    if (type === 'thought') {
      messages = [
        {
          role: 'system',
          content:
            'You are an AI assistant that thinks carefully about how to respond.',
        },
        { role: 'user', content: message },
      ];
    } else {
      messages = [
        { role: 'system', content: 'You are a helpful AI assistant.' },
        {
          role: 'user',
          content: `Thought: ${thought}\nHoncho Content: ${honchoContent}\nUser Message: ${message}`,
        },
      ];

      // Store user message for response type
      // const { error: messageError } = await supabase
      //   .from('messages')
      //   .insert({
      //     conversation_id: conversationId,
      //     user_id: user.id,
      //     content: message,
      //     role: 'user'
      //   });

      // if (messageError) throw messageError;
    }

    const stream = await fetchOpenRouter(messages);

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
