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

/**
 * Provider presets with default base URLs and models.
 * Users can override any setting via environment variables.
 */
export const PROVIDER_PRESETS: Record<
  string,
  { baseURL: string; defaultModel: string; headers?: Record<string, string> }
> = {
  openrouter: {
    baseURL: 'https://openrouter.ai/api/v1',
    defaultModel: 'gpt-3.5-turbo',
    headers: {
      'HTTP-Referer': 'https://chat.bloombot.ai',
      'X-Title': 'Bloombot',
    },
  },
  minimax: {
    baseURL: 'https://api.minimax.io/v1',
    defaultModel: 'MiniMax-M2.7',
  },
};

const AI_PROVIDER = process.env.AI_PROVIDER || 'openrouter';
const AI_API_KEY = process.env.AI_API_KEY;
const preset = PROVIDER_PRESETS[AI_PROVIDER];
const AI_BASE_URL =
  process.env.AI_BASE_URL || preset?.baseURL || 'https://openrouter.ai/api/v1';
const MODEL = process.env.MODEL || preset?.defaultModel || 'gpt-3.5-turbo';
const SENTRY_RELEASE = process.env.SENTRY_RELEASE || 'dev';
const SENTRY_ENVIRONMENT = process.env.SENTRY_ENVIRONMENT || 'local';

/**
 * Clamp temperature to (0, 1] for providers like MiniMax that reject 0.
 */
export function clampTemperature(
  provider: string,
  temperature?: number
): number | undefined {
  if (temperature === undefined) return undefined;
  if (provider === 'minimax') {
    return Math.max(0.01, Math.min(temperature, 1));
  }
  return temperature;
}

const provider = createOpenAICompatible({
  name: AI_PROVIDER,
  apiKey: AI_API_KEY,
  baseURL: AI_BASE_URL,
  headers: preset?.headers ?? {},
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
    ...(params.temperature !== undefined && {
      temperature: clampTemperature(AI_PROVIDER, params.temperature),
    }),
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
    ...(AI_PROVIDER === 'openrouter' && {
      providerOptions: {
        openrouter: {
          order: [
            'DeepInfra',
            'Hyperbolic',
            'Fireworks',
            'Together',
            'Lambda',
          ],
        },
      },
    }),
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
    ...(params.temperature !== undefined && {
      temperature: clampTemperature(AI_PROVIDER, params.temperature),
    }),
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
    ...(AI_PROVIDER === 'openrouter' && {
      providerOptions: {
        openrouter: {
          order: [
            'DeepInfra',
            'Hyperbolic',
            'Fireworks',
            'Together',
            'Lambda',
          ],
        },
      },
    }),
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
    ...(parameters?.temperature !== undefined && {
      temperature: clampTemperature(AI_PROVIDER, parameters.temperature),
    }),
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
    ...(AI_PROVIDER === 'openrouter' && {
      providerOptions: {
        openrouter: {
          order: [
            'DeepInfra',
            'Hyperbolic',
            'Fireworks',
            'Together',
            'Lambda',
          ],
        },
      },
    }),
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
    ...(params.temperature !== undefined && {
      temperature: clampTemperature(AI_PROVIDER, params.temperature),
    }),
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
    ...(AI_PROVIDER === 'openrouter' && {
      providerOptions: {
        openrouter: {
          order: [
            'DeepInfra',
            'Hyperbolic',
            'Fireworks',
            'Together',
            'Lambda',
          ],
        },
      },
    }),
  });

  return result;
}
