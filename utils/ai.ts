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
 * @deprecated Use generateText instead
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
