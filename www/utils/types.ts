import { type Reaction } from '@/components/messagebox';

export interface Message {
  content: string;
  isUser: boolean;
  id: string;
  metadata?: { reaction?: Reaction };
}

export interface Conversation {
  // api: API;
  name: string;
  conversationId: string;
}
