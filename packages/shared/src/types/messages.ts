export interface ThinkingData {
  thoughtContent: string;
  thoughtFinished: boolean;
  honchoQuery?: string;
  honchoResponse?: string;
  pdfQuery?: string;
  pdfResponse?: string;
}

interface BaseMessage {
  id: string;
  content: string;
  metadata: Record<string, unknown>;
}

export interface UserMessage extends BaseMessage {
  isUser: true;
}

export interface AIMessage extends BaseMessage {
  isUser: false;
  thinking?: ThinkingData;
}

export type Message = UserMessage | AIMessage;

/** Raw message format from Honcho */
export interface HonchoMessage {
  id: string;
  is_user: boolean;
  content: string;
}

export interface MetaMessage {
  message_id: string | null;
  content: string;
}
