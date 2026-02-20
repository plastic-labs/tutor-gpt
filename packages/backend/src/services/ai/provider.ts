import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import {
  streamText as streamTextAi,
  generateText as generateTextAi,
} from 'ai';
import d from 'dedent-js';
import { env } from '../../lib/env.js';
import type { BYOKConfig } from '@bloom/shared/types';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

// Default provider
const defaultProvider = createOpenAICompatible({
  name: env.AI_PROVIDER,
  apiKey: env.AI_API_KEY,
  baseURL: env.AI_BASE_URL,
  headers: {
    'HTTP-Referer': 'https://chat.bloombot.ai',
    'X-Title': 'Bloombot',
  },
});

/** Get provider + model from BYOK config or default */
export function getProvider(byokConfig?: BYOKConfig) {
  if (byokConfig?.enabled) {
    switch (byokConfig.provider) {
      case 'openai':
        return {
          provider: createOpenAI({ apiKey: byokConfig.apiKey }),
          model: byokConfig.model,
        };
      case 'anthropic':
        return {
          provider: createAnthropic({ apiKey: byokConfig.apiKey }),
          model: byokConfig.model,
        };
      case 'openrouter':
      case 'custom':
        return {
          provider: createOpenAICompatible({
            name: byokConfig.provider,
            apiKey: byokConfig.apiKey,
            baseURL: byokConfig.baseUrl ?? 'https://openrouter.ai/api/v1',
          }),
          model: byokConfig.model,
        };
    }
  }

  return { provider: defaultProvider, model: env.MODEL };
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
    byokConfig?: BYOKConfig;
  }
) {
  const { byokConfig, metadata, ...rest } = params;
  const { provider, model } = getProvider(byokConfig);

  return streamTextAi({
    ...rest,
    model: provider(model),
    experimental_telemetry: {
      isEnabled: true,
      metadata: {
        sessionId: metadata.sessionId,
        userId: metadata.userId,
        release: env.SENTRY_RELEASE,
        environment: env.SENTRY_ENVIRONMENT,
        tags: [metadata.type],
      },
    },
    providerOptions: byokConfig?.enabled
      ? {}
      : {
          openrouter: {
            order: ['DeepInfra', 'Hyperbolic', 'Fireworks', 'Together', 'Lambda'],
          },
        },
  });
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
    byokConfig?: BYOKConfig;
  }
) {
  const { byokConfig, metadata, ...rest } = params;
  const { provider, model } = getProvider(byokConfig);

  return generateTextAi({
    ...rest,
    model: provider(model),
    experimental_telemetry: {
      isEnabled: true,
      metadata: {
        sessionId: metadata.sessionId,
        userId: metadata.userId,
        release: env.SENTRY_RELEASE,
        environment: env.SENTRY_ENVIRONMENT,
        tags: [metadata.type],
      },
    },
    providerOptions: byokConfig?.enabled
      ? {}
      : {
          openrouter: {
            order: ['DeepInfra', 'Hyperbolic', 'Fireworks', 'Together', 'Lambda'],
          },
        },
  });
}
