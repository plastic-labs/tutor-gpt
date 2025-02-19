// import { type Reaction } from '@/components/messagebox';

export interface Message {
  id: string;
  content: string;
  isUser: boolean;
  metadata: Record<string, unknown>;
}

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
