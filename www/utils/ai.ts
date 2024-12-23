import { getHonchoApp, getHonchoUser, honcho } from '@/utils/honcho';
import { createClient } from '@/utils/supabase/server';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { streamText } from 'ai';
import d from 'dedent-js';

import * as Sentry from '@sentry/nextjs';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const OPENROUTER_API_KEY = process.env.AI_API_KEY;
const MODEL = process.env.MODEL || 'gpt-3.5-turbo';

const openrouter = createOpenRouter({
  // custom settings, e.g.
  // baseURL: 'https://openrouter.ai/api/v1',
  apiKey: OPENROUTER_API_KEY,
  // compatibility: 'compatible', // strict mode, enable when using the OpenAI API
  headers: {
    'HTTP-Referer': 'https://chat.bloombot.ai',
    'X-Title': 'Bloombot',
  },
  extraBody: {
    provider: {
      order: ['DeepInfra', 'Hyperbolic', 'Fireworks', 'Together', 'Lambda'],
    },
  },
});

export interface HistoryWithoutResponse {
  appId: string;
  userId: string;
  sessionId: string;
  userInput: string;
  thought?: string;
  honchoContent?: string;
}

type History = HistoryWithoutResponse & {
  aiResponse: string;
};

async function saveHistory({
  appId,
  userId,
  sessionId,
  userInput,
  thought,
  honchoContent,
  aiResponse,
}: History) {
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
        content: thought || '',
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
    Sentry.captureException(error);
    throw error; // Re-throw to be handled by caller
  }
}

export async function getUserData() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const honchoApp = await getHonchoApp();
  const honchoUser = await getHonchoUser(user.id);

  return {
    appId: honchoApp.id,
    userId: honchoUser.id,
  };
}

export const user = (
  strings: TemplateStringsArray,
  ...values: unknown[]
): Message => ({
  role: 'user',
  content: d(strings, ...values),
});

export const assistant = (
  strings: TemplateStringsArray,
  ...values: unknown[]
): Message => ({
  role: 'assistant',
  content: d(strings, ...values),
});

// export const system = (
//   strings: TemplateStringsArray,
//   ...values: unknown[]
// ): Message => ({
//   role: 'system',
//   content: d(strings, ...values),
// });

export async function createStream(
  type: string,
  messages: Message[],
  payload: HistoryWithoutResponse
) {
  try {
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
    return result.toTextStreamResponse();
  } catch (error) {
    console.error('Error in fetchOpenRouter:', error);
    Sentry.captureException(error);
    throw error;
  }
}
