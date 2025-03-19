import { getHonchoApp, getHonchoUser } from '@/utils/honcho';
import { createClient } from '@/utils/supabase/server';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { generateText, streamText } from 'ai';
import d from 'dedent-js';

import * as Sentry from '@sentry/nextjs';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const OPENROUTER_API_KEY = process.env.AI_API_KEY;
const MODEL = process.env.MODEL || 'gpt-3.5-turbo';
const SENTRY_RELEASE = process.env.SENTRY_RELEASE || 'dev';
const SENTRY_ENVIRONMENT = process.env.SENTRY_ENVIRONMENT || 'local';

if (!OPENROUTER_API_KEY) {
  throw new Error('OpenRouter API key is not configured. Please set the AI_API_KEY environment variable.');
}

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

export async function getUserData() {
  const supabase = await createClient();

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

export async function createStream(
  messages: Message[],
  metadata: {
    sessionId: string;
    userId: string;
    type: string;
  },
  onFinish?: (response: { text: string }) => Promise<void>
) {
  try {
    const result = streamText({
      model: openrouter(MODEL),
      messages,
      ...(onFinish && { onFinish }),
      experimental_telemetry: {
        isEnabled: true,
        metadata: {
          sessionId: metadata.sessionId,
          userId: metadata.userId,
          release: SENTRY_RELEASE,
          environment: SENTRY_ENVIRONMENT,
          tags: [metadata.type],
        },
      },
    });
    return result.toTextStreamResponse();
  } catch (error) {
    console.error('Error in fetchOpenRouter:', error);
    Sentry.captureException(error);
    throw error;
  }
}

export async function createCompletion(
  messages: Message[],
  metadata: {
    sessionId: string;
    userId: string;
    type: string;
  },
  parameters?: {
    temperature?: number;
    max_tokens?: number;
    top_p?: number;
    frequency_penalty?: number;
    presence_penalty?: number;
  }
) {
  const result = await generateText({
    model: openrouter(MODEL),
    messages,
    ...parameters,
    experimental_telemetry: {
      isEnabled: true,
      metadata: {
        sessionId: metadata.sessionId,
        userId: metadata.userId,
        release: SENTRY_RELEASE,
        environment: SENTRY_ENVIRONMENT,
        tags: [metadata.type],
      },
    },
  });

  return result.text;
}
