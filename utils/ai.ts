import { getHonchoApp, getHonchoUser } from '@/utils/honcho';
import { createClient } from '@/utils/supabase/server';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import {
  generateText as generateTextAi,
  streamText as streamTextAi,
  streamObject as streamObjectAi,
} from 'ai';
import d from 'dedent-js';

import * as Sentry from '@sentry/nextjs';
import { ZodTypeDef } from 'zod';
import { ZodType } from 'zod';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const AI_PROVIDER = process.env.AI_PROVIDER || 'openrouter';
const AI_API_KEY = process.env.AI_API_KEY;
const AI_BASE_URL = process.env.AI_BASE_URL || 'https://openrouter.ai/api/v1';
const MODEL = process.env.MODEL || 'gpt-3.5-turbo';
const SENTRY_RELEASE = process.env.SENTRY_RELEASE || 'dev';
const SENTRY_ENVIRONMENT = process.env.SENTRY_ENVIRONMENT || 'local';

const provider = createOpenAICompatible({
  name: AI_PROVIDER,
  apiKey: AI_API_KEY,
  baseURL: AI_BASE_URL,
  headers: {
    'HTTP-Referer': 'https://chat.bloombot.ai',
    'X-Title': 'Bloombot',
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

/**
 * Streams AI-generated text based on the provided parameters and user metadata.
 *
 * Adds model selection, telemetry metadata, and provider fallback options before invoking the text streaming service.
 *
 * @param params - Parameters for text streaming, including user session metadata.
 * @returns A stream of generated text from the AI provider.
 */
export function streamText(
  params: Omit<
    Parameters<typeof streamTextAi>[0],
    'model' | 'experimental_telemetry'
  > & {
    metadata: {
      sessionId: string;
      userId: string;
      type: string;
    };
  }
) {
  const result = streamTextAi({
    ...params,
    model: provider(MODEL),
    experimental_telemetry: {
      isEnabled: true,
      metadata: {
        sessionId: params.metadata.sessionId,
        userId: params.metadata.userId,
        release: SENTRY_RELEASE,
        environment: SENTRY_ENVIRONMENT,
        tags: [params.metadata.type],
      },
    },
    providerOptions: {
      openrouter: {
        order: ['DeepInfra', 'Hyperbolic', 'Fireworks', 'Together', 'Lambda'],
      },
    },
  });

  return result;
}

/**
 * Streams AI-generated structured objects validated against a provided Zod schema.
 *
 * Adds model selection, telemetry metadata, and provider fallback options before invoking the underlying streaming API.
 *
 * @param schema - The Zod schema used to validate the streamed object.
 * @param metadata - Telemetry metadata including session ID, user ID, and type tag.
 * @returns An object stream conforming to the provided schema.
 */
export function streamObject<OBJECT>(
  params: Omit<
    Parameters<typeof streamObjectAi<OBJECT>>[0],
    'model' | 'experimental_telemetry' | 'schema'
  > & {
    schema: ZodType<OBJECT, ZodTypeDef, any>;
    metadata: {
      sessionId: string;
      userId: string;
      type: string;
    };
  }
) {
  const result = streamObjectAi({
    ...params,
    model: provider(MODEL),
    experimental_telemetry: {
      isEnabled: true,
      metadata: {
        sessionId: params.metadata.sessionId,
        userId: params.metadata.userId,
        release: SENTRY_RELEASE,
        environment: SENTRY_ENVIRONMENT,
        tags: [params.metadata.type],
      },
    },
    providerOptions: {
      openrouter: {
        order: ['DeepInfra', 'Hyperbolic', 'Fireworks', 'Together', 'Lambda'],
      },
    },
  });

  return result;
}

/**
 * Generates a text completion from a sequence of messages using the configured AI provider.
 *
 * @deprecated Use {@link generateText} instead.
 *
 * @param messages - The conversation history to provide context for the completion.
 * @param metadata - Telemetry metadata including session, user, and type information.
 * @param parameters - Optional generation parameters such as temperature and token limits.
 * @returns The generated text completion.
 */
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
  const result = await generateTextAi({
    model: provider(MODEL),
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
    providerOptions: {
      openrouter: {
        order: ['DeepInfra', 'Hyperbolic', 'Fireworks', 'Together', 'Lambda'],
      },
    },
  });

  return result.text;
}

/**
 * Generates text using the configured AI provider with telemetry and metadata.
 *
 * Adds model selection, session and user metadata, Sentry release/environment, and provider fallback options to the generation request.
 *
 * @returns The result of the text generation operation.
 */
export function generateText(
  params: Omit<
    Parameters<typeof generateTextAi>[0],
    'model' | 'experimental_telemetry'
  > & {
    metadata: {
      sessionId: string;
      userId: string;
      type: string;
    };
  }
) {
  const result = generateTextAi({
    ...params,
    model: provider(MODEL),
    experimental_telemetry: {
      isEnabled: true,
      metadata: {
        sessionId: params.metadata.sessionId,
        userId: params.metadata.userId,
        release: SENTRY_RELEASE,
        environment: SENTRY_ENVIRONMENT,
        tags: [params.metadata.type],
      },
    },
    providerOptions: {
      openrouter: {
        order: ['DeepInfra', 'Hyperbolic', 'Fireworks', 'Together', 'Lambda'],
      },
    },
  });

  return result;
}
