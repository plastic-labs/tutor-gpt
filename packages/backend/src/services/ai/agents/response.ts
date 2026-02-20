import { streamText as streamTextWithTools } from 'ai';
import type { StreamChunk, BYOKConfig } from '@bloom/shared/types';
import { MAX_TOOL_STEPS } from '@bloom/shared/constants';
import { getProvider, streamText, user } from '../provider.js';
import { responsePrompt } from '../prompts.js';
import { honchoDialecticTool } from '../tools/honcho.js';
import { exaResearchTool } from '../tools/exa.js';
import { documentGrepTool, documentReadTool } from '../tools/documents.js';
import { artifactCreateTool, artifactUpdateTool } from '../tools/artifacts.js';
import { getHonchoPeer, getHonchoSession } from '../../honcho/client.js';

interface RespondProps {
  message: string;
  conversationId: string;
  userId: string;
  byokConfig?: BYOKConfig;
}

export async function* respond({
  message,
  conversationId,
  userId,
  byokConfig,
}: RespondProps): AsyncGenerator<StreamChunk> {
  const peer = await getHonchoPeer(userId);
  const session = await getHonchoSession(conversationId);

  // 1. Fetch conversation history from Honcho
  const rawMessages: { role: 'user' | 'assistant'; content: string }[] = [];
  const messagesPage = await session.messages();
  for (const msg of messagesPage.items) {
    rawMessages.push({
      role: msg.peerId === peer.id ? 'user' : 'assistant',
      content: msg.content,
    });
  }

  // Build messages for the model
  const messages = [
    ...responsePrompt,
    ...rawMessages,
    user`${message}`,
  ];

  // 2. Assemble tools
  const tools = {
    queryStudentContext: honchoDialecticTool(userId, conversationId),
    searchDocuments: documentGrepTool(userId),
    readDocument: documentReadTool(userId),
    createArtifact: artifactCreateTool(userId),
    updateArtifact: artifactUpdateTool(userId),
  };

  // 3. Stream with tools
  const { provider, model } = getProvider(byokConfig);
  const result = streamTextWithTools({
    model: provider(model),
    messages,
    tools,
    maxSteps: MAX_TOOL_STEPS,
    toolCallStreaming: true,
    providerOptions: byokConfig?.enabled
      ? {}
      : {
          openrouter: {
            order: ['DeepInfra', 'Hyperbolic', 'Fireworks', 'Together', 'Lambda'],
          },
        },
  });

  // 4. Stream chunks to client
  let responseText = '';
  for await (const part of result.fullStream) {
    switch (part.type) {
      case 'tool-call':
        yield {
          type: 'toolCall',
          tool: part.toolName,
          args: part.args as Record<string, unknown>,
        };
        break;
      case 'tool-result': {
        const resultStr =
          typeof part.result === 'string'
            ? part.result
            : JSON.stringify(part.result);

        yield { type: 'toolResult', tool: part.toolName, result: resultStr };

        // If artifact tool, emit artifact chunk
        if (
          part.toolName === 'createArtifact' ||
          part.toolName === 'updateArtifact'
        ) {
          const artifactResult = part.result as {
            id: string;
            title?: string;
            version: number;
          };
          yield {
            type: 'artifact',
            action: part.toolName === 'createArtifact' ? 'create' : 'update',
            artifact: {
              id: artifactResult.id,
              title: artifactResult.title ?? 'Untitled',
              version: artifactResult.version,
              contentType: 'text/markdown',
            },
          };
        }
        break;
      }
      case 'text-delta':
        responseText += part.textDelta;
        yield { type: 'response', text: part.textDelta };
        break;
      case 'error':
        yield {
          type: 'error',
          message:
            part.error instanceof Error
              ? part.error.message
              : 'An error occurred',
        };
        break;
    }
  }

  // 5. Save to Honcho
  try {
    // Create an "assistant" peer for the AI messages
    const assistantPeer = await getHonchoPeer('assistant');
    await session.addMessages([
      peer.message(message),
      assistantPeer.message(responseText),
    ]);
  } catch (error) {
    console.error('Failed to save messages to Honcho:', error);
  }

  yield { type: 'done' };
}
