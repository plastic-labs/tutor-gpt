// import { type Reaction } from '@/components/messagebox';

interface BaseMessage {
  id: string;
  content: string;
  metadata: Record<string, unknown>;
}

export interface ThinkingData {
  thoughtContent: string;
  thoughtFinished: boolean;
  honchoQuery?: string;
  honchoResponse?: string;
  pdfQuery?: string;
  pdfResponse?: string;
}

export interface UserMessage extends BaseMessage {
  isUser: true;
}

export interface AIMessage extends BaseMessage {
  isUser: false;
  thinking?: ThinkingData;
}

export type Message = UserMessage | AIMessage;

export interface Conversation {
  name: string;
  conversationId: string;
}

export interface JWTPayload {
  // Standard JWT Claims
  iss?: string; // issuer
  sub?: string; // subject (usually user id)
  aud?: string; // audience
  exp: number; // expiration time (timestamp)
  nbf?: number; // not before (timestamp)
  iat: number; // issued at (timestamp)
  jti?: string; // JWT ID

  action: string;
  conversationId: string;
}
