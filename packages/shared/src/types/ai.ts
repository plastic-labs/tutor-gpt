import type { HonchoMessage, MetaMessage } from './messages.js';

export interface ChatCallProps {
  message: string;
  conversationId: string;
  fileContent?: Promise<string[]>;
}

export interface ConversationHistory {
  messages: HonchoMessage[];
  thoughts: MetaMessage[];
  honchoMessages: MetaMessage[];
  pdfMessages: MetaMessage[];
  summaries: MetaMessage[];
  collectionId?: string;
}

/** New stream chunk format supporting tool calls and artifacts */
export type StreamChunk =
  | { type: 'response'; text: string }
  | { type: 'toolCall'; tool: string; args: Record<string, unknown> }
  | { type: 'toolResult'; tool: string; result: string }
  | {
      type: 'artifact';
      action: 'create' | 'update';
      artifact: ArtifactMeta;
    }
  | { type: 'error'; message: string }
  | { type: 'done' };

export interface ArtifactMeta {
  id: string;
  title: string;
  version: number;
  contentType: string;
}

/** Legacy stream format (kept for migration compatibility) */
export interface LegacyStreamResponseChunk {
  type: 'thought' | 'honcho' | 'response' | 'pdf' | 'honchoQuery' | 'pdfQuery';
  text: string;
}
