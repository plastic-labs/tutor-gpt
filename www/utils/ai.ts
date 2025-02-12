import { getHonchoApp, getHonchoUser } from '@/utils/honcho';
import { createClient } from '@/utils/supabase/server';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { generateObject, generateText, streamText } from 'ai';
import d from 'dedent-js';
import { z } from 'zod';

import * as Sentry from '@sentry/nextjs';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const OPENROUTER_API_KEY = process.env.AI_API_KEY;
const MODEL = process.env.MODEL || 'gpt-3.5-turbo';
const SENTRY_RELEASE = process.env.SENTRY_RELEASE || 'dev';
const SENTRY_ENVIRONMENT = process.env.SENTRY_ENVIRONMENT || 'local';

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

// export interface HistoryWithoutResponse {
//   appId: string;
//   userId: string;
//   sessionId: string;
//   userInput: string;
//   thought?: string;
//   honchoContent?: string;
// }

// type History = HistoryWithoutResponse & {
//   aiResponse: string;
// };

// async function saveHistory({
//   appId,
//   userId,
//   sessionId,
//   userInput,
//   thought,
//   honchoContent,
//   aiResponse,
// }: History) {
//   try {
//     // Create user message
//     const newUserMessage = await honcho.apps.users.sessions.messages.create(
//       appId,
//       userId,
//       sessionId,
//       {
//         is_user: true,
//         content: userInput,
//       }
//     );

//     // Save thought metamessage for user message
//     const thoughtMetamessage = `<honcho-response>${honchoContent}</honcho-response>\n<tutor>${aiResponse}</tutor>\n${userInput}`;
//     await honcho.apps.users.sessions.metamessages.create(
//       appId,
//       userId,
//       sessionId,
//       {
//         message_id: newUserMessage.id,
//         metamessage_type: 'thought',
//         content: thoughtMetamessage,
//         metadata: { type: 'user' },
//       }
//     );

//     // Create AI message
//     const newAiMessage = await honcho.apps.users.sessions.messages.create(
//       appId,
//       userId,
//       sessionId,
//       {
//         is_user: false,
//         content: aiResponse,
//       }
//     );

//     // Save thought metamessage for AI message
//     await honcho.apps.users.sessions.metamessages.create(
//       appId,
//       userId,
//       sessionId,
//       {
//         content: thought || '',
//         message_id: newAiMessage.id,
//         metamessage_type: 'thought',
//         metadata: { type: 'assistant' },
//       }
//     );

//     // Save response metamessage
//     const responseMetamessage = `<honcho-response>${honchoContent}</honcho-response>\n${userInput}`;
//     await honcho.apps.users.sessions.metamessages.create(
//       appId,
//       userId,
//       sessionId,
//       {
//         message_id: newAiMessage.id,
//         metamessage_type: 'response',
//         content: responseMetamessage,
//       }
//     );
//   } catch (error) {
//     Sentry.captureException(error);
//     throw error; // Re-throw to be handled by caller
//   }
// }

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
  const result = generateText({
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

  return result;
}

export async function createObject<T extends z.Schema>(
  messages: Message[],
  schema: T,
  metadata: {
    sessionId: string;
    userId: string;
    type: string;
  }
): Promise<z.infer<T>> {
  const result = generateObject({
    model: openrouter(MODEL),
    messages,
    // @ts-expect-error zod is not typed
    schema,
    metadata: {
      sessionId: metadata.sessionId,
      userId: metadata.userId,
      release: SENTRY_RELEASE,
      environment: SENTRY_ENVIRONMENT,
      tags: [metadata.type],
    },
  });

  return result;
}
